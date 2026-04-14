-- FEAT: per-teacher AI grading provider selection
-- Adds grading_provider column to users table; defaults to GEMINI_FLASH

ALTER TABLE users
    ADD COLUMN grading_provider VARCHAR(50) NOT NULL DEFAULT 'GEMINI_FLASH';

ALTER TABLE users
    ADD CONSTRAINT chk_users_grading_provider
        CHECK (grading_provider IN ('GEMINI_FLASH', 'OPENAI_GPT4O', 'CLAUDE_SONNET'));