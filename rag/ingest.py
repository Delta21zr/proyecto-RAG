"""Indexa un archivo:  python ingest.py <archivo> [--project-id UUID]  (sin project-id = normativa institucional)"""
import argparse
import uuid
from ingestion import extract_pages
from rag_pipeline import LocalRAGPipeline

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--project-id", default=None)
    ap.add_argument("--document-id", default=str(uuid.uuid4()))
    a = ap.parse_args()
    rag = LocalRAGPipeline()
    pages = extract_pages(a.file)
    chunks = rag.chunk_pages(pages, a.document_id, a.file.replace("\\", "/").split("/")[-1], a.project_id)
    print(f"{len(pages)} páginas -> {len(chunks)} fragmentos (máx {max(c.token_count for c in chunks)} tokens)")
    print(f"Indexados: {rag.index_chunks(chunks)}  document_id={a.document_id}")
