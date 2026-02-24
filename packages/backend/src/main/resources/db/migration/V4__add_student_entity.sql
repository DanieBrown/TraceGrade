-- FEAT-022: Add Student entity for Gradebook MVP

CREATE TABLE students (
    id            UUID         PRIMARY KEY,
    school_id     UUID         NOT NULL REFERENCES schools(id),
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(200) NOT NULL,
    student_number VARCHAR(50),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);

-- Enforce unique email per school
CREATE UNIQUE INDEX uq_students_school_email
    ON students(school_id, email);

-- Enforce unique student number per school (when present)
CREATE UNIQUE INDEX uq_students_school_number
    ON students(school_id, student_number)
    WHERE student_number IS NOT NULL;

CREATE INDEX idx_students_school_active
    ON students(school_id, is_active);
