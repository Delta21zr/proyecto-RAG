from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SECRET = "CAMBIAR_EN_PRODUCCION_usar_openssl_rand_hex_32"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5434/university_rag"
    SECRET_KEY: str = DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas (SDD 11.1)
    BCRYPT_ROUNDS: int = 12                 # coste >= 10 (SDD 11.1)
    UPLOAD_DIR: str = str(BACKEND_DIR / "storage")
    MAX_UPLOAD_MB: int = 25
    RAG_DIR: str = str(BACKEND_DIR.parent / "rag")
    ENVIRONMENT: str = "development"

    @field_validator("BCRYPT_ROUNDS")
    @classmethod
    def _min_rounds(cls, v: int) -> int:
        if v < 10:
            raise ValueError("BCRYPT_ROUNDS debe ser >= 10")
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

if settings.ENVIRONMENT != "development" and settings.SECRET_KEY == DEFAULT_SECRET:
    raise RuntimeError("SECRET_KEY por defecto no permitido fuera de desarrollo.")
