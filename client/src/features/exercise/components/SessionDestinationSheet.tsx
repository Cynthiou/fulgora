import { formatExerciseCountShort, type SelectedExercise } from "shared";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import BottomSheet from "../../../components/BottomSheet";
import SheetRow from "../../../components/SheetRow";

type Props = {
  exercises: SelectedExercise[];
  onContinue: () => void;
  onCancel: () => void;
};

// Screen 04-5b: where the chosen exercises go. Only a new free session for
// now; adding them to a session already planned arrives with US-17.
function SessionDestinationSheet({ exercises, onContinue, onCancel }: Props) {
  return (
    <BottomSheet
      label="Où ajouter les exercices"
      onClose={onCancel}
      closeLabel="Annuler"
    >
      <div className="flex flex-col gap-1">
        <h2 id="destination-title" className="text-[26px] leading-none">
          Ajouter {formatExerciseCountShort(exercises.length)}
        </h2>
        <p className="text-sm leading-[1.45] text-muted">
          {exercises.map((exercise) => exercise.name).join(", ")}
        </p>
      </div>

      <p className="font-sans text-overline uppercase not-italic text-accent">
        Où les ajouter ?
      </p>
      <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
        <SheetRow
          isFirst
          icon={plusIcon}
          title="Nouvelle séance libre"
          subtitle="Choisis une date, puis tes blocs"
          onClick={onContinue}
        />
      </div>
    </BottomSheet>
  );
}

export default SessionDestinationSheet;
