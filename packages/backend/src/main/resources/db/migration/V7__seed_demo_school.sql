-- Seed a default demo school so the frontend has a valid VITE_SCHOOL_ID out of the box.
-- This UUID must match the VITE_SCHOOL_ID value used in .env.local / docker-compose.yml.

INSERT INTO schools (id, name, school_type, address, phone, email, timezone, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'TraceGrade Demo School',
    'HIGH',
    NULL,
    NULL,
    NULL,
    'America/New_York',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
