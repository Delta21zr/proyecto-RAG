import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import backref, relationship
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    file_type = Column(ENUM("PDF", "DOCX", name="document_file_type", create_type=False), nullable=False)
    status = Column(ENUM("PENDING", "PROCESSING", "PUBLISHED", "ERROR", name="document_status", create_type=False),
                    nullable=False, default="PENDING", index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", backref="documents")
    uploader = relationship("User", backref="uploaded_documents")


class DocumentFragment(Base):
    __tablename__ = "document_fragments"

    fragment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    page_number = Column(Integer)
    paragraph_num = Column(Integer)
    vector_id = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("Document", backref=backref("fragments", passive_deletes=True))


class Query(Base):
    __tablename__ = "queries"

    query_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    model_version = Column(String(100), nullable=False, default="llama3:8b-instruct-q4_0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    citations = relationship("Citation", backref="query", cascade="all, delete-orphan")


class Citation(Base):
    __tablename__ = "citations"

    citation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("queries.query_id", ondelete="CASCADE"), nullable=False, index=True)
    fragment_id = Column(UUID(as_uuid=True), ForeignKey("document_fragments.fragment_id", ondelete="CASCADE"), nullable=False, index=True)
    relevance_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
