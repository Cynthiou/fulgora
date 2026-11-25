import { Link } from "react-router";
import {
  formatSetProgress,
  formatSetSummary,
  getMeasureProfile,
  toPlannedValues,
  type WorkoutExerciseTree,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  sessionId: number;
  exercise: WorkoutExerciseTree;
};

// Screen B2: one exercise of the session in progress, with its progress
// ("1 / 3 séries") and the plan ("3 séries · 10 rép. · 40 kg"). Touching it
// opens the exercise, set by set (B3).
function WorkoutExerciseRow({ sessionId, exercise }: Props) {
  const isCardio = getMeasureProfile(exercise.measure_codes) === "cardio";
  const planned = {
    measure_codes: exercise.measure_codes,
    sets: exercise.sets.map(toPlannedValues),
  };

  return (
    <li>
      <Link
        to={`/entrainement/${sessionId}/exercices/${exercise.id}`}
        className="flex items-center gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-semibold">{exercise.name}</span>
          <span className="text-sm font-semibold text-secondary">
            {formatSetProgress(exercise, isCardio)}
          </span>
          <span className="text-sm text-muted">
            {formatSetSummary(planned)}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export default WorkoutExerciseRow;
