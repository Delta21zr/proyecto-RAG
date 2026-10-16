from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.audit_middleware import AuditMiddleware
from app.routes.audit_routes import router as audit_router
from app.routes.auth_routes import router as auth_router
from app.routes.document_routes import router as document_router
from app.routes.project_routes import router as project_router
from app.routes.rag_routes import router as rag_router

# El esquema se gestiona con database/schema.sql (fuente de verdad); no se usa create_all().
app = FastAPI(
    title="University Research Platform API",
    version="1.0.0",
    description="API REST institucional para gestión de investigaciones y RAG local.",
)

# Orden: el último agregado es el más externo. CORS debe envolver a la auditoría.
app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth_router, project_router, document_router, rag_router, audit_router):
    app.include_router(r)


@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
