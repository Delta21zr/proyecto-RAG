from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.document import AuditEventOut, AuditListResponse
from app.utils.security import require_roles

router = APIRouter(prefix="/api/audit", tags=["Auditoría"])


@router.get("/logs", response_model=AuditListResponse)
def audit_logs(actor_id: Optional[UUID] = None, action: Optional[str] = Query(None, max_length=50),
               skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
               _: User = Depends(require_roles("ADMIN")), db: Session = Depends(get_db)):
    q = db.query(AuditEvent)
    if actor_id:
        q = q.filter(AuditEvent.actor_id == actor_id)
    if action:
        q = q.filter(AuditEvent.action == action)
    total = q.count()
    rows = q.order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit).all()
    return AuditListResponse(events=[AuditEventOut.model_validate(r) for r in rows], total=total)
