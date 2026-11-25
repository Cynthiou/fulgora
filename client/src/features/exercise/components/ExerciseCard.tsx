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
  // The illustrations follow the profile (RM-014); null = not chosen yet.
  sex: Sex | null;
  // The searched term, written in bold in the name (US-08).
  searchTerm?: string;
};

// Screen 04: one exercise of the list. The whole card is the link to the
// detail (US-09); the eye "Fiche" inside it is a visual reminder of that.
function ExerciseCard({ exercise, sex, searchTerm = "" }: Props) {
  const image = getExerciseImage(exercise, sex);

  return (
    <li>
      <Link
        to={`/catalogue/${exercise.id}`}
        // The name travels along, so the detail header shows it while loading.
        state={{ name: exercise.name }}
        className="flex min-h-24 items-center gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
      >
        {image === null ? (
          <span className="flex size-18 shrink-0 items-center justify-center rounded-ctl bg-soft p-1 text-center text-overline text-muted">
            Illustration non disponible
          </span>
        ) : (
          <img
            src={image}
            alt=""
            width={72}
            height={72}
            loading="lazy"
            className="size-18 shrink-0 rounded-ctl bg-white object-contain"
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">
            <HighlightedText text={exercise.name} term={searchTerm} />
          </span>
          <span className="text-sm text-muted">
            {formatExerciseMeta(exercise.category_name, exercise.difficulty)}
          </span>
          {exercise.equipment_names !== null && (
            <span className="text-sm text-muted">
              {exercise.equipment_names}
            </span>
          )}
          {exercise.is_personal && (
            <span className="text-overline uppercase text-accent">
              Exercice personnel
            </span>
          )}
        </span>
        <span className="flex flex-col items-center text-secondary">
          <Icon src={eyeIcon} className="size-6" />
          <span className="text-xs font-semibold">Fiche</span>
        </span>
      </Link>
    </li>
  );
}

export default ExerciseCard;
