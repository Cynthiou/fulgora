-- US-51: an exercise can be done side by side, left then right (D-02).
-- The setting lives on the exercise of the prepared session; the goal of
-- repetitions or of duration is the same on both sides, only the load can
-- differ (RM-010, RM-022).
ALTER TABLE template_block_exercise
  ADD COLUMN is_per_side BOOLEAN NOT NULL DEFAULT FALSE AFTER default_rest_seconds;

ALTER TABLE planned_set
  ADD COLUMN weight_left_kg DECIMAL(9,3) NULL AFTER weight_kg,
  ADD COLUMN weight_right_kg DECIMAL(9,3) NULL AFTER weight_left_kg;

-- The copy made when the session starts carries the same information
-- (RM-041): the plan of the day never changes afterwards.
ALTER TABLE workout_exercise
  ADD COLUMN is_per_side BOOLEAN NOT NULL DEFAULT FALSE AFTER default_rest_seconds;

ALTER TABLE workout_set
  ADD COLUMN weight_left_planned_kg DECIMAL(9,3) NULL AFTER weight_actual_kg,
  ADD COLUMN weight_right_planned_kg DECIMAL(9,3) NULL AFTER weight_left_planned_kg;

-- What was really done, one row per side. A set is validated only once
-- both sides are there (RM-044).
CREATE TABLE workout_set_side (
  workout_set_id BIGINT UNSIGNED NOT NULL,
  side ENUM('left','right') NOT NULL,
  reps_actual INT UNSIGNED NULL,
  weight_actual_kg DECIMAL(9,3) NULL,
  duration_actual_seconds INT UNSIGNED NULL,
  validated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NULL COMMENT 'Set when the side is corrected (US-37, RM-049)',
  PRIMARY KEY (workout_set_id, side),
  CONSTRAINT fk_workout_set_side_set FOREIGN KEY (workout_set_id) REFERENCES workout_set(id) ON DELETE RESTRICT,
  CONSTRAINT ck_workout_set_side_nonnegative CHECK (weight_actual_kg IS NULL OR weight_actual_kg >= 0)
) ENGINE=InnoDB;
