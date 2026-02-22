-- FEAT-021: Add School entity for multi-tenant architecture

CREATE TABLE schools (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    school_type VARCHAR(20) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(200),
    timezone VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- school_id will be added to users table when User entity is implemented (Phase 2 of FEAT-021)

CREATE INDEX idx_schools_type_active ON schools(school_type, is_active);
CREATE INDEX idx_schools_is_active ON schools(is_active);
