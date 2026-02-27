-- FEAT-049: per-teacher confidence threshold override

ALTER TABLE users
    ADD COLUMN confidence_threshold NUMERIC(3,2);

ALTER TABLE users
    ADD CONSTRAINT chk_users_confidence_threshold_range
        CHECK (confidence_threshold IS NULL OR (confidence_threshold >= 0.00 AND confidence_threshold <= 1.00));