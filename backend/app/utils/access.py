"""Reglas de acceso (RBAC) centralizadas. Una sola fuente de verdad para listados, documentos y RAG.

- COORDINATOR: ve todos los proyectos (revisión).
- RESEARCHER / ADMIN: proyectos propios + proyectos APROBADOS con visibilidad institucional.
  (El administrador gestiona la plataforma pero NO accede a contenido restringido - SRS.)
"""
from sqlalchemy import and_, or_, true
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User


def visible_projects_clause(user: User):
    if user.role == "COORDINATOR":
        return true()
    return or_(
        Project.responsible_id == user.user_id,
        and_(Project.visibility == "PUBLIC_INSTITUTIONAL", Project.status == "APPROVED"),
    )


def can_view_project(user: User, project: Project) -> bool:
    if user.role == "COORDINATOR" or project.responsible_id == user.user_id:
        return True
    return project.visibility == "PUBLIC_INSTITUTIONAL" and project.status == "APPROVED"


def is_owner(user: User, project: Project) -> bool:
    return project.responsible_id == user.user_id


def rag_allowed_project_ids(db: Session, user: User) -> list[str]:
    """Proyectos sobre los que el usuario puede consultar (AIR-001). Excluye archivados."""
    rows = (db.query(Project.project_id)
            .filter(visible_projects_clause(user), Project.status != "ARCHIVED").all())
    return [str(r[0]) for r in rows]
