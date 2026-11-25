import { Link } from "react-router";
import {
  DIFFICULTY_LABELS,
  type ExerciseListItem,
  formatExerciseOrigin,
  getExerciseImage,
  type Sex,
} from "shared";
import eyeIcon from "../../../assets/icons/ui/app/eye.svg";
import HighlightedText from "../../../components/HighlightedText";
import Icon from "../../../components/Icon";
import ExerciseThumbnail from "./ExerciseThumbnail";

type Props = {
  exercise: ExerciseListItem;
  sex: Sex | null;
  searchTerm?: string;
  // 1-based position in the selection, null when not picked
  position: number | null;
  // How many are picked, for "1 sur 3"
  total: number;
  // True when the block is full: an unpicked card cannot be picked anymore
  isLimitReached: boolean;
  onToggle: () => void;
  // Navigation state for the detail, so it knows the selection is going on
  detailState: Record<string, unknown>;
};

// Screen 04-5 / A5: a card in selection mode. The card itself is a toggle
// button (aria-pressed): a picked card is ringed in blue and carries its
// order number, so the state never rests on colour alone. The eye of the
// right corner stays a link to the detail, over the button, even on a picked
// card: the fiche of the US-14 asks for it.
function SelectableExerciseCard({
  exercise,
  sex,
  searchTerm = "",
  position,
  total,
  isLimitReached,
  onToggle,
  detailState,
}: Props) {
  const image = getExerciseImage(exercise, sex);
  const isSelected = position !== null;

  return (
    <li className="relative">
      <button
        type="button"
        aria-pressed={isSelected}
        disabled={!isSelected && isLimitReached}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-card p-2 pr-12 text-left shadow-card disabled:opacity-60 ${
          isSelected
            ? "border-2 border-secondary bg-secondary/5"
            : "border border-base-300 bg-base-100"
        }`}
      >
        <ExerciseThumbnail src={image} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="w-full truncate pt-0.5 text-[14.5px] font-bold leading-[1.15]">
            <HighlightedText text={exercise.name} term={searchTerm} />
            <span className="sr-only">
              {isSelected
                ? `, sélectionné, ${position} sur ${total}`
                : ", non sélectionné"}
            </span>
          </span>
          <span className="w-full truncate text-xs font-medium leading-[1.45] text-muted">
            {formatExerciseOrigin(
              exercise.category_name,
              exercise.equipment_names,
            )}
          </span>
          {/* On a picked card the chip sits on the blue tint: it keeps a
              white ground, otherwise the grey word falls under 4.5:1. */}
          <span
            className={`rounded-chip px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-muted ${
              isSelected ? "bg-base-100" : "bg-neutral/[0.06]"
            }`}
          >
            {DIFFICULTY_LABELS[exercise.difficulty]}
          </span>
        </span>
        {isSelected && (
          <span
            aria-hidden="true"
            className="mr-1.5 grid size-[30px] shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-extrabold text-secondary-content"
          >
            {position}
          </span>
        )}
      </button>
      <Link
        to={`/catalogue/${exercise.id}`}
        state={{ name: exercise.name, ...detailState }}
        aria-label={`Fiche de ${exercise.name}`}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted"
      >
        <Icon src={eyeIcon} className="size-5" />
      </Link>
    </li>
  );
}

export default SelectableExerciseCard;
