-- ===========================
-- TraceGrade Database Schema V1
-- ===========================

-- System info table
CREATE TABLE IF NOT EXISTS system_info (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    initialized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_info (version) VALUES ('0.1.0');

-- ===========================
-- AI Grading Schema (FEAT-002)
-- ===========================

-- Exam Templates: AI-generated or teacher-created exams
CREATE TABLE exam_templates (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL,
    assignment_id UUID,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(100),
    topic VARCHAR(200),
    difficulty_level VARCHAR(20),
    total_points DECIMAL(10,2) NOT NULL,
    questions_json TEXT NOT NULL,
    pdf_url VARCHAR(500),
    generation_prompt TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Answer Rubrics: teacher answer keys per question
CREATE TABLE answer_rubrics (
    id UUID PRIMARY KEY,
    exam_template_id UUID NOT NULL,
    question_number INTEGER NOT NULL,
    answer_text TEXT,
    answer_image_url VARCHAR(500),
    points_available DECIMAL(10,2) NOT NULL,
    acceptable_variations TEXT,
    grading_notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rubric_exam_template
        FOREIGN KEY (exam_template_id) REFERENCES exam_templates(id) ON DELETE CASCADE
);

-- Student Submissions: uploaded student exam images
CREATE TABLE student_submissions (
    id UUID PRIMARY KEY,
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    exam_template_id UUID,
    submission_image_urls TEXT NOT NULL,
    original_format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_submission_exam_template
        FOREIGN KEY (exam_template_id) REFERENCES exam_templates(id) ON DELETE SET NULL
);

-- Grading Results: AI grading output per submission
CREATE TABLE grading_results (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL UNIQUE,
    grade_id UUID,
    ai_score DECIMAL(10,2),
    final_score DECIMAL(10,2),
    confidence_score DECIMAL(5,2) NOT NULL,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    question_scores TEXT NOT NULL,
    ai_feedback TEXT,
    teacher_override BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    processing_time_ms INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_result_submission
        FOREIGN KEY (submission_id) REFERENCES student_submissions(id) ON DELETE CASCADE
);

-- ===========================
-- Indexes
-- ===========================

-- Exam template indexes
CREATE INDEX idx_exam_templates_teacher_id ON exam_templates(teacher_id);
CREATE INDEX idx_exam_templates_created_at ON exam_templates(created_at);

-- Answer rubric indexes
CREATE INDEX idx_answer_rubrics_exam_template_id ON answer_rubrics(exam_template_id);
CREATE INDEX idx_answer_rubrics_exam_question ON answer_rubrics(exam_template_id, question_number);

-- Student submission indexes
CREATE INDEX idx_student_submissions_student_id ON student_submissions(student_id);
CREATE INDEX idx_student_submissions_assignment_student ON student_submissions(assignment_id, student_id);
CREATE INDEX idx_student_submissions_status ON student_submissions(status);
CREATE INDEX idx_student_submissions_created_at ON student_submissions(created_at);

-- Grading result indexes
CREATE INDEX idx_grading_results_submission_id ON grading_results(submission_id);
CREATE INDEX idx_grading_results_needs_review ON grading_results(needs_review, reviewed_at);
CREATE INDEX idx_grading_results_created_at ON grading_results(created_at);
