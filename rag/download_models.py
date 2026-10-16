"""Descarga ÚNICA (requiere internet) del modelo de embeddings a rag/models/.
Después, todo el sistema corre en modo offline."""
from huggingface_hub import snapshot_download
from config import EMBEDDING_MODEL, MODELS_DIR

if __name__ == "__main__":
    target = MODELS_DIR / EMBEDDING_MODEL.replace("/", "__")
    path = snapshot_download(
        repo_id=EMBEDDING_MODEL,
        local_dir=target,
        allow_patterns=["*.json", "*.txt", "*.model", "*.safetensors", "1_Pooling/*", "*.md"],
    )
    print(f"Modelo guardado en: {path}")
