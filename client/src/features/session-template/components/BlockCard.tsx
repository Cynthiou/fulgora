import type { ReactNode } from "react";
import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  formatExerciseCountShort,
  getBlockLabel,
} from "shared";
import RowMenu from "../../../components/RowMenu";

type Props = {
  block: DraftBlock;
  index: number;
  onOpen: () => void;
  onRemove: () => void;
  // "Monter" and "Descendre" of the menu, when the move is possible (US-16)
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  // The grip of the sortable list
  handle: ReactNode;
};

// Screen A8: one block of the review. The type in bold, then the name of
// the block, the number of exercises on the right and their names
// underneath. The card opens the block; the grip and the "⋯" move it, and
// "Retirer" removes it (with an undo offered by the page).
function BlockCard({
  block,
  index,
  onOpen,
  onRemove,
  onMoveUp,
  onMoveDown,
  handle,
}: Props) {
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
    <div className="flex items-center gap-1 rounded-card border border-base-300 bg-base-100 py-2 pr-1 pl-0.5 shadow-card">
      {handle}
      {/* The whole sentence goes in the hidden text and the visible text is
          hidden from the reader: cut in pieces, the name came out glued
          ("Ouvrir le blocClassique"). */}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-1 py-1 text-left"
      >
        <span className="sr-only">{`Ouvrir le bloc ${label}`}</span>
        <span
          aria-hidden="true"
          className="flex items-baseline justify-between gap-2"
        >
          <span className="truncate text-sm">
            <b className="font-bold">{BLOCK_TYPE_LABELS[block.block_type]}</b>
            <span className="font-medium"> · {title}</span>
          </span>
          {block.block_type !== "note" && (
            <span className="shrink-0 text-xs font-medium text-muted">
              {formatExerciseCountShort(block.exercises.length)}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="line-clamp-2 text-xs font-medium leading-[1.45] text-muted"
        >
          {summary}
        </span>
      </button>
      <RowMenu
        label={`Options du bloc ${label}`}
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

export default BlockCard;
