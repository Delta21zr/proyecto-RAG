from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from uuid import UUID

UserRole = Literal["ADMIN", "COORDINATOR", "RESEARCHER"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = "RESEARCHER"


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserResponse
