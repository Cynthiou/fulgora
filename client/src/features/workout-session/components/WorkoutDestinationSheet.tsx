import {
  formatSelectedCount,
  getBlockLabel,
  type SelectedExercise,
  type WorkoutBlockTree,
} from "shared";
import blockIcon from "../../../assets/icons/ui/app/block.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import BottomSheet from "../../../components/BottomSheet";
import SheetRow from "../../../components/SheetRow";

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
  const rows = blocks.filter((block) => block.block_type !== "note");

  return (
    <BottomSheet
      label="Où ajouter ces exercices"
      onClose={onCancel}
      closeLabel="Annuler"
    >
      <div className="flex flex-col gap-1">
        <h2 id="destination-title" className="text-[26px] leading-none">
          Où ajouter ces exercices ?
        </h2>
        <p className="text-sm leading-[1.45] text-muted">
          {formatSelectedCount(exercises.length)} ·{" "}
          {exercises.map((exercise) => exercise.name).join(" · ")}
        </p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
        {rows.map((block, index) => (
          <SheetRow
            key={block.id}
            isFirst={index === 0}
            icon={blockIcon}
            title={getBlockLabel(block, index)}
            disabled={isSending}
            onClick={() => onPick(block.id)}
          />
        ))}
        <SheetRow
          isFirst={rows.length === 0}
          icon={plusIcon}
          title="Dans un nouveau bloc"
          subtitle="À la fin de la séance"
          disabled={isSending}
          onClick={() => onPick(null)}
        />
      </div>
    </BottomSheet>
  );
}

export default WorkoutDestinationSheet;
