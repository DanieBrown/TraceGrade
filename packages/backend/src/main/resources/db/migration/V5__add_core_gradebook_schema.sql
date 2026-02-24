-- FEAT-035: Core MVP gradebook schema (forward-only after immutable V4)

-- Users
CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    school_id     UUID,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL,
    CONSTRAINT fk_users_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_users_email ON users(email);
CREATE INDEX idx_users_school_id ON users(school_id);

-- Students extension (keep V4 table, extend in V5)
ALTER TABLE students ADD COLUMN teacher_id UUID;
ALTER TABLE students ADD COLUMN grade_level INTEGER;
ALTER TABLE students ADD COLUMN notes TEXT;

ALTER TABLE students
    ADD CONSTRAINT fk_students_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_students_teacher_active ON students(teacher_id, is_active);

-- Classes
CREATE TABLE classes (
    id            UUID         PRIMARY KEY,
    school_id     UUID,
    teacher_id    UUID         NOT NULL,
    name          VARCHAR(200) NOT NULL,
    subject       VARCHAR(100),
    period        VARCHAR(50),
    school_year   VARCHAR(20)  NOT NULL,
    grading_scale TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL,
    CONSTRAINT fk_classes_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_classes_teacher_active ON classes(teacher_id, is_active);
CREATE INDEX idx_classes_school_teacher ON classes(school_id, teacher_id);

-- Class enrollments
CREATE TABLE class_enrollments (
    id          UUID      PRIMARY KEY,
    class_id    UUID      NOT NULL,
    student_id  UUID      NOT NULL,
    enrolled_at TIMESTAMP NOT NULL,
    dropped_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT fk_class_enrollments_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_enrollments_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_class_enrollments_class_student_enrolled_at
        UNIQUE (class_id, student_id, enrolled_at),
    CONSTRAINT chk_class_enrollments_dropped_after_enrolled
        CHECK (dropped_at IS NULL OR dropped_at >= enrolled_at)
);

-- Grade categories
CREATE TABLE grade_categories (
    id          UUID          PRIMARY KEY,
    class_id    UUID          NOT NULL,
    name        VARCHAR(100)  NOT NULL,
    weight      DECIMAL(5, 2) NOT NULL,
    drop_lowest INTEGER       NOT NULL DEFAULT 0,
    color       VARCHAR(7),
    created_at  TIMESTAMP     NOT NULL,
    updated_at  TIMESTAMP     NOT NULL,
    CONSTRAINT fk_grade_categories_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT chk_grade_categories_weight_range
        CHECK (weight >= 0 AND weight <= 100),
    CONSTRAINT chk_grade_categories_drop_lowest_non_negative
        CHECK (drop_lowest >= 0),
    CONSTRAINT uq_grade_categories_class_name
        UNIQUE (class_id, name),
    CONSTRAINT uq_grade_categories_id_class
        UNIQUE (id, class_id)
);

CREATE INDEX idx_grade_categories_class_id ON grade_categories(class_id);

-- Assignments
CREATE TABLE assignments (
    id            UUID          PRIMARY KEY,
    class_id      UUID          NOT NULL,
    category_id   UUID          NOT NULL,
    name          VARCHAR(200)  NOT NULL,
    description   TEXT,
    max_points    DECIMAL(10,2) NOT NULL,
    due_date      DATE,
    assigned_date DATE,
    is_published  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL,
    updated_at    TIMESTAMP     NOT NULL,
    CONSTRAINT fk_assignments_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_category_class
        FOREIGN KEY (category_id, class_id) REFERENCES grade_categories(id, class_id),
    CONSTRAINT chk_assignments_max_points_positive
        CHECK (max_points > 0)
);

CREATE INDEX idx_assignments_class_published ON assignments(class_id, is_published);
CREATE INDEX idx_assignments_category_id ON assignments(category_id);

-- Grades
CREATE TABLE grades (
    id            UUID          PRIMARY KEY,
    assignment_id UUID          NOT NULL,
    student_id    UUID          NOT NULL,
    points_earned DECIMAL(10,2),
    status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    notes         TEXT,
    graded_at     TIMESTAMP,
    created_at    TIMESTAMP     NOT NULL,
    updated_at    TIMESTAMP     NOT NULL,
    CONSTRAINT fk_grades_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_grades_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_grades_student_assignment
        UNIQUE (student_id, assignment_id),
    CONSTRAINT chk_grades_status
        CHECK (status IN ('PENDING', 'GRADED', 'EXCUSED', 'MISSING', 'INCOMPLETE')),
    CONSTRAINT chk_grades_points_non_negative
        CHECK (points_earned IS NULL OR points_earned >= 0)
);

CREATE INDEX idx_grades_assignment_id ON grades(assignment_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);