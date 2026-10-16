"""Pruebas de la Fase 3 contra el PostgreSQL real (docker compose up -d).
El pipeline RAG se simula: aquí se prueba la API, el RBAC, la ingestión y la auditoría.

Ejecutar desde backend/:   python -m pytest tests -v
"""
import io
import uuid
from types import SimpleNamespace

import pytest
from docx import Document as DocxDocument
from fastapi.testclient import TestClient
from jose import jwt

from app.config import settings
from app.database import SessionLocal
from app.models.audit import AuditEvent
from app.models.document import Citation, Document, DocumentFragment, Query
from app.models.project import Project
from app.models.user import User
from app.services import rag_service
from app.utils.security import get_password_hash
from main import app

SUFFIX = uuid.uuid4().hex[:8]
PASSWORD = "Test1234!"


class FakePipeline:
    def __init__(self):
        self.indexed, self.deleted, self.last_allowed = {}, [], None

    def chunk_pages(self, pages, document_id, file_name, project_id=None):
        return [SimpleNamespace(fragment_id=str(uuid.uuid4()), content=t, page_number=i + 1, paragraph_num=1)
                for i, t in enumerate(pages) if t.strip()]

    def index_chunks(self, chunks):
        for c in chunks:
            self.indexed[c.fragment_id] = c
        return len(chunks)

    def delete_document(self, document_id):
        self.deleted.append(document_id)

    def query(self, prompt, allowed_project_ids=None, top_k=4):
        self.last_allowed = allowed_project_ids
        fid = next(iter(self.indexed), None)
        if prompt.startswith("fuera") or fid is None:
            return {"answer": "No existe evidencia suficiente en los documentos cargados para responder a la consulta.",
                    "abstained": True, "max_score": 0.3, "citations": []}
        doc = SessionLocal().get(DocumentFragment, fid).document_id
        return {"answer": "Respuesta [1]", "abstained": False, "max_score": 0.9,
                "citations": [{"ref": 1, "fragment_id": fid, "document_id": str(doc), "file_name": "a.docx",
                               "page_number": 1, "paragraph_num": 1, "score": 0.9}]}


@pytest.fixture(scope="session")
def fake(tmp_path_factory):
    f = FakePipeline()
    settings.UPLOAD_DIR = str(tmp_path_factory.mktemp("storage"))
    mp = pytest.MonkeyPatch()
    mp.setattr(rag_service, "get_pipeline", lambda: f)
    mp.setattr(rag_service, "_extract_pages", lambda path: ["Texto de prueba del documento."])
    yield f
    mp.undo()


@pytest.fixture(scope="session")
def client(fake):
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session", autouse=True)
def users():
    db = SessionLocal()
    made = {}
    for key, role in (("res_a", "RESEARCHER"), ("res_b", "RESEARCHER"), ("coord", "COORDINATOR"), ("admin", "ADMIN")):
        u = User(email=f"{key}.{SUFFIX}@test.edu", password_hash=get_password_hash(PASSWORD),
                 full_name=key, role=role)
        db.add(u)
        db.flush()
        made[key] = u.user_id
    inactive = User(email=f"off.{SUFFIX}@test.edu", password_hash=get_password_hash(PASSWORD),
                    full_name="off", role="RESEARCHER", is_active=False)
    db.add(inactive)
    db.commit()
    made["off"] = inactive.user_id
    ids = list(made.values())
    yield {k: f"{k}.{SUFFIX}@test.edu" for k in made}
    # Limpieza en orden de dependencias
    db.rollback()
    frag_docs = db.query(Document.document_id).filter(Document.uploaded_by.in_(ids))
    qs = db.query(Query.query_id).filter(Query.user_id.in_(ids))
    db.query(Citation).filter(Citation.query_id.in_(qs)).delete(synchronize_session=False)
    db.query(Query).filter(Query.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(DocumentFragment).filter(DocumentFragment.document_id.in_(frag_docs)).delete(synchronize_session=False)
    db.query(Document).filter(Document.uploaded_by.in_(ids)).delete(synchronize_session=False)
    db.query(Project).filter(Project.responsible_id.in_(ids)).delete(synchronize_session=False)
    db.query(AuditEvent).filter(AuditEvent.actor_id.in_(ids)).delete(synchronize_session=False)
    db.query(AuditEvent).filter(AuditEvent.details["email"].astext.like(f"%{SUFFIX}@test.edu")).delete(synchronize_session=False)
    db.query(User).filter(User.user_id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()


def login(client, email, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def headers(client, users, key):
    return {"Authorization": f"Bearer {login(client, users[key]).json()['token']}"}


def docx_bytes():
    buf = io.BytesIO()
    d = DocxDocument()
    d.add_paragraph("Contenido de prueba")
    d.save(buf)
    return buf.getvalue()


# ---------------- Autenticación ----------------
def test_login_ok_and_token_lasts_8h(client, users):
    r = login(client, users["res_a"])
    assert r.status_code == 200
    payload = jwt.decode(r.json()["token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["exp"] - payload["iat"] == 8 * 3600


def test_login_failures_are_indistinguishable(client, users):
    wrong_pw = login(client, users["res_a"], "mala")
    no_user = login(client, "noexiste@test.edu")
    inactive = login(client, users["off"])
    assert {wrong_pw.status_code, no_user.status_code, inactive.status_code} == {401}
    assert wrong_pw.json() == no_user.json() == inactive.json()


def test_bcrypt_cost_at_least_10():
    h = get_password_hash("x")
    assert int(h.split("$")[2]) >= 10


def test_protected_endpoint_requires_valid_token(client):
    assert client.get("/api/projects").status_code == 401
    assert client.get("/api/projects", headers={"Authorization": "Bearer basura"}).status_code == 401


# ---------------- Proyectos y flujo de estados ----------------
def make_project(client, h, title):
    r = client.post("/api/projects", json={"title": f"{title} {SUFFIX}", "area": "Ingeniería"}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def test_project_workflow_and_separation_of_duties(client, users):
    a, b, c = (headers(client, users, k) for k in ("res_a", "res_b", "coord"))
    p = make_project(client, a, "Flujo")
    pid = p["project_id"]
    assert p["status"] == "DRAFT"
    assert client.post("/api/projects", json={"title": p["title"], "area": "Otra"}, headers=a).status_code == 409

    put = lambda h, s, comment=None: client.put(f"/api/projects/{pid}/status", headers=h,
                                                json={"status": s, "comment": comment})
    assert put(a, "APPROVED").status_code == 409          # salto de estado inválido
    assert put(b, "IN_REVIEW").status_code == 404         # otro investigador no ve el borrador
    assert put(a, "IN_REVIEW").status_code == 200
    assert put(a, "APPROVED").status_code == 403          # el responsable no se autoaprueba
    assert put(c, "REJECTED").status_code == 422          # rechazo exige comentario
    assert put(c, "REJECTED", "Falta metodología").status_code == 200
    assert put(a, "DRAFT").status_code == 200
    assert put(a, "IN_REVIEW").status_code == 200
    assert put(c, "APPROVED").status_code == 200


def test_visibility_rules(client, users):
    a, b, c = (headers(client, users, k) for k in ("res_a", "res_b", "coord"))
    p = make_project(client, a, "Visibilidad")
    pid = p["project_id"]
    client.put(f"/api/projects/{pid}", json={"visibility": "PUBLIC_INSTITUTIONAL"}, headers=a)

    assert client.get(f"/api/projects/{pid}", headers=b).status_code == 404   # público pero aún DRAFT
    assert client.get(f"/api/projects/{pid}", headers=c).status_code == 200   # coordinador ve todo
    ids_b = [x["project_id"] for x in client.get("/api/projects?limit=100", headers=b).json()["projects"]]
    assert pid not in ids_b

    client.put(f"/api/projects/{pid}/status", json={"status": "IN_REVIEW"}, headers=a)
    client.put(f"/api/projects/{pid}/status", json={"status": "APPROVED"}, headers=c)
    assert client.get(f"/api/projects/{pid}", headers=b).status_code == 200   # aprobado + público
    assert client.put(f"/api/projects/{pid}", json={"area": "otra"}, headers=a).status_code == 409  # ya no editable


def test_admin_cannot_read_restricted_projects(client, users):
    a, adm = headers(client, users, "res_a"), headers(client, users, "admin")
    pid = make_project(client, a, "Restringido")["project_id"]
    assert client.get(f"/api/projects/{pid}", headers=adm).status_code == 404


# ---------------- Documentos e ingestión ----------------
def upload(client, h, name, content, project_id=None):
    data = {"project_id": project_id} if project_id else {}
    return client.post("/api/documents", headers=h, data=data, files={"file": (name, content)})


def test_upload_validation(client, users):
    a = headers(client, users, "res_a")
    pid = make_project(client, a, "Subidas")["project_id"]
    assert upload(client, a, "x.txt", b"hola", pid).status_code == 415
    assert upload(client, a, "falso.pdf", b"no soy un pdf", pid).status_code == 415   # firma inválida
    assert upload(client, a, "vacio.docx", b"", pid).status_code == 400
    assert upload(client, a, "../../evil.docx", docx_bytes(), pid).status_code == 202   # nombre saneado
    assert upload(client, a, "normativa.docx", docx_bytes()).status_code == 403          # normativa: solo coordinación


def test_ingestion_versioning_and_delete(client, users, fake):
    a, b, c = (headers(client, users, k) for k in ("res_a", "res_b", "coord"))
    pid = make_project(client, a, "Ingestión")["project_id"]

    r = upload(client, a, "informe.docx", docx_bytes(), pid)
    assert r.status_code == 202
    d1 = r.json()
    # El BackgroundTask ya corrió dentro del TestClient
    assert client.get(f"/api/documents/{d1['document_id']}", headers=a).json()["status"] == "PUBLISHED"
    assert d1["version"] == 1 and "/" not in d1["file_name"]

    d2 = upload(client, a, "informe.docx", docx_bytes(), pid).json()
    assert d2["version"] == 2
    assert d1["document_id"] in fake.deleted                  # v1 des-indexada al publicarse v2

    assert client.get(f"/api/documents/{d2['document_id']}", headers=b).status_code == 404  # sin acceso
    assert upload(client, b, "otro.docx", docx_bytes(), pid).status_code == 404

    assert client.delete(f"/api/documents/{d2['document_id']}", headers=b).status_code == 404
    assert client.delete(f"/api/documents/{d2['document_id']}", headers=a).status_code == 204
    assert d2["document_id"] in fake.deleted
    assert client.get(f"/api/documents/{d2['document_id']}", headers=a).status_code == 404

    # Proyecto aprobado: no se puede cargar más
    client.put(f"/api/projects/{pid}/status", json={"status": "IN_REVIEW"}, headers=a)
    client.put(f"/api/projects/{pid}/status", json={"status": "APPROVED"}, headers=c)
    assert upload(client, a, "tarde.docx", docx_bytes(), pid).status_code == 409


def test_ingestion_error_marks_document(client, users, fake, monkeypatch):
    a = headers(client, users, "res_a")
    pid = make_project(client, a, "Error ingestión")["project_id"]
    monkeypatch.setattr(rag_service, "_extract_pages", lambda p: (_ for _ in ()).throw(ValueError("roto")))
    d = upload(client, a, "malo.docx", docx_bytes(), pid).json()
    assert client.get(f"/api/documents/{d['document_id']}", headers=a).json()["status"] == "ERROR"


def test_normative_document_by_coordinator_visible_to_all(client, users):
    c, b = headers(client, users, "coord"), headers(client, users, "res_b")
    d = upload(client, c, "reglamento.docx", docx_bytes()).json()
    assert d["project_id"] is None and d["status"] == "PENDING" or d["status"] in ("PUBLISHED",)
    assert client.get(f"/api/documents/{d['document_id']}", headers=b).status_code == 200


# ---------------- RAG ----------------
def test_rag_prefilters_by_authorization_and_persists(client, users, fake):
    a, b = headers(client, users, "res_a"), headers(client, users, "res_b")
    pid = make_project(client, a, "RAG")["project_id"]
    upload(client, a, "rag.docx", docx_bytes(), pid)

    r = client.post("/api/rag/query", json={"prompt": "¿qué dice el informe?"}, headers=a)
    assert r.status_code == 200 and not r.json()["abstained"] and r.json()["citations"]
    assert pid in fake.last_allowed

    client.post("/api/rag/query", json={"prompt": "¿qué dice el informe?"}, headers=b)
    assert pid not in fake.last_allowed                       # AIR-001: B no puede recuperar de A

    off = client.post("/api/rag/query", json={"prompt": "fuera de corpus"}, headers=a).json()
    assert off["abstained"] and off["citations"] == []

    hist_a = client.get("/api/rag/history", headers=a).json()
    hist_b = client.get("/api/rag/history", headers=b).json()
    assert len(hist_a) == 2 and len(hist_b) == 1              # RF-014: historial propio


# ---------------- Auditoría ----------------
def test_audit_log_access_and_content(client, users):
    a, adm = headers(client, users, "res_a"), headers(client, users, "admin")
    assert client.get("/api/audit/logs", headers=a).status_code == 403
    assert client.get("/api/audit/logs").status_code == 401

    actor = next(u for u in [login(client, users["res_a"]).json()["user"]])["user_id"]
    events = client.get(f"/api/audit/logs?actor_id={actor}&limit=200", headers=adm).json()["events"]
    actions = {e["action"] for e in events}
    assert {"LOGIN", "CREATE_PROJECT", "STATUS_CHANGE", "UPLOAD", "HTTP_REQUEST", "ACCESS_DENIED"} <= actions

    login_failed = client.get("/api/audit/logs?action=LOGIN_FAILED&limit=200", headers=adm).json()["events"]
    assert any(SUFFIX in (e["details"] or {}).get("email", "") for e in login_failed)

    blob = str([e["details"] for e in events])
    assert PASSWORD not in blob and "Bearer" not in blob       # nunca se registran secretos
