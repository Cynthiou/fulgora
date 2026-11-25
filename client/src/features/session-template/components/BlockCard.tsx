import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  formatExerciseCountShort,
  getBlockLabel,
} from "shared";
import gripIcon from "../../../assets/icons/ui/app/grip.svg";
import Icon from "../../../components/Icon";

type Props = {
  block: DraftBlock;
  index: number;
  onOpen: () => void;
  onRemove: () => void;
};

// Screen A8: one block of the review. The type in bold, then the name of the
// block, the number of exercises on the right and their names underneath.
// The card opens the block; "Retirer" removes it (with an undo offered by
// the page), which the mockup does not draw but the US-23 asks for.
function BlockCard({ block, index, onOpen, onRemove }: Props) {
  const label = getBlockLabel(block, index);
  const title =
    block.name !== null && block.name.trim() !== ""
      ? block.name.trim()
      : `Bloc ${index + 1}`;
  const summary =
    block.block_type === "note"
      ? block.instructions?.trim() || "Note vide"
      : block.exercises.length === 0
        ? formatExerciseCountShort(0)
        : block.exercises.map((exercise) => exercise.name).join(" · ");

  return (
    <li className="flex items-center gap-2.5 rounded-card border border-base-300 bg-base-100 py-3 pr-3 pl-2.5 shadow-card">
      <Icon src={gripIcon} className="size-[18px] shrink-0 text-faint" />
      {/* The button is named by what it shows, the hidden words only add the
          action: an aria-label that drops the visible text fails axe. */}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm">
            <span className="sr-only">Ouvrir le bloc </span>
            <b className="font-bold">{BLOCK_TYPE_LABELS[block.block_type]}</b>
            <span className="font-medium"> · {title}</span>
          </span>
          {block.block_type !== "note" && (
            <span className="shrink-0 text-xs font-medium text-muted">
              {formatExerciseCountShort(block.exercises.length)}
            </span>
          )}
        </span>
        <span className="line-clamp-2 text-xs font-medium leading-[1.45] text-muted">
          {summary}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer le bloc ${label}`}
        className="shrink-0 px-1 py-3 text-xs font-semibold text-muted"
      >
        Retirer
      </button>
    </li>
  );
}

export default BlockCard;
