from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Citation, DocumentFragment, Query as QueryModel
from app.models.user import User
from app.schemas.document import RagHistoryItem, RagQueryRequest, RagQueryResponse
from app.services import rag_service
from app.utils import audit
from app.utils.access import rag_allowed_project_ids
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/rag", tags=["Asistente RAG"])


@router.post("/query", response_model=RagQueryResponse)
def rag_query(data: RagQueryRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # AIR-001: los proyectos permitidos se calculan en BD ANTES de consultar a Qdrant.
    allowed = rag_allowed_project_ids(db, user)
    try:
        result = rag_service.get_pipeline().query(data.prompt, allowed_project_ids=allowed)
    except Exception as exc:  # noqa: BLE001 - Ollama/Qdrant caídos
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            f"Motor RAG no disponible: {type(exc).__name__}")

    q = QueryModel(user_id=user.user_id, prompt_text=data.prompt, response_text=result["answer"])
    db.add(q)
    db.flush()

    # Solo se persisten citas cuyo fragmento exista en BD (puede haber sido eliminado entre medias).
    existing = {str(f[0]) for f in db.query(DocumentFragment.fragment_id)
                .filter(DocumentFragment.fragment_id.in_([c["fragment_id"] for c in result["citations"]])).all()}
    citations = [c for c in result["citations"] if c["fragment_id"] in existing]
    db.add_all(Citation(query_id=q.query_id, fragment_id=c["fragment_id"], relevance_score=c["score"])
               for c in citations)
    audit.record(db, user.user_id, "RAG_QUERY", f"queries/{q.query_id}",
                 {"abstained": result["abstained"], "citations": len(citations)})
    db.commit()

    return RagQueryResponse(query_id=q.query_id, answer=result["answer"], abstained=result["abstained"],
                            max_score=result.get("max_score"), citations=citations)


@router.get("/history", response_model=List[RagHistoryItem])
def rag_history(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """RF-014: cada usuario ve únicamente su propio historial."""
    return (db.query(QueryModel).filter(QueryModel.user_id == user.user_id)
            .order_by(QueryModel.created_at.desc()).offset(skip).limit(limit).all())
