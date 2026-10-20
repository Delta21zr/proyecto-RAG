# Plataforma de Investigación Universitaria con RAG local

Gestión de proyectos de investigación y asistente RAG que responde con citas sobre los documentos cargados.
**100 % local**: ningún dato sale a servicios en la nube (Ollama + Qdrant + embeddings offline).

## Arquitectura

| Capa | Tecnología | Carpeta |
|---|---|---|
| Base de datos | PostgreSQL 16 | `database/` |
| Vectores | Qdrant | `docker-compose.yml` |
| API REST | FastAPI + SQLAlchemy, JWT, bcrypt | `backend/` |
| Motor RAG | Ollama (`llama3:8b-instruct-q4_0`) + `multilingual-e5-small` | `rag/` |
| Frontend | React + Tailwind (componentes base) | `frontend/` |

## Requisitos
Docker Desktop, Python 3.10+, [Ollama](https://ollama.com) y Git.

## Puesta en marcha

```powershell
# 1. PostgreSQL (localhost:5434) y Qdrant (localhost:6333). Aplica schema.sql y seed.sql la primera vez
docker compose up -d

# 2. Entorno Python único (backend + RAG)
python -m venv rag\.venv
rag\.venv\Scripts\python.exe -m pip install -r rag\requirements.txt -r backend\requirements.txt

# 3. Modelos locales (una sola vez; después funciona sin internet)
ollama pull llama3:8b-instruct-q4_0
cd rag; ..\rag\.venv\Scripts\python.exe download_models.py; cd ..

# 4. Configuración del backend
copy backend\.env.example backend\.env      # y cambiar SECRET_KEY

# 5. API  ->  http://127.0.0.1:8000/docs
cd backend
..\rag\.venv\Scripts\python.exe main.py
```

Usuarios de desarrollo (`database/seed.sql`), contraseña `Admin123!`:
`admin@universidad.edu`, `coord@universidad.edu`, `inv@universidad.edu`. **Solo para desarrollo.**

> El puerto 5434 evita choques con otros PostgreSQL locales. Se cambia con la variable `POSTGRES_PORT`
> (y `DATABASE_URL` en `backend/.env`).

## Endpoints principales

| Método y ruta | Descripción |
|---|---|
| `POST /api/auth/login` | Login, devuelve JWT (8 h) |
| `GET/POST /api/projects` | Listar (según rol) / crear proyecto |
| `PUT /api/projects/{id}/status` | Flujo `DRAFT → IN_REVIEW → APPROVED/REJECTED → ARCHIVED` |
| `POST /api/documents` | Sube PDF/DOCX; indexación en segundo plano |
| `GET /api/documents/{id}/download` | Descarga autorizada del archivo original (RBAC + auditoría) |
| `POST /api/rag/query` | Consulta con citas y abstención si no hay evidencia |
| `GET /api/audit/logs` | Auditoría (solo `ADMIN`) |

## Roles
- **RESEARCHER**: crea proyectos, sube documentos, consulta lo propio y lo aprobado/público.
- **COORDINATOR**: revisa y aprueba/rechaza proyectos ajenos; ve todo.
- **ADMIN**: gestiona la plataforma y la auditoría; no lee contenido restringido.

## Pruebas

```powershell
# API (usa el PostgreSQL real; el RAG se simula)
cd backend; ..\rag\.venv\Scripts\python.exe -m pytest tests -q
# Pipeline RAG real (requiere Qdrant y Ollama activos)
cd rag; ..\rag\.venv\Scripts\python.exe -m pytest test_rag.py -v -s
# Validación de índices (RNF-003)
Get-Content database\validate_indexes.sql | docker exec -i rag_postgres psql -U postgres -d university_rag
```

## Notas
- `BAAI/bge-small-es` no existe en Hugging Face; se usa `intfloat/multilingual-e5-small` (384 dim). Configurable en `rag/config.py`.
- El umbral de similitud (0.86) se calibró con un corpus sintético (`rag/eval/`); debe recalibrarse con documentos y preguntas reales:
  `cd rag; ..\rag\.venv\Scripts\python.exe eval\evaluate.py [--with-llm]`.
- Estado: Fases 1–3 (infraestructura, RAG, API) completas. Pendiente: frontend completo (subida de archivos, chat y citas).
