from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.controllers.auth_controller import authenticate_user
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    return authenticate_user(db, data, request.client.host if request.client else None)
