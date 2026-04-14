-- FEAT: store extracted DOCX text on the submission for AI grading

ALTER TABLE student_submissions
    ADD COLUMN submission_text TEXT;