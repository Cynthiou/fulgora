import type { DraftBlock } from "shared";
import BlockCard from "./BlockCard";

type Props = {
  blocks: DraftBlock[];
  onOpen: (key: string) => void;
  onRemove: (key: string) => void;
};

// Screen A8: the blocks of the draft, one card each. Reordering is US-16.
function SessionReview({ blocks, onOpen, onRemove }: Props) {
  return (
    <ul aria-label="Blocs de la séance" className="flex flex-col gap-2">
      {blocks.map((block, index) => (
        <BlockCard
          key={block.key}
          block={block}
          index={index}
          onOpen={() => onOpen(block.key)}
          onRemove={() => onRemove(block.key)}
        />
      ))}
    </ul>
  );
}

export default SessionReview;
