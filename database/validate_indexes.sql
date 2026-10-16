-- Validación de índices B-Tree (RNF-003: p95 <= 3 s).
-- Carga sintética en una transacción y ROLLBACK al final: no deja datos.
BEGIN;

-- 20 000 usuarios, 50 000 proyectos, 200 000 documentos, 500 000 fragmentos, 300 000 auditorías
INSERT INTO users (email, password_hash, full_name, role)
SELECT 'load' || g || '@test.edu', 'x', 'Load ' || g, 'RESEARCHER' FROM generate_series(1, 20000) g;

INSERT INTO projects (title, responsible_id, area, status, visibility)
SELECT 'Load project ' || g,
       (SELECT user_id FROM users WHERE email = 'load' || (1 + g % 20000) || '@test.edu'),
       'Area ' || (g % 30),
       (ARRAY['DRAFT','IN_REVIEW','APPROVED','REJECTED','ARCHIVED'])[1 + g % 5]::project_status,
       (ARRAY['PUBLIC_INSTITUTIONAL','RESTRICTED_TEAM'])[1 + g % 2]::project_visibility
FROM generate_series(1, 50000) g;

INSERT INTO documents (project_id, file_name, file_path, file_type, status, uploaded_by)
SELECT p.project_id, 'doc' || n || '.pdf', '/data/doc' || n || '.pdf', 'PDF', 'PUBLISHED',
       p.responsible_id
FROM (SELECT project_id, responsible_id, row_number() OVER () rn FROM projects) p
CROSS JOIN generate_series(1, 4) n;

INSERT INTO document_fragments (document_id, content, page_number, paragraph_num, vector_id)
SELECT d.document_id, repeat('texto ', 50), 1 + (n % 20), n, gen_random_uuid()::text
FROM (SELECT document_id FROM documents LIMIT 100000) d
CROSS JOIN generate_series(1, 5) n;

INSERT INTO audit_event (actor_id, action, resource)
SELECT (SELECT user_id FROM users ORDER BY random() LIMIT 1), 'LOGIN', 'auth/login'
FROM generate_series(1, 300000);

ANALYZE;

\echo '=== 1. Login por email ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'load777@test.edu';

\echo '=== 2. Proyectos de un responsable filtrados por estado ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM projects
WHERE responsible_id = (SELECT user_id FROM users WHERE email = 'load10@test.edu') AND status = 'APPROVED';

\echo '=== 3. Listado Dashboard (RBAC investigador + orden + paginación) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM projects
WHERE (responsible_id = (SELECT user_id FROM users WHERE email = 'load10@test.edu')
       OR visibility = 'PUBLIC_INSTITUTIONAL')
  AND status = 'APPROVED'
ORDER BY created_at DESC LIMIT 50;

\echo '=== 4. Documentos de un proyecto ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM documents WHERE project_id = (SELECT project_id FROM projects LIMIT 1 OFFSET 1000);

\echo '=== 5. Fragmentos por documento (citas) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM document_fragments WHERE document_id = (SELECT document_id FROM documents LIMIT 1 OFFSET 500);

\echo '=== 6. Auditoría por actor, más reciente primero ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_event
WHERE actor_id = (SELECT user_id FROM users WHERE email = 'load10@test.edu')
ORDER BY created_at DESC LIMIT 100;

ROLLBACK;
