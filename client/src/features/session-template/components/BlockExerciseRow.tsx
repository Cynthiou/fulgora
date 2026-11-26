import type { ReactNode } from "react";
import { type DraftExercise, formatExerciseSummary } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/v3/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  exercise: DraftExercise;
  // Touching the card opens the planned sets (step 4 of the handoff)
  onOpen: () => void;
  // The numbered badge of the handoff, which is also the grip (US-16)
  handle: ReactNode;
  // Timed block: this exercise has no objective yet (C4, US-43)
  missingGoal?: boolean;
};

// Screen 3.2: one exercise of the open block. Its number in a badge, its
// name, the one line of detail of the handoff, then the chevron that opens
// its sets. The badge is the grip: it moves the exercise with the finger or
// with the keyboard (US-16), without adding anything to the card.
function BlockExerciseRow({
  exercise,
  onOpen,
  handle,
  missingGoal = false,
}: Props) {
  return (
    <div className="flex items-center gap-3.5 rounded-[12px] border border-base-300 bg-base-100 p-3.5 shadow-card">
      {handle}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">
            {exercise.name}
          </span>
          <span
            className={`mt-0.5 truncate text-xs font-semibold tabular-nums ${
              missingGoal ? "text-status-missed-text" : "text-card-sub"
            }`}
          >
            {missingGoal
              ? "objectif à régler"
              : formatExerciseSummary(
                  exercise.sets,
                  exercise.measure_codes,
                  exercise.is_bodyweight,
                  exercise.is_per_side,
                )}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </button>
    </div>
  );
}

export default BlockExerciseRow;
