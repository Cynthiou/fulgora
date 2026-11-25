import { type DraftExercise, formatSetSummary } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  exercise: DraftExercise;
  // Touching the line opens the planned sets (A7)
  onOpen: () => void;
  onRemove: () => void;
};

// Screen A6: one exercise of a block, with the summary of its planned sets
// ("1 série · 10 rép. · 40 kg"). Reordering with the handle is US-16.
function BlockExerciseRow({ exercise, onOpen, onRemove }: Props) {
  return (
    <li className="flex items-stretch gap-2 rounded-card border border-base-300 bg-base-100 shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 p-4 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{exercise.name}</span>
          <span className="text-sm text-muted">
            {formatSetSummary(exercise)}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </button>
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
