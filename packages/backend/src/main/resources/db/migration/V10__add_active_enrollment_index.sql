-- FEAT-024: Prevent concurrent duplicate active class enrollments
CREATE UNIQUE INDEX uq_active_class_enrollment
    ON class_enrollments (class_id, student_id)
    WHERE dropped_at IS NULL;
