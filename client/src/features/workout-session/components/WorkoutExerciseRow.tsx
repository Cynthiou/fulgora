import {
  formatSetProgress,
  formatSetSummary,
  getMeasureProfile,
  toPlannedValues,
  type WorkoutExerciseTree,
} from "shared";

type Props = {
  exercise: WorkoutExerciseTree;
};

// Screen B2: one exercise of the session in progress, with its progress
// ("1 / 3 séries") and the plan ("3 séries · 10 rép. · 40 kg"). Opening it
// to validate a set is US-29.
function WorkoutExerciseRow({ exercise }: Props) {
  const isCardio = getMeasureProfile(exercise.measure_codes) === "cardio";
  const planned = {
    measure_codes: exercise.measure_codes,
    sets: exercise.sets.map(toPlannedValues),
  };

  return (
    <li className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
      <span className="font-semibold">{exercise.name}</span>
      <span className="text-sm font-semibold text-secondary">
        {formatSetProgress(exercise, isCardio)}
      </span>
      <span className="text-sm text-muted">{formatSetSummary(planned)}</span>
    </li>
  );
}

export default WorkoutExerciseRow;
