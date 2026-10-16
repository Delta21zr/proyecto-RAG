from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

security_bearer = HTTPBearer(auto_error=False)


def get_password_hash(password: str) -> str:
    # bcrypt solo procesa 72 bytes; se trunca explícitamente en lugar de fallar.
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)).decode()


# Hash de relleno: se verifica aunque el usuario no exista para igualar tiempos de respuesta
# y no permitir enumeración de cuentas por latencia (RF-001).
_DUMMY_HASH = get_password_hash("dummy-password-for-timing")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode()[:72], (hashed_password or _DUMMY_HASH).encode()) \
            and hashed_password is not None
    except ValueError:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {**data, "iat": now, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales no válidas o sesión expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise exc
    try:
        user = db.query(User).filter(User.user_id == payload["sub"]).first()
    except Exception:  # sub con formato UUID inválido
        db.rollback()
        raise exc
    if user is None or not user.is_active:
        raise exc
    return user


def require_roles(*roles: str):
    """Dependencia de autorización por rol (RBAC)."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="No cuenta con permisos para esta operación.")
        return user
    return checker
