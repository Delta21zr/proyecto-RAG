"""Middleware de auditoría (RF-016).

Registra en audit_event, con sesión propia (independiente de la transacción de la petición):
  - toda petición que modifica estado (POST/PUT/PATCH/DELETE)
  - toda respuesta 401/403 (accesos denegados)
Las lecturas exitosas no se registran para no inflar la tabla. Nunca se guardan cuerpos ni cabeceras
(contraseñas, tokens)."""
import logging

from fastapi import Request
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import SessionLocal
from app.utils import audit
from app.utils.security import decode_token

log = logging.getLogger("audit")
MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PREFIXES = ("/docs", "/redoc", "/openapi.json", "/health")


def _write(actor_id, action, resource, details):
    db = SessionLocal()
    try:
        audit.record(db, actor_id, action, resource, details)
        db.commit()
    except Exception:  # noqa: BLE001 - la auditoría no debe tumbar la petición
        log.exception("No se pudo registrar el evento de auditoría")
        db.rollback()
    finally:
        db.close()


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith(SKIP_PREFIXES):
            return response

        denied = response.status_code in (401, 403)
        if request.method in MUTATING or denied:
            actor = None
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                payload = decode_token(auth[7:])
                actor = payload.get("sub") if payload else None
            route = request.scope.get("route")
            details = {"method": request.method, "path": path, "status": response.status_code,
                       "ip": request.client.host if request.client else None}
            await run_in_threadpool(
                _write, actor, "ACCESS_DENIED" if denied else "HTTP_REQUEST",
                f"{request.method} {getattr(route, 'path', path)}", details)
        return response
