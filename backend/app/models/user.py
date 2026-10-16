import uuid
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.sql import func
from app.database import Base

USER_ROLES = ("ADMIN", "COORDINATOR", "RESEARCHER")


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(ENUM(*USER_ROLES, name="user_role", create_type=False), nullable=False, default="RESEARCHER")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
