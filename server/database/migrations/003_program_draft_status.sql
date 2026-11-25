-- A program can be saved as a draft before any appointment exists (US-18, RM-071).
ALTER TABLE program
  MODIFY COLUMN status ENUM('draft','programmed','in_progress','finished','abandoned')
    NOT NULL DEFAULT 'programmed';
