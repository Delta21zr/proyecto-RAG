from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.controllers import project_controller as ctrl
from app.database import get_db
from app.models.user import User
from app.schemas.project import (ProjectCreate, ProjectListResponse, ProjectResponse,
                                 ProjectStatusUpdate, ProjectUpdate)
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Proyectos"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_new_project(data: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ctrl.create_project(db, data, user)


@router.get("", response_model=ProjectListResponse)
def list_user_projects(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                       area: Optional[str] = Query(None, max_length=100),
                       status_filter: Optional[str] = Query(None, alias="status"),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ctrl.list_projects(db, user, skip, limit, area, status_filter)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ProjectResponse.model_validate(ctrl.get_project_or_404(db, project_id, user))


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: UUID, data: ProjectUpdate, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    return ctrl.update_project(db, project_id, data, user)


@router.put("/{project_id}/status", response_model=ProjectResponse)
def update_project_status(project_id: UUID, data: ProjectStatusUpdate, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    return ctrl.change_status(db, project_id, data, user)
