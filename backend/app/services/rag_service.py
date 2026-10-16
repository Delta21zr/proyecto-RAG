"""Puente entre el backend y el pipeline RAG local (carpeta /rag).

El pipeline (modelo de embeddings + cliente Qdrant) se carga una sola vez, de forma perezosa,
para no penalizar el arranque de la API."""
import logging
import sys
import threading
from pathlib import Path
from uuid import UUID

from app.config import settings
from app.database import SessionLocal
from app.models.document import Document, DocumentFragment
from app.utils import audit

log = logging.getLogger("rag_service")
_pipeline = None
_lock = threading.Lock()


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        with _lock:
            if _pipeline is None:
                if settings.RAG_DIR not in sys.path:
                    sys.path.insert(0, settings.RAG_DIR)
                from rag_pipeline import LocalRAGPipeline  # noqa: E402
                _pipeline = LocalRAGPipeline()
    return _pipeline


def _extract_pages(path: str):
    if settings.RAG_DIR not in sys.path:
        sys.path.insert(0, settings.RAG_DIR)
    from ingestion import extract_pages
    return extract_pages(path)


def ingest_document(document_id: UUID) -> None:
    """Tarea en segundo plano: PENDING -> PROCESSING -> PUBLISHED | ERROR (RF-008)."""
    db = SessionLocal()
    rag = None
    indexed = False
    try:
        doc = db.get(Document, document_id)
        if doc is None:
            return
        doc.status = "PROCESSING"
        db.commit()

        rag = get_pipeline()
        pages = _extract_pages(doc.file_path)
        chunks = rag.chunk_pages(pages, str(doc.document_id), doc.file_name,
                                 str(doc.project_id) if doc.project_id else None)
        if not chunks:
            raise ValueError("El documento no contiene texto extraíble (¿PDF escaneado?).")

        rag.index_chunks(chunks)
        indexed = True
        db.add_all(DocumentFragment(fragment_id=c.fragment_id, document_id=doc.document_id,
                                    content=c.content, page_number=c.page_number,
                                    paragraph_num=c.paragraph_num, vector_id=c.fragment_id)
                   for c in chunks)

        # Versionado (RF-007): las versiones anteriores dejan de ser consultables por el RAG.
        previous = (db.query(Document)
                    .filter(Document.file_name == doc.file_name, Document.project_id == doc.project_id,
                            Document.version < doc.version, Document.status == "PUBLISHED").all())
        for old in previous:
            rag.delete_document(str(old.document_id))
            db.query(DocumentFragment).filter(DocumentFragment.document_id == old.document_id).delete()

        doc.status = "PUBLISHED"
        audit.record(db, doc.uploaded_by, "INGEST_OK", f"documents/{doc.document_id}",
                     {"fragments": len(chunks), "version": doc.version})
        db.commit()
    except Exception as exc:  # noqa: BLE001 - cualquier fallo debe dejar el documento en ERROR
        log.exception("Fallo de ingestión %s", document_id)
        db.rollback()
        if indexed and rag is not None:
            try:
                rag.delete_document(str(document_id))  # evita vectores huérfanos
            except Exception:  # noqa: BLE001
                log.exception("No se pudo limpiar Qdrant para %s", document_id)
        doc = db.get(Document, document_id)
        if doc:
            doc.status = "ERROR"
            audit.record(db, doc.uploaded_by, "INGEST_ERROR", f"documents/{document_id}",
                         {"error": str(exc)[:300]})
            db.commit()
    finally:
        db.close()


def remove_document_vectors(document_id: UUID) -> None:
    get_pipeline().delete_document(str(document_id))


def storage_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p
