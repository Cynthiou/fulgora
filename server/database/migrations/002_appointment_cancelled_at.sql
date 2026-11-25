-- A cancelled appointment keeps the moment it was cancelled (US-26, RM-035).
-- The check makes the two facts agree: cancelled <=> cancelled_at filled.
ALTER TABLE appointment
  ADD COLUMN cancelled_at DATETIME(3) NULL AFTER status,
  ADD CONSTRAINT ck_appointment_cancelled_at
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL));
