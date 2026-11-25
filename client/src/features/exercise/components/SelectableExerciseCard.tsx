import { Link } from "react-router";
import {
  type ExerciseListItem,
  formatExerciseMeta,
  getExerciseImage,
  type Sex,
} from "shared";
import eyeIcon from "../../../assets/icons/ui/fields/eye.svg";
import HighlightedText from "../../../components/HighlightedText";
import Icon from "../../../components/Icon";

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

// Screen 04 state 5 / A5: a card in selection mode. The card itself is a
// toggle button (aria-pressed): picked cards invert their colours and show
// their order number, so the state never rests on colour alone. The eye on the
// right stays a separate link to the detail.
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
    <li className="flex items-stretch gap-1">
      <button
        type="button"
        aria-pressed={isSelected}
        disabled={!isSelected && isLimitReached}
        onClick={onToggle}
        className={`flex min-h-24 min-w-0 flex-1 items-center gap-3 rounded-card border p-3 text-left shadow-card disabled:opacity-60 ${
          isSelected
            ? "border-neutral bg-neutral text-neutral-content"
            : "border-base-300 bg-base-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold ${
            isSelected
              ? "bg-primary text-primary-content"
              : "border border-base-300 text-muted"
          }`}
        >
          {position ?? ""}
        </span>
        {image === null ? (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-ctl bg-soft p-1 text-center text-overline text-muted">
            Illustration non disponible
          </span>
        ) : (
          <img
            src={image}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="size-14 shrink-0 rounded-ctl bg-soft object-cover"
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">
            <HighlightedText text={exercise.name} term={searchTerm} />
            <span className="sr-only">
              {isSelected
                ? `, sélectionné, ${position} sur ${total}`
                : ", non sélectionné"}
            </span>
          </span>
          <span
            className={`text-sm ${isSelected ? "text-neutral-content/80" : "text-muted"}`}
          >
            {formatExerciseMeta(exercise.category_name, exercise.difficulty)}
          </span>
          {exercise.equipment_names !== null && (
            <span
              className={`text-sm ${isSelected ? "text-neutral-content/80" : "text-muted"}`}
            >
              {exercise.equipment_names}
            </span>
          )}
        </span>
      </button>
      <Link
        to={`/catalogue/${exercise.id}`}
        state={{ name: exercise.name, ...detailState }}
        aria-label={`Fiche de ${exercise.name}`}
        className="flex w-14 shrink-0 flex-col items-center justify-center rounded-card border border-base-300 bg-base-100 text-secondary shadow-card"
      >
        <Icon src={eyeIcon} className="size-6" />
        <span aria-hidden="true" className="text-xs font-semibold">
          Fiche
        </span>
      </Link>
    </li>
  );
}

export default SelectableExerciseCard;
