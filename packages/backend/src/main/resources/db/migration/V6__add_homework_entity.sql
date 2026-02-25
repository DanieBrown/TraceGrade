-- FEAT: Homework entity for teacher-created homework assignments scoped to a school.

CREATE TABLE homework (
    id            UUID          PRIMARY KEY,
    school_id     UUID          NOT NULL,
    title         VARCHAR(200)  NOT NULL,
    description   TEXT,
    class_name    VARCHAR(200),
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    max_points    DECIMAL(10,2),
    created_at    TIMESTAMP     NOT NULL,
    updated_at    TIMESTAMP     NOT NULL,
    CONSTRAINT fk_homework_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    CONSTRAINT chk_homework_status
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
    CONSTRAINT chk_homework_max_points_non_negative
        CHECK (max_points IS NULL OR max_points >= 0)
);

CREATE INDEX idx_homework_school_id ON homework(school_id);
CREATE INDEX idx_homework_school_status ON homework(school_id, status);
CREATE INDEX idx_homework_due_date ON homework(due_date);
