"""PROJ-104: prueba de carga de /api/rag/query. Criterio de aceptacion: p95 <= 20 s.

Uso (con la API, PostgreSQL, Qdrant y Ollama activos):
  rag\\.venv\\Scripts\\python.exe scripts\\load_test_rag.py --users 3 --requests 12
Sube un documento normativo temporal por API, espera su indexacion, mide la carga y lo elimina al final.
Salida: resumen en consola y scripts/load_test_report.json. Codigo de salida 1 si p95 > umbral.
"""
import argparse
import io
import json
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from docx import Document as DocxDocument

QUESTIONS = [
    "¿Cual es la fecha limite para que el comite de etica apruebe proyectos con muestras geneticas?",
    "¿Cuantos miembros integran el comite de etica?",
    "¿Cual es el financiamiento maximo por ciclo anual?",
    "¿Cuando debe entregarse el informe parcial?",
    "¿En cuantos dias se deben depositar los datos de investigacion en el repositorio?",
    "¿Que equipo de proteccion se debe usar en el laboratorio?",
    "¿Cual es la receta de la paella valenciana?",  # abstencion: debe ser rapida
]

CORPUS_PARAGRAPHS = [
    "El reglamento de bioetica exige que todo proyecto con muestras geneticas sea aprobado por el comite de etica antes del 15 de marzo de 2026. Las violaciones resultaran en la suspension inmediata del financiamiento del proyecto.",
    "El comite de etica esta integrado por cinco miembros: un presidente, dos investigadores senior, un representante legal y un representante estudiantil. Las sesiones ordinarias se realizan el primer lunes de cada mes.",
    "Los proyectos de investigacion pueden solicitar un financiamiento maximo de 250 000 pesos por ciclo anual. El monto se entrega en dos ministraciones: 60 % al inicio y 40 % tras aprobar el informe parcial.",
    "El informe parcial debe entregarse a la coordinacion a mas tardar el 30 de junio de cada ciclo. Los gastos de viaticos no pueden exceder el 15 % del presupuesto total del proyecto.",
    "Los datos de investigacion deben depositarse en el repositorio institucional en un plazo maximo de 90 dias despues de la publicacion. Las tesis de posgrado se depositan en formato PDF/A.",
    "Todo el personal del laboratorio debe usar bata, lentes de seguridad y guantes de nitrilo al manipular reactivos. Esta prohibido ingerir alimentos dentro del laboratorio.",
]


def login(base, email, password):
    r = requests.post(f"{base}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def upload_temp_corpus(base, coord_token):
    buf = io.BytesIO()
    doc = DocxDocument()
    for p in CORPUS_PARAGRAPHS:
        doc.add_paragraph(p)
    doc.save(buf)
    buf.seek(0)
    headers = {"Authorization": f"Bearer {coord_token}"}
    files = {"file": ("Normativa_LoadTest_Temp.docx", buf.getvalue(),
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    r = requests.post(f"{base}/api/documents", headers=headers, files=files, timeout=30)
    r.raise_for_status()
    doc_id = r.json()["document_id"]
    for _ in range(30):
        st = requests.get(f"{base}/api/documents/{doc_id}", headers=headers, timeout=15).json()["status"]
        if st == "PUBLISHED":
            return doc_id
        if st == "ERROR":
            raise RuntimeError("Fallo la indexacion del documento temporal de prueba.")
        time.sleep(1)
    raise TimeoutError("Tiempo agotado esperando indexacion del documento de prueba.")


def one_request(args):
    base, token, prompt = args
    t0 = time.perf_counter()
    try:
        r = requests.post(f"{base}/api/rag/query", json={"prompt": prompt},
                          headers={"Authorization": f"Bearer {token}"}, timeout=120)
        ok = r.status_code == 200
        body = r.json() if ok else {}
        abstained = ok and body.get("abstained", False)
        cited = ok and len(body.get("citations", [])) > 0
    except requests.RequestException:
        ok, abstained, cited = False, False, False
    return {"seconds": time.perf_counter() - t0, "ok": ok, "abstained": abstained, "cited": cited}


def percentile(values, p):
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round(p / 100 * len(s) + 0.5)) - 1))
    return s[k]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--email", default="inv@universidad.edu")
    ap.add_argument("--coord-email", default="coord@universidad.edu")
    ap.add_argument("--password", default="Admin123!")
    ap.add_argument("--users", type=int, default=3, help="usuarios concurrentes")
    ap.add_argument("--requests", type=int, default=12, help="total de consultas")
    ap.add_argument("--threshold", type=float, default=20.0, help="p95 maximo en segundos")
    a = ap.parse_args()

    token = login(a.base, a.email, a.password)
    coord_token = login(a.base, a.coord_email, a.password)
    doc_id = upload_temp_corpus(a.base, coord_token)
    try:
        one_request((a.base, token, QUESTIONS[0]))  # calentamiento (carga de modelos)

        jobs = [(a.base, token, QUESTIONS[i % len(QUESTIONS)]) for i in range(a.requests)]
        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=a.users) as pool:
            results = list(pool.map(one_request, jobs))
        wall = time.perf_counter() - t0
    finally:
        requests.delete(f"{a.base}/api/documents/{doc_id}",
                        headers={"Authorization": f"Bearer {coord_token}"}, timeout=30)

    times = [r["seconds"] for r in results if r["ok"]]
    errors = sum(1 for r in results if not r["ok"])
    if not times:
        print("Todas las peticiones fallaron.")
        sys.exit(1)
    report = {
        "users": a.users, "requests": a.requests, "errors": errors,
        "answered_with_citations": sum(1 for r in results if r["cited"]),
        "abstentions": sum(1 for r in results if r["abstained"]),
        "throughput_rps": round(len(results) / wall, 3),
        "mean_s": round(statistics.mean(times), 2), "p50_s": round(percentile(times, 50), 2),
        "p95_s": round(percentile(times, 95), 2), "max_s": round(max(times), 2),
        "threshold_s": a.threshold,
    }
    report["passed"] = report["p95_s"] <= a.threshold and errors == 0
    Path(__file__).with_name("load_test_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("RESULTADO:", "APROBADO" if report["passed"] else "NO CUMPLE p95 <= %ss" % a.threshold)
    sys.exit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
