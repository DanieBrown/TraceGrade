-- FEAT: persist structured homework materials for the full-page builder

ALTER TABLE homework
    ADD COLUMN materials_json TEXT;