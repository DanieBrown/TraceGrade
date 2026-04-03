-- Remove the deprecated student number field from the students schema.

DROP INDEX IF EXISTS uq_students_school_number;

ALTER TABLE students
    DROP COLUMN IF EXISTS student_number;