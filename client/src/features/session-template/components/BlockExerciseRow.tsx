import { type DraftExercise, formatSetSummary } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import gripIcon from "../../../assets/icons/ui/app/grip.svg";
import Icon from "../../../components/Icon";

type Props = {
  exercise: DraftExercise;
  // Touching the line opens the planned sets (A7)
  onOpen: () => void;
  onRemove: () => void;
  // The first row of the card carries no line above it
  isFirst: boolean;
};

// Screen A6: one exercise of a block, with the summary of its planned sets
// ("1 série · 10 rép. · 40 kg"). The grip announces the reordering of the
// US-16; "Retirer" is not in the mockup but the US-14 asks for it.
function BlockExerciseRow({ exercise, onOpen, onRemove, isFirst }: Props) {
  return (
    <li
      className={`flex min-h-[54px] items-center gap-2.5 pr-3 pl-1.5 ${
        isFirst ? "" : "border-t border-base-300"
      }`}
    >
      <Icon src={gripIcon} className="size-[18px] shrink-0 text-faint" />
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
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${exercise.name}`}
        className="shrink-0 px-1 py-3 text-xs font-semibold text-muted"
      >
        Retirer
      </button>
      <Icon
        src={chevronRightIcon}
        className="size-[18px] shrink-0 text-faint"
      />
    </li>
  );
}

export default BlockExerciseRow;
