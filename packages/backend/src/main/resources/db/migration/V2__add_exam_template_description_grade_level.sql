-- FEAT-005: Add description and grade_level columns to exam_templates
ALTER TABLE exam_templates ADD COLUMN description TEXT;
ALTER TABLE exam_templates ADD COLUMN grade_level VARCHAR(50);

CREATE INDEX idx_exam_templates_grade_level ON exam_templates(grade_level);
CREATE INDEX idx_exam_templates_subject_grade ON exam_templates(subject, grade_level);
