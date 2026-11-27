-- Handoff des séries (27/11/2026): on a per-side exercise, the number of
-- repetitions may differ from one side to the other, like the load does
-- since the 005 (US-51, D-02). "Gauche ≠ droite" offers the two apart.
ALTER TABLE planned_set
  ADD COLUMN reps_left INT UNSIGNED NULL AFTER reps,
  ADD COLUMN reps_right INT UNSIGNED NULL AFTER reps_left;

-- The copy made when the session starts carries the same plan (RM-041).
-- Like the 005 did for the load, only the plan is added here: what was
-- really done on each side already has its row in workout_set_side,
-- whose reps_actual holds the repetitions of that side (RM-044).
ALTER TABLE workout_set
  ADD COLUMN reps_left_planned INT UNSIGNED NULL AFTER reps_actual,
  ADD COLUMN reps_right_planned INT UNSIGNED NULL AFTER reps_left_planned;
