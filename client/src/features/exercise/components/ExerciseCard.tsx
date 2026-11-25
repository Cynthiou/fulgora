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
  // The illustrations follow the profile (RM-014); null = not chosen yet.
  sex: Sex | null;
  // The searched term, written in bold in the name (US-08).
  searchTerm?: string;
};

// Screen 04-1: one exercise of the list. The whole card is the link to the
// detail (US-09); the eye on the right is a visual reminder of that.
function ExerciseCard({ exercise, sex, searchTerm = "" }: Props) {
  const image = getExerciseImage(exercise, sex);

  return (
    <li>
      <Link
        to={`/catalogue/${exercise.id}`}
        // The name travels along, so the detail header shows it while loading.
        state={{ name: exercise.name }}
        className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-2 shadow-card"
      >
        <ExerciseThumbnail src={image} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="w-full truncate pt-0.5 text-[14.5px] font-bold leading-[1.15]">
            <HighlightedText text={exercise.name} term={searchTerm} />
          </span>
          <span className="w-full truncate text-xs font-medium leading-[1.45] text-muted">
            {formatExerciseOrigin(
              exercise.category_name,
              exercise.equipment_names,
            )}
          </span>
          <span className="rounded-chip bg-neutral/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-muted">
            {DIFFICULTY_LABELS[exercise.difficulty]}
          </span>
          {exercise.is_personal && (
            <span className="text-overline uppercase text-accent">
              Exercice personnel
            </span>
          )}
        </span>
        <span className="grid size-10 shrink-0 place-items-center text-muted">
          <Icon src={eyeIcon} className="size-5" />
          <span className="sr-only">Voir la fiche</span>
        </span>
      </Link>
    </li>
  );
}

export default ExerciseCard;
