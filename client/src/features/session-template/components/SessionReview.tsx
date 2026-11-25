import {
  type DraftBlock,
  formatExerciseCountShort,
  getBlockLabel,
} from "shared";

type Props = {
  blocks: DraftBlock[];
  onRemove: (key: string) => void;
};

// Screen A8: the blocks of the draft, one card each, with their exercises.
// Opening a block (US-13) and reordering (US-16) come later.
function SessionReview({ blocks, onRemove }: Props) {
  return (
    <ul aria-label="Blocs de la séance" className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        const label = getBlockLabel(block, index);
        return (
          <li
            key={block.key}
            className="flex items-start justify-between gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted">
                {block.exercises.length === 0
                  ? formatExerciseCountShort(0)
                  : block.exercises
                      .map((exercise) => exercise.name)
                      .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(block.key)}
              aria-label={`Retirer le bloc ${label}`}
              className="min-h-tap shrink-0 px-2 text-sm font-semibold text-status-missed"
            >
              Retirer
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default SessionReview;
