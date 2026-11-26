-- RM-084: "Chaque côté" is offered only for the exercises that can really be
-- done one side at a time. The list was chosen from the instructions of each
-- exercise, not from its name (decision of 26/11/2026): an exercise done with
-- a dumbbell in each hand (rowing, kickback) or alternated at every rep and
-- counted in total (bird dog, mountain climbers) is not on it.
-- The setting chosen in a session (template_block_exercise.is_per_side) is
-- untouched: older sessions keep their left / right results.
ALTER TABLE exercise
  ADD COLUMN allows_per_side BOOLEAN NOT NULL DEFAULT FALSE AFTER muscle_map_female_url;

-- The catalog already in the database (seeded before this migration).
UPDATE exercise
   SET allows_per_side = TRUE
 WHERE owner_user_id IS NULL
   AND slug IN (
  'alternating-dumbbell-biceps-curl',
  'concentration-curl',
  'cable-lateral-raises',
  'dumbbell-lunges',
  'bulgarian-split-squat',
  'step-up',
  'assisted-pistol-squat',
  'cable-hip-abduction',
  'cable-glute-kickback',
  'side-plank',
  'side-plank-rotation',
  'cable-woodchopper',
  'pallof-press',
  'farmers-walk',
  'hip-flexor-stretch',
  'figure-4-stretch',
  'supine-hamstring-stretch',
  'hip-90-90',
  'calf-stretch-wall',
  'ankle-dorsiflexion-wall',
  'low-lunge-rotation',
  'quadruped-thoracic-rotation',
  'open-book-stretch',
  'doorway-chest-stretch'
   );
