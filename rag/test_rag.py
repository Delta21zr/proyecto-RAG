"""Verificación Fase 2. Ejecutar: python -m pytest test_rag.py -v -s   (desde rag/, con Qdrant y Ollama activos)"""
import uuid
import pytest
import config as cfg
from rag_pipeline import LocalRAGPipeline


@pytest.fixture(scope="module")
def rag():
    return LocalRAGPipeline()


TEXT = ("El reglamento de bioética exige que todo proyecto con muestras genéticas sea aprobado "
        "por el comité de ética antes del 15 de marzo de 2026. Las violaciones resultarán en la "
        "suspensión inmediata del financiamiento del proyecto.")


def test_chunks_never_exceed_512_tokens(rag):
    long_text = "\n\n".join(TEXT + f" Sección {i}. " + "Investigación científica. " * 80 for i in range(15))
    chunks = rag.chunk_pages([long_text], "d", "x.pdf")
    assert len(chunks) > 1
    assert max(c.token_count for c in chunks) <= cfg.MAX_CHUNK_TOKENS


def test_index_answer_and_abstain_and_rbac(rag):
    doc, proj = str(uuid.uuid4()), str(uuid.uuid4())
    rag.index_chunks(rag.chunk_pages([TEXT], doc, "Reglamento_Bioetica.pdf", project_id=proj))
    try:
        r = rag.query("¿Cuál es la fecha límite para la aprobación del comité de ética?", [proj])
        print(r)
        assert not r["abstained"] and r["citations"][0]["document_id"] == doc

        # RBAC: otro proyecto no debe ver el documento
        other = rag.query("¿Cuál es la fecha límite para la aprobación del comité de ética?", [str(uuid.uuid4())])
        assert all(c["document_id"] != doc for c in other["citations"])

        # Abstención: pregunta fuera del corpus
        off = rag.query("¿Cuál es la receta de la paella valenciana?", [proj])
        print(off)
        assert off["abstained"] and off["answer"] == cfg.ABSTENTION_MESSAGE
    finally:
        rag.delete_document(doc)
