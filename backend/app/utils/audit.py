from typing import Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent


def record(db: Session, actor_id: Optional[UUID], action: str, resource: str,
           details: Optional[dict[str, Any]] = None) -> None:
    """Agrega un evento de auditoría a la sesión. El llamador hace commit (misma transacción)."""
    db.add(AuditEvent(actor_id=actor_id, action=action[:50], resource=resource[:100], details=details or {}))
