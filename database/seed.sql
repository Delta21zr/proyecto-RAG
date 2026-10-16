-- Datos semilla de desarrollo (bcrypt vía pgcrypto, compatible con passlib).
-- Contraseña de todos los usuarios: Admin123!  (CAMBIAR fuera de desarrollo)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@universidad.edu',  crypt('Admin123!', gen_salt('bf', 12)), 'Administrador Sistema', 'ADMIN'),
  ('coord@universidad.edu',  crypt('Admin123!', gen_salt('bf', 12)), 'Coordinador Investigación', 'COORDINATOR'),
  ('inv@universidad.edu',    crypt('Admin123!', gen_salt('bf', 12)), 'Investigador Demo', 'RESEARCHER')
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (title, responsible_id, area, description, visibility)
SELECT 'Proyecto Demo Nanomateriales', user_id, 'Ingeniería', 'Proyecto de ejemplo.', 'PUBLIC_INSTITUTIONAL'
FROM users WHERE email = 'inv@universidad.edu'
ON CONFLICT (title) DO NOTHING;
