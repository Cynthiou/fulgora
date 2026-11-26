import type { DraftBlock } from "shared";
import { getBlockLabel } from "shared";
import SortableList from "../../../components/SortableList";
import BlockCard from "./BlockCard";

type Props = {
  blocks: DraftBlock[];
  onOpen: (key: string) => void;
  onRemove: (key: string) => void;
  // The order of the blocks of the session (US-16)
  onMove: (from: number, to: number) => void;
};

// Screen A8: the blocks of the draft, one card each, in the order they
// will be done. The grip and the "⋯" change that order (US-16).
function SessionReview({ blocks, onOpen, onRemove, onMove }: Props) {
  return (
    <SortableList
      label="Blocs de la séance"
      items={blocks.map((block, index) => ({
        id: block.key,
        label: getBlockLabel(block, index),
        content: null,
      }))}
      onMove={onMove}
      renderRow={(item, handle) => {
        const index = blocks.findIndex((block) => block.key === item.id);
        const block = blocks[index];
        if (block === undefined) {
          return null;
        }
        return (
          <BlockCard
            block={block}
            index={index}
            handle={handle}
            onOpen={() => onOpen(block.key)}
            onRemove={() => onRemove(block.key)}
            onMoveUp={index === 0 ? null : () => onMove(index, index - 1)}
            onMoveDown={
              index === blocks.length - 1
                ? null
                : () => onMove(index, index + 1)
            }
          />
        );
      }}
    />
  );
}

export default SessionReview;
