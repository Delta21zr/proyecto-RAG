from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.controllers import document_controller as ctrl
from app.database import get_db
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documentos"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload(background: BackgroundTasks, file: UploadFile = File(...),
                 project_id: Optional[UUID] = Form(None),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Recibe el archivo (202) e indexa en segundo plano: PENDING -> PROCESSING -> PUBLISHED | ERROR."""
    return await ctrl.upload_document(db, file, project_id, user, background)


@router.get("", response_model=DocumentListResponse)
def list_docs(project_id: Optional[UUID] = None, skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ctrl.list_documents(db, user, project_id, skip, limit)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_doc(document_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ctrl.get_document(db, document_id, user)


@router.get("/{document_id}/download")
def download_doc(document_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Descarga el archivo original (PROJ-101). Solo si el usuario puede ver el documento."""
    return ctrl.download_document(db, document_id, user)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doc(document_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ctrl.delete_document(db, document_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
