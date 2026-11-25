-- Signup records when the terms were accepted (US-01, RM-001).
-- Added as NULL first, filled for existing rows, then made mandatory.
ALTER TABLE `user`
  ADD COLUMN terms_accepted_at DATETIME(3) NULL AFTER password_hash;
UPDATE `user` SET terms_accepted_at = created_at WHERE terms_accepted_at IS NULL;
ALTER TABLE `user`
  MODIFY COLUMN terms_accepted_at DATETIME(3) NOT NULL;

-- "Today" is computed in the user's time zone (D-12).
ALTER TABLE `user`
  ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris' AFTER sex;

-- A session closed by the 4-hour inactivity job is flagged (US-33, RM-065),
-- and so is a session declared after the fact (US-38).
ALTER TABLE workout_session
  ADD COLUMN auto_closed BOOLEAN NOT NULL DEFAULT FALSE AFTER comment,
  ADD COLUMN declared_afterwards BOOLEAN NOT NULL DEFAULT FALSE AFTER auto_closed;
