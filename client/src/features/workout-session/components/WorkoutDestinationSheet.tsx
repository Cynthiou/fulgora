import { useEffect, useRef } from "react";
import {
  formatSelectedCount,
  getBlockLabel,
  type SelectedExercise,
  type WorkoutBlockTree,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  exercises: SelectedExercise[];
  blocks: WorkoutBlockTree[];
  isSending: boolean;
  error: string | null;
  // null means "a new block at the end of the session"
  onPick: (blockId: number | null) => void;
  onCancel: () => void;
};

// Screen B2, after the catalog: where do the chosen exercises go? At the end
// of a block of the session, or in a new block (US-32). A Note block takes
// no exercise (RM-020), so it is not offered.
function WorkoutDestinationSheet({
  exercises,
  blocks,
  isSending,
  error,
  onPick,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    const opener = document.activeElement;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  const rows = blocks.filter((block) => block.block_type !== "note");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="destination-title"
      onClose={onCancel}
      className="mt-auto mb-0 w-full max-w-md rounded-t-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex justify-center pb-3">
        <span
          aria-hidden="true"
          className="h-1 w-10 rounded-full bg-base-300"
        />
      </div>

      <h2 id="destination-title" className="text-display-sm">
        Où ajouter ces exercices ?
      </h2>
      <p className="mt-1 text-sm text-muted">
        {formatSelectedCount(exercises.length)} ·{" "}
        {exercises.map((exercise) => exercise.name).join(" · ")}
      </p>

      {error !== null && (
        <p role="alert" className="mt-2 font-semibold">
          {error}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((block, index) => (
          <li key={block.id}>
            <button
              type="button"
              disabled={isSending}
              onClick={() => onPick(block.id)}
              className="flex w-full items-center gap-2 rounded-card border border-base-300 p-3 text-left disabled:opacity-60"
            >
              <span className="min-w-0 flex-1 font-semibold">
                {getBlockLabel(block, index)}
              </span>
              <Icon
                src={chevronRightIcon}
                className="size-5 shrink-0 text-muted"
              />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            disabled={isSending}
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-2 rounded-card border border-base-300 p-3 text-left disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 flex-col">
              <span className="block font-semibold">Dans un nouveau bloc</span>
              <span className="block text-sm text-muted">
                À la fin de la séance
              </span>
            </span>
            <Icon
              src={chevronRightIcon}
              className="size-5 shrink-0 text-muted"
            />
          </button>
        </li>
      </ul>

      <button
        type="button"
        onClick={onCancel}
        disabled={isSending}
        className="mt-4 flex h-btn w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
      >
        Annuler
      </button>
    </dialog>
  );
}

export default WorkoutDestinationSheet;
