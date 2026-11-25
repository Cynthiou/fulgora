import {
  type DraftBlock,
  formatExerciseCountShort,
  getBlockLabel,
} from "shared";

type Props = {
  block: DraftBlock;
  index: number;
  onOpen: () => void;
  onRemove: () => void;
};

// Screen A8: one block of the review. The card opens the block; "Retirer"
// removes it (with an undo offered by the page).
function BlockCard({ block, index, onOpen, onRemove }: Props) {
  const label = getBlockLabel(block, index);
  const summary =
    block.block_type === "note"
      ? block.instructions?.trim() || "Note vide"
      : block.exercises.length === 0
        ? formatExerciseCountShort(0)
        : block.exercises.map((exercise) => exercise.name).join(" · ");

  return (
    <li className="flex items-stretch gap-2 rounded-card border border-base-300 bg-base-100 shadow-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir le bloc ${label}`}
        className="flex min-w-0 flex-1 flex-col gap-1 p-4 text-left"
      >
        <span className="font-semibold">{label}</span>
        <span className="line-clamp-2 text-sm text-muted">{summary}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer le bloc ${label}`}
        className="min-h-tap shrink-0 px-3 text-sm font-semibold text-secondary"
      >
        Retirer
      </button>
    </li>
  );
}

export default BlockCard;
