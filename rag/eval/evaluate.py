"""Evaluacion de precision y abstencion del RAG (TASK-QA-02 / AIR-003).

Uso (desde rag/, con Qdrant activo):
    ..\\rag\\.venv\\Scripts\\python.exe eval\\evaluate.py              # solo recuperacion (rapido, sin LLM)
    ..\\rag\\.venv\\Scripts\\python.exe eval\\evaluate.py --with-llm   # ademas evalua respuestas con Ollama

Indexa el corpus sintetico en un proyecto temporal, mide los scores de similitud de las preguntas
respondibles vs. no respondibles, barre umbrales y sugiere uno. Al terminar borra lo indexado.
"""
import argparse
import json
import statistics
import sys
import unicodedata
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # permite importar config y rag_pipeline

from qdrant_client import models as qm  # noqa: E402

import config as cfg  # noqa: E402
from rag_pipeline import LocalRAGPipeline  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def norm(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def top_hit(rag: LocalRAGPipeline, question: str, project_id: str):
    qvec = rag.embeddings.embed_query(cfg.QUERY_PREFIX + question)
    flt = qm.Filter(must=[qm.FieldCondition(key="project_id", match=qm.MatchValue(value=project_id))])
    hits = rag.qdrant.query_points(cfg.COLLECTION_NAME, query=qvec, query_filter=flt,
                                   limit=cfg.TOP_K, with_payload=True).points
    return hits[0] if hits else None


def sweep(ans_scores, una_scores):
    """Para cada umbral: recall (respondibles recuperadas bien) y especificidad (abstencion correcta)."""
    rows = []
    for i in range(50, 100):
        t = i / 100
        recall = sum(1 for s, ok in ans_scores if ok and s >= t) / len(ans_scores)
        spec = sum(1 for s in una_scores if s < t) / len(una_scores)
        rows.append({"threshold": t, "answerable_recall": recall, "abstention_rate": spec,
                     "balanced": (recall + spec) / 2})
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-llm", action="store_true", help="evalua tambien la respuesta generada (lento)")
    args = ap.parse_args()

    data = json.loads((HERE / "dataset.json").read_text(encoding="utf-8"))
    rag = LocalRAGPipeline()
    project_id = str(uuid.uuid4())
    doc_ids = []

    try:
        for doc in data["corpus"]:
            doc_id = str(uuid.uuid4())
            doc_ids.append(doc_id)
            rag.index_chunks(rag.chunk_pages(doc["pages"], doc_id, doc["file_name"], project_id=project_id))

        # ---- Recuperacion ----
        ans_scores, una_scores, details = [], [], []
        for q in data["answerable"]:
            h = top_hit(rag, q["question"], project_id)
            score = h.score if h else 0.0
            right_file = bool(h) and h.payload["file_name"] == q["expected_file"]
            ans_scores.append((score, right_file))
            details.append({"id": q["id"], "kind": "answerable", "score": round(score, 4), "correct_source": right_file})
        for q in data["unanswerable"]:
            h = top_hit(rag, q["question"], project_id)
            score = h.score if h else 0.0
            una_scores.append(score)
            details.append({"id": q["id"], "kind": "unanswerable", "category": q["category"], "score": round(score, 4)})

        top1 = sum(1 for _, ok in ans_scores if ok) / len(ans_scores)
        print("=== RECUPERACION ===")
        print(f"Precision top-1 (fuente correcta) en respondibles: {top1:.0%} ({len(ans_scores)} preguntas)")
        a = [s for s, _ in ans_scores]
        print(f"Score respondibles   : min={min(a):.3f} media={statistics.mean(a):.3f} max={max(a):.3f}")
        print(f"Score NO respondibles: min={min(una_scores):.3f} media={statistics.mean(una_scores):.3f} max={max(una_scores):.3f}")
        print("\nDetalle NO respondibles:")
        for d in details:
            if d["kind"] == "unanswerable":
                print(f"  {d['id']} [{d['category']}] score={d['score']}")

        rows = sweep(ans_scores, una_scores)
        best = max(rows, key=lambda r: (r["balanced"], r["threshold"]))
        perfect = [r for r in rows if r["abstention_rate"] == 1.0]
        print("\n=== BARRIDO DE UMBRALES ===")
        print("umbral  recall_respondibles  abstencion_correcta")
        for r in rows:
            if int(r["threshold"] * 100) % 5 == 0 or r is best:
                mark = "  <-- mejor balance" if r is best else ""
                print(f" {r['threshold']:.2f}        {r['answerable_recall']:.0%}                 {r['abstention_rate']:.0%}{mark}")
        cur = next(r for r in rows if abs(r["threshold"] - round(cfg.SIMILARITY_THRESHOLD, 2)) < 1e-9)
        print(f"\nUmbral actual ({cfg.SIMILARITY_THRESHOLD}): recall={cur['answerable_recall']:.0%}, abstencion={cur['abstention_rate']:.0%}")
        print(f"Umbral sugerido (mejor balance): {best['threshold']:.2f} -> recall={best['answerable_recall']:.0%}, "
              f"abstencion={best['abstention_rate']:.0%}")
        if perfect:
            first = min(perfect, key=lambda r: r["threshold"])
            print(f"Menor umbral con 100% de abstencion correcta: {first['threshold']:.2f} (recall={first['answerable_recall']:.0%})")

        report = {"current_threshold": cfg.SIMILARITY_THRESHOLD, "top1_accuracy": top1,
                  "suggested_threshold": best["threshold"], "details": details, "sweep": rows}

        # ---- Respuestas completas con LLM ----
        if args.with_llm:
            print("\n=== RESPUESTAS CON LLM (umbral actual) ===")
            correct = abstain_ok = 0
            for q in data["answerable"]:
                r = rag.query(q["question"], [project_id])
                hit = (not r["abstained"]) and all(norm(k) in norm(r["answer"]) for k in q["expected_keywords"])
                correct += hit
                print(f"  {q['id']} {'OK ' if hit else 'FAIL'} abst={r['abstained']} :: {r['answer'][:90]!r}")
            for q in data["unanswerable"]:
                r = rag.query(q["question"], [project_id])
                abstain_ok += r["abstained"]
                print(f"  {q['id']} {'OK ' if r['abstained'] else 'FAIL'} abst={r['abstained']} :: {r['answer'][:90]!r}")
            acc = correct / len(data["answerable"])
            abst = abstain_ok / len(data["unanswerable"])
            print(f"\nExactitud de respuesta: {acc:.0%} | Abstencion correcta: {abst:.0%}")
            report.update({"llm_answer_accuracy": acc, "llm_abstention_rate": abst})

        (HERE / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nReporte guardado en {HERE / 'report.json'}")
        return 0
    finally:
        for d in doc_ids:
            rag.delete_document(d)


if __name__ == "__main__":
    sys.exit(main())
