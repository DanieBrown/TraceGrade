-- Seed a default demo teacher user so dev/docker authenticated requests can create classes without FK violations.
-- IDs must align with DevAuthenticationFilter constants and V7 demo school seed.

INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-4000-a000-000000000002',
    '00000000-0000-4000-a000-000000000001',
    'teacher@demo.tracegrade.local',
    '$2a$10$O91wL1htvDGfFDito9jqtOdVUWN/t7L8zbs3AVigPk1GCsgm3Nn/K',
    'Demo',
    'Teacher',
    'TEACHER',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
