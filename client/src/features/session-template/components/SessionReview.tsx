import type { DraftBlock } from "shared";
import BlockCard from "./BlockCard";

type Props = {
  blocks: DraftBlock[];
  // Opens one block on its own screen (3.2)
  onEdit: (key: string) => void;
  onDuplicate: (key: string) => void;
  onRemove: (key: string) => void;
  onRemoveExercise: (blockKey: string, exerciseKey: string) => void;
  // The order of the blocks of the session (US-16)
  onMove: (from: number, to: number) => void;
};

// Screen 3.1: the blocks of the draft, one card each, in the order they
// will be done. The handoff draws no grip on a block: the "⋯" menu of the
// card changes that order with "Monter" and "Descendre" (US-16).
function SessionReview({
  blocks,
  onEdit,
  onDuplicate,
  onRemove,
  onRemoveExercise,
  onMove,
}: Props) {
  return (
    <ul aria-label="Blocs de la séance" className="flex flex-col">
      {blocks.map((block, index) => (
        <li key={block.key}>
          <BlockCard
            block={block}
            index={index}
            onEdit={() => onEdit(block.key)}
            onDuplicate={() => onDuplicate(block.key)}
            onRemove={() => onRemove(block.key)}
            onRemoveExercise={(exerciseKey) =>
              onRemoveExercise(block.key, exerciseKey)
            }
            onMoveUp={index === 0 ? null : () => onMove(index, index - 1)}
            onMoveDown={
              index === blocks.length - 1
                ? null
                : () => onMove(index, index + 1)
            }
          />
        </li>
      ))}
    </ul>
  );
}

export default SessionReview;
