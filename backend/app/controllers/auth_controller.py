from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.utils import audit
from app.utils.security import create_access_token, verify_password


def authenticate_user(db: Session, data: LoginRequest, ip: str | None = None) -> LoginResponse:
    # RF-001: mismo mensaje y mismo coste de cómputo para correo inexistente, clave errónea o cuenta inactiva.
    user = db.query(User).filter(User.email == data.email.lower()).first()
    password_ok = verify_password(data.password, user.password_hash if user else None)

    if not user or not password_ok or not user.is_active:
        audit.record(db, user.user_id if user else None, "LOGIN_FAILED", "auth/login",
                     {"email": data.email.lower(), "ip": ip})
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Credenciales incorrectas o cuenta inactiva.",
                            headers={"WWW-Authenticate": "Bearer"})

    audit.record(db, user.user_id, "LOGIN", "auth/login", {"role": user.role, "ip": ip})
    db.commit()

    token = create_access_token({"sub": str(user.user_id), "role": user.role})
    return LoginResponse(token=token, token_type="bearer", user=UserResponse.model_validate(user))
