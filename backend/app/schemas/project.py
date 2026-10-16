from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]
Visibility = Literal["PUBLIC_INSTITUTIONAL", "RESTRICTED_TEAM"]


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    area: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    visibility: Visibility = "RESTRICTED_TEAM"


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    area: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    visibility: Optional[Visibility] = None


class ProjectStatusUpdate(BaseModel):
    status: Status
    comment: Optional[str] = Field(None, max_length=1000)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: UUID
    title: str
    responsible_id: UUID
    area: str
    description: Optional[str]
    status: str
    visibility: str
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
