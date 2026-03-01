-- ===========================
-- FEAT-048: AI Grade Audit Log
-- ===========================
-- Append-only audit table for AI grading events and teacher overrides.
-- No FK constraint on submission_id — the audit record must survive
-- deletion of the referenced submission (architecture decision ADR).

CREATE TABLE grade_audit_logs (
    id                      UUID        NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_id           UUID        NOT NULL,
    student_id              UUID,
    exam_template_id        UUID,
    event_type              VARCHAR(30) NOT NULL,
    original_ai_score       NUMERIC(10, 2),
    confidence_level        NUMERIC(5,  2),
    teacher_modified_score  NUMERIC(10, 2),
    override_reason         TEXT,
    reviewer_id             UUID,
    grading_result_grade_id UUID,
    CONSTRAINT pk_grade_audit_logs PRIMARY KEY (id)
);

-- ===========================
-- Indexes
-- ===========================

CREATE INDEX idx_grade_audit_logs_student_id
    ON grade_audit_logs (student_id);

CREATE INDEX idx_grade_audit_logs_created_at
    ON grade_audit_logs (created_at);

CREATE INDEX idx_grade_audit_logs_student_id_created_at
    ON grade_audit_logs (student_id, created_at);
