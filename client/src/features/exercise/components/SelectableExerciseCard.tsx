import { Link } from "react-router";
import {
  DIFFICULTY_LABELS,
  type ExerciseListItem,
  formatExerciseOrigin,
  getExerciseImage,
  type Sex,
} from "shared";
import eyeIcon from "../../../assets/icons/ui/app/eye.svg";
import checkIcon from "../../../assets/icons/ui/v3/check.svg";
import v3EyeIcon from "../../../assets/icons/ui/v3/eye.svg";
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
  // "form": the card of the catalog in selection for a block (handoff 2.3)
  variant?: "page" | "form";
};

// Screen 2.3 / 04-5: a card in selection mode. The card itself is a toggle
// button (aria-pressed): a picked card is ringed in blue and carries a
// check, so the state never rests on colour alone. The eye of the right
// corner stays a link to the detail, over the button: the fiche of the
// US-14 asks for it. On a picked card the eye gives its place to the
// check, and the detail is then reached from the fiche of the exercise.
function SelectableExerciseCard({
  exercise,
  sex,
  searchTerm = "",
  position,
  total,
  isLimitReached,
  onToggle,
  detailState,
  variant = "page",
}: Props) {
  const image = getExerciseImage(exercise, sex);
  const isSelected = position !== null;
  const isForm = variant === "form";
  // The order of the selection is kept for the screen reader: the handoff
  // does not write it anymore, but it is what the block will follow.
  const state = isSelected
    ? `, sélectionné, ${position} sur ${total}`
    : ", non sélectionné";

  if (isForm) {
    return (
      <li className="relative">
        <button
          type="button"
          aria-pressed={isSelected}
          disabled={!isSelected && isLimitReached}
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-[12px] border py-[7px] pr-11 pl-[7px] text-left disabled:opacity-60 ${
            isSelected
              ? "border-brand bg-selected shadow-selected"
              : "border-base-300 bg-base-100 shadow-card"
          }`}
        >
          <ExerciseThumbnail src={image} variant="form" />
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="w-full truncate text-sm font-extrabold">
              <HighlightedText text={exercise.name} term={searchTerm} />
              <span className="sr-only">{state}</span>
            </span>
            <span className="mt-0.5 mb-1 w-full truncate text-[11px] font-semibold text-card-sub">
              {formatExerciseOrigin(
                exercise.category_name,
                exercise.equipment_names,
              )}
            </span>
            <span className="rounded-[4px] bg-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted">
              {DIFFICULTY_LABELS[exercise.difficulty]}
            </span>
          </span>
        </button>
        {isSelected ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 grid size-[26px] -translate-y-1/2 place-items-center rounded-full bg-brand text-primary-content"
          >
            <Icon src={checkIcon} className="size-[14px]" />
          </span>
        ) : (
          <Link
            to={`/catalogue/${exercise.id}`}
            state={{ name: exercise.name, ...detailState }}
            aria-label={`Fiche de ${exercise.name}`}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted"
          >
            <Icon src={v3EyeIcon} className="size-[18px]" />
          </Link>
        )}
      </li>
    );
  }

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
            <span className="sr-only">{state}</span>
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
