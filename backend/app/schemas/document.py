from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: UUID
    project_id: Optional[UUID]
    file_name: str
    version: int
    file_type: str
    status: str
    uploaded_by: UUID
    created_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class RagQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)


class CitationOut(BaseModel):
    ref: int
    fragment_id: UUID
    document_id: UUID
    file_name: str
    page_number: Optional[int]
    paragraph_num: Optional[int]
    score: float


class RagQueryResponse(BaseModel):
    query_id: UUID
    answer: str
    abstained: bool
    max_score: Optional[float]
    citations: List[CitationOut]


class RagHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    query_id: UUID
    prompt_text: str
    response_text: str
    created_at: datetime


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: UUID
    actor_id: Optional[UUID]
    action: str
    resource: str
    details: Any
    created_at: datetime


class AuditListResponse(BaseModel):
    events: List[AuditEventOut]
    total: int
