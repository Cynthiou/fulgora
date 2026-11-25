import { type DraftExercise, formatSetSummary } from "shared";

type Props = {
  exercise: DraftExercise;
  onRemove: () => void;
};

// Screen A6: one exercise of a block, with the summary of its planned sets
// ("1 série · 10 rép. · 40 kg"). Touching the line to configure the sets is
// US-15; reordering with the handle is US-16.
function BlockExerciseRow({ exercise, onRemove }: Props) {
  return (
    <li className="flex items-stretch gap-2 rounded-card border border-base-300 bg-base-100 shadow-card">
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <span className="truncate font-semibold">{exercise.name}</span>
        <span className="text-sm text-muted">{formatSetSummary(exercise)}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${exercise.name}`}
        className="min-h-tap shrink-0 px-3 text-sm font-semibold text-secondary"
      >
        Retirer
      </button>
    </li>
  );
}

export default BlockExerciseRow;
