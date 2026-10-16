import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

PROJECT_STATUSES = ("DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "ARCHIVED")
PROJECT_VISIBILITIES = ("PUBLIC_INSTITUTIONAL", "RESTRICTED_TEAM")


class Project(Base):
    __tablename__ = "projects"

    project_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), unique=True, nullable=False, index=True)
    responsible_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False, index=True)
    area = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(ENUM(*PROJECT_STATUSES, name="project_status", create_type=False), nullable=False, default="DRAFT", index=True)
    visibility = Column(ENUM(*PROJECT_VISIBILITIES, name="project_visibility", create_type=False), nullable=False, default="RESTRICTED_TEAM")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    responsible = relationship("User", backref="projects")
