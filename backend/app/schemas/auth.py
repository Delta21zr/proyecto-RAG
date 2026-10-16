from pydantic import BaseModel, EmailStr
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: UUID
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserResponse
