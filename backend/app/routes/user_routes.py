from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserListResponse, UserResponse, UserUpdate
from app.utils import audit
from app.utils.security import get_password_hash, require_roles

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    total = q.count()
    rows = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return UserListResponse(users=[UserResponse.model_validate(u) for u in rows], total=total)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    actor: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    user = User(
        email=data.email.lower().strip(),
        full_name=data.full_name.strip(),
        password_hash=get_password_hash(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo electrónico.")
    audit.record(db, actor.user_id, "USER_CREATE", f"users/{user.user_id}",
                 {"email": user.email, "role": user.role})
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    data: UserUpdate,
    actor: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

    changes = data.model_dump(exclude_unset=True)
    if "password" in changes:
        pwd = changes.pop("password")
        if pwd:
            user.password_hash = get_password_hash(pwd)
    if "full_name" in changes and changes["full_name"] is not None:
        user.full_name = changes["full_name"].strip()
    if "role" in changes and changes["role"] is not None:
        user.role = changes["role"]
    if "is_active" in changes and changes["is_active"] is not None:
        if user.user_id == actor.user_id and not changes["is_active"]:
            raise HTTPException(status.HTTP_409_CONFLICT, "No puede desactivar su propia cuenta.")
        user.is_active = changes["is_active"]

    audit.record(db, actor.user_id, "USER_UPDATE", f"users/{user.user_id}",
                 {"email": user.email, "fields": list(changes.keys())})
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
