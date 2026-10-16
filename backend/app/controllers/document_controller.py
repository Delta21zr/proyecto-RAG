import os
import uuid
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.controllers.project_controller import EDITABLE_STATES
from app.models.document import Document
from app.models.project import Project
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services import rag_service
from app.utils import audit
from app.utils.access import can_view_project, is_owner, visible_projects_clause

# extensión -> (tipo en BD, firma binaria esperada). Se valida el contenido, no solo el nombre.
ALLOWED = {".pdf": ("PDF", b"%PDF-"), ".docx": ("DOCX", b"PK\x03\x04")}
CHUNK = 1024 * 1024


def _safe_name(name: str) -> str:
    return Path((name or "documento").replace("\\", "/")).name[:255] or "documento"


async def _save_upload(file: UploadFile, dest: Path, magic: bytes) -> int:
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    size, first = 0, True
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(CHUNK):
                if first:
                    if not chunk.startswith(magic):
                        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                                            "El contenido del archivo no coincide con su extensión.")
                    first = False
                size += len(chunk)
                if size > limit:
                    raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                        f"El archivo supera el límite de {settings.MAX_UPLOAD_MB} MB.")
                out.write(chunk)
        if size == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo está vacío.")
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return size


async def upload_document(db: Session, file: UploadFile, project_id: Optional[UUID], user: User,
                          background: BackgroundTasks) -> DocumentResponse:
    # Autorización antes de tocar el disco.
    project = None
    if project_id is None:
        if user.role not in ("COORDINATOR", "ADMIN"):
            raise HTTPException(status.HTTP_403_FORBIDDEN,
                                "Solo coordinadores/administradores cargan normativa institucional.")
    else:
        project = db.get(Project, project_id)
        if not project or not can_view_project(user, project):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado.")
        if not is_owner(user, project):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el responsable puede cargar documentos.")
        if project.status not in EDITABLE_STATES:
            raise HTTPException(status.HTTP_409_CONFLICT,
                                f"No se pueden cargar documentos en un proyecto {project.status}.")

    name = _safe_name(file.filename)
    ext = os.path.splitext(name)[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Solo se admiten archivos PDF o DOCX.")
    file_type, magic = ALLOWED[ext]

    doc_id = uuid.uuid4()
    dest = rag_service.storage_dir() / f"{doc_id}{ext}"   # nombre en disco generado: evita path traversal
    await _save_upload(file, dest, magic)

    last = (db.query(func.max(Document.version))
            .filter(Document.file_name == name, Document.project_id == project_id).scalar()) or 0
    doc = Document(document_id=doc_id, project_id=project_id, file_name=name, file_path=str(dest),
                   version=last + 1, file_type=file_type, status="PENDING", uploaded_by=user.user_id)
    db.add(doc)
    audit.record(db, user.user_id, "UPLOAD", f"documents/{doc_id}",
                 {"file": name, "version": doc.version, "project_id": str(project_id) if project_id else None})
    db.commit()
    db.refresh(doc)
    background.add_task(rag_service.ingest_document, doc_id)
    return DocumentResponse.model_validate(doc)


def _get_visible_document(db: Session, document_id: UUID, user: User) -> Document:
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado.")
    if doc.project_id is not None:
        project = db.get(Project, doc.project_id)
        if not project or not can_view_project(user, project):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado.")
    return doc


def get_document(db: Session, document_id: UUID, user: User) -> DocumentResponse:
    return DocumentResponse.model_validate(_get_visible_document(db, document_id, user))


def list_documents(db: Session, user: User, project_id: Optional[UUID], skip: int, limit: int) -> DocumentListResponse:
    q = db.query(Document)
    if project_id is not None:
        project = db.get(Project, project_id)
        if not project or not can_view_project(user, project):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado.")
        q = q.filter(Document.project_id == project_id)
    else:
        visible = db.query(Project.project_id).filter(visible_projects_clause(user))
        q = q.filter(or_(Document.project_id.is_(None), Document.project_id.in_(visible)))
    total = q.count()
    rows = q.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return DocumentListResponse(documents=[DocumentResponse.model_validate(d) for d in rows], total=total)


def delete_document(db: Session, document_id: UUID, user: User) -> None:
    doc = _get_visible_document(db, document_id, user)
    if doc.project_id is None:
        allowed = user.role in ("COORDINATOR", "ADMIN")
    else:
        project = db.get(Project, doc.project_id)
        allowed = user.role == "COORDINATOR" or (is_owner(user, project) and project.status in EDITABLE_STATES)
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No cuenta con permisos para eliminar este documento.")

    try:
        rag_service.remove_document_vectors(doc.document_id)
    except Exception as exc:  # noqa: BLE001 - no borrar en BD si Qdrant sigue con los vectores
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            f"No se pudo eliminar el índice vectorial: {exc}")
    Path(doc.file_path).unlink(missing_ok=True)
    audit.record(db, user.user_id, "DELETE_DOCUMENT", f"documents/{doc.document_id}", {"file": doc.file_name})
    db.delete(doc)
    db.commit()
