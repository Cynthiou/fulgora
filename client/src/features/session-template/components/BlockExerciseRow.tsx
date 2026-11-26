import type { ReactNode } from "react";
import { type DraftExercise, formatSetSummary } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import Icon from "../../../components/Icon";
import RowMenu from "../../../components/RowMenu";

type Props = {
  exercise: DraftExercise;
  // Touching the line opens the planned sets (A7)
  onOpen: () => void;
  onRemove: () => void;
  // "Monter" and "Descendre" of the menu, when the move is possible (US-16)
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  // The grip of the sortable list
  handle: ReactNode;
  // The first row of the card carries no line above it
  isFirst: boolean;
};

// Screen A6: one exercise of a block, with the summary of its planned sets
// ("1 série · 10 rép. · 40 kg"). The grip moves it, the "⋯" moves it
// without dragging and removes it (US-16).
function BlockExerciseRow({
  exercise,
  onOpen,
  onRemove,
  onMoveUp,
  onMoveDown,
  handle,
  isFirst,
}: Props) {
  return (
    <div
      className={`flex min-h-[54px] items-center gap-1 pr-1 pl-0.5 ${
        isFirst ? "" : "border-t border-base-300"
      }`}
    >
      {handle}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">{exercise.name}</span>
          <span className="truncate text-xs font-medium leading-[1.45] text-muted">
            {formatSetSummary(exercise)}
          </span>
        </span>
        <Icon
          src={chevronRightIcon}
          className="size-[18px] shrink-0 text-faint"
        />
      </button>
      <RowMenu
        label={`Options de ${exercise.name}`}
        actions={[
          {
            label: "Monter",
            onClick: () => onMoveUp?.(),
            disabled: onMoveUp === null,
          },
          {
            label: "Descendre",
            onClick: () => onMoveDown?.(),
            disabled: onMoveDown === null,
          },
          { label: "Retirer", onClick: onRemove, isDanger: true },
        ]}
      />
    </div>
  );
}

export default BlockExerciseRow;
