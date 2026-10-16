"""Configuración del motor RAG local. Todo apunta a localhost (RNF-001)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3:8b-instruct-q4_0")

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "university_research_documents")

# NOTA: "BAAI/bge-small-es" NO existe en Hugging Face (HTTP 401/404).
# Se usa un modelo multilingüe real de 384 dimensiones, 512 tokens máx., apto para español.
# Para cambiarlo: EMBEDDING_MODEL=<repo> (ajustar EMBEDDING_DIM, prefijos y volver a indexar).
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))
# e5 requiere prefijos; para modelos que no los usan, dejar vacío.
QUERY_PREFIX = os.getenv("QUERY_PREFIX", "query: ")
PASSAGE_PREFIX = os.getenv("PASSAGE_PREFIX", "passage: ")
MODELS_DIR = Path(os.getenv("MODELS_DIR", BASE_DIR / "models"))  # caché offline local

MAX_CHUNK_TOKENS = 512      # límite estricto por fragmento (incluye prefijo y tokens especiales)
CHUNK_OVERLAP_TOKENS = 50
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.70"))  # AIR-003 / RF-013
TOP_K = 4

ABSTENTION_MESSAGE = (
    "No existe evidencia suficiente en los documentos cargados para responder a la consulta."
)
