from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.schemas.project import (ProjectCreate, ProjectListResponse, ProjectResponse,
                                 ProjectStatusUpdate, ProjectUpdate)
from app.utils import audit
from app.utils.access import can_view_project, is_owner, visible_projects_clause

# (estado actual, nuevo estado) -> quién puede ejecutarla
#   owner    = responsable del proyecto
#   reviewer = COORDINATOR que NO sea el responsable (separación de funciones, BR-001/RF-005)
TRANSITIONS = {
    ("DRAFT", "IN_REVIEW"): "owner",
    ("REJECTED", "DRAFT"): "owner",
    ("IN_REVIEW", "APPROVED"): "reviewer",
    ("IN_REVIEW", "REJECTED"): "reviewer",
    ("APPROVED", "ARCHIVED"): "reviewer",
    ("REJECTED", "ARCHIVED"): "reviewer",
}
EDITABLE_STATES = ("DRAFT", "REJECTED")


def get_project_or_404(db: Session, project_id: UUID, user: User) -> Project:
    project = db.get(Project, project_id)
    # 404 (no 403) cuando no es visible: no revela la existencia del proyecto.
    if not project or not can_view_project(user, project):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado.")
    return project


def create_project(db: Session, data: ProjectCreate, user: User) -> ProjectResponse:
    if user.role not in ("COORDINATOR", "RESEARCHER"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No cuenta con permisos para crear proyectos.")
    project = Project(title=data.title.strip(), responsible_id=user.user_id, area=data.area.strip(),
                      description=data.description, status="DRAFT", visibility=data.visibility)
    db.add(project)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese título.")
    audit.record(db, user.user_id, "CREATE_PROJECT", f"projects/{project.project_id}",
                 {"title": project.title, "area": project.area})
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


def list_projects(db: Session, user: User, skip: int, limit: int,
                  area: Optional[str], status_filter: Optional[str]) -> ProjectListResponse:
    q = db.query(Project).filter(visible_projects_clause(user))
    if area:
        q = q.filter(Project.area.ilike(f"%{area}%"))
    if status_filter:
        q = q.filter(Project.status == status_filter)
    total = q.count()
    rows = q.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    return ProjectListResponse(projects=[ProjectResponse.model_validate(p) for p in rows], total=total)


def update_project(db: Session, project_id: UUID, data: ProjectUpdate, user: User) -> ProjectResponse:
    project = get_project_or_404(db, project_id, user)
    if not is_owner(user, project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el responsable puede editar el proyecto.")
    if project.status not in EDITABLE_STATES:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Un proyecto en estado {project.status} no puede editarse.")
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(project, field, value)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un proyecto con ese título.")
    audit.record(db, user.user_id, "UPDATE_PROJECT", f"projects/{project.project_id}",
                 {"fields": list(changes)})
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


def change_status(db: Session, project_id: UUID, data: ProjectStatusUpdate, user: User) -> ProjectResponse:
    project = get_project_or_404(db, project_id, user)
    who = TRANSITIONS.get((project.status, data.status))
    if who is None:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Transición no permitida: {project.status} -> {data.status}.")
    if who == "owner" and not is_owner(user, project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el responsable puede realizar esta transición.")
    if who == "reviewer" and (user.role != "COORDINATOR" or is_owner(user, project)):
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "Solo un coordinador distinto del responsable puede revisar el proyecto.")
    if data.status == "REJECTED" and not (data.comment and data.comment.strip()):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Rechazar un proyecto requiere un comentario.")

    previous = project.status
    project.status = data.status
    audit.record(db, user.user_id, "STATUS_CHANGE", f"projects/{project.project_id}",
                 {"from": previous, "to": data.status, "comment": data.comment})
    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)
