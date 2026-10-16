-- ==============================================================================
-- University Research Project Management Platform
-- Database DDL Schema (PostgreSQL 14+)
-- Designed according to SRS v1.1 and SDD Section 8 & 9
-- ==============================================================================

-- Enable UUID extension if not available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDINATOR', 'RESEARCHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_visibility AS ENUM ('PUBLIC_INSTITUTIONAL', 'RESTRICTED_TEAM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_file_type AS ENUM ('PDF', 'DOCX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- TABLE: users (RF-001, RF-015, SDD 8.1)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'RESEARCHER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ------------------------------------------------------------------------------
-- TABLE: projects (RF-003, RF-004, RF-005, SDD 8.2)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) UNIQUE NOT NULL,
    responsible_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    area VARCHAR(100) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'DRAFT',
    visibility project_visibility NOT NULL DEFAULT 'RESTRICTED_TEAM',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- TABLE: documents (RF-006, RF-007, RF-008, RF-009, SDD 8.3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE, -- NULL si es normativa institucional
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    file_type document_file_type NOT NULL,
    status document_status NOT NULL DEFAULT 'PENDING',
    uploaded_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_document_version CHECK (version >= 1)
);

-- ------------------------------------------------------------------------------
-- TABLE: document_fragments (Chunks para RAG) (SDD 8.4, RF-008, AIR-001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_fragments (
    fragment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER CHECK (page_number >= 1),
    paragraph_num INTEGER CHECK (paragraph_num >= 1),
    vector_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- TABLE: queries (Historial de consultas RAG) (RF-014, SDD 8.5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS queries (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    model_version VARCHAR(100) NOT NULL DEFAULT 'llama3:8b',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- TABLE: citations (Trazabilidad y citas exactas) (RF-012, AIR-002, SDD 8.5)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citations (
    citation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES queries(query_id) ON DELETE CASCADE,
    fragment_id UUID NOT NULL REFERENCES document_fragments(fragment_id) ON DELETE CASCADE,
    relevance_score REAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- TABLE: audit_event (Logs de auditoría y seguridad) (RF-016, SDD 8.6)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_event (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'PROJECT_CREATE', 'STATUS_CHANGE', 'UPLOAD', etc.
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- OPTIMIZATION INDEXES (B-Tree para consultas p95 <= 3s - RNF-003)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_responsible ON projects(responsible_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_fragments_document_id ON document_fragments(document_id);
CREATE INDEX IF NOT EXISTS idx_fragments_vector_id ON document_fragments(vector_id);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_citations_query_id ON citations(query_id);
CREATE INDEX IF NOT EXISTS idx_citations_fragment_id ON citations(fragment_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_event(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_event(action);

-- ------------------------------------------------------------------------------
-- TRIGGER: Auto-update updated_at on projects
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_projects_timestamp ON projects;
CREATE TRIGGER trigger_update_projects_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
