import { Link } from "react-router";
import {
  formatSetProgress,
  formatSetSummary,
  getMeasureProfile,
  toPlannedValues,
  type WorkoutExerciseTree,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import Icon from "../../../components/Icon";

type Props = {
  sessionId: number;
  exercise: WorkoutExerciseTree;
};

// Screen B2: one exercise of the session in progress, with its progress
// ("1 / 3 séries") and the plan ("3 séries · 10 rép. · 40 kg"). The round
// mark on the left says where it stands: started (orange, ringed), done
// (green check) or still to do (empty circle). Touching it opens the
// exercise, set by set (B3).
function WorkoutExerciseRow({ sessionId, exercise }: Props) {
  const isCardio =
    getMeasureProfile(exercise.measure_codes, exercise.is_bodyweight) ===
    "cardio";
  const hasStarted = exercise.sets.some((set) => set.validated_at !== null);
  const isDone = exercise.sets.every((set) => set.validated_at !== null);
  const isRunning = hasStarted && !isDone;
  const planned = {
    measure_codes: exercise.measure_codes,
    is_bodyweight: exercise.is_bodyweight,
    sets: exercise.sets.map(toPlannedValues),
  };

  return (
    <li>
      <Link
        to={`/entrainement/${sessionId}/exercices/${exercise.id}`}
        className={`flex items-center gap-3 rounded-card bg-base-100 p-3 shadow-card ${
          isRunning ? "border-[1.5px] border-primary" : "border border-base-300"
        }`}
      >
        <span
          aria-hidden="true"
          className={`grid size-7 shrink-0 place-items-center rounded-full ${
            isRunning
              ? "bg-primary text-primary-content"
              : isDone
                ? "bg-status-done text-white"
                : "border-[1.5px] border-rule"
          }`}
        >
          {isRunning && <Icon src={playIcon} className="size-[11px]" />}
          {isDone && <Icon src={checkIcon} className="size-3.5" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">{exercise.name}</span>
          {/* Started: how far it has gone. Untouched: what is planned (B2). */}
          <span className="truncate text-xs font-medium leading-[1.45] text-muted">
            {hasStarted
              ? formatSetProgress(exercise, isCardio)
              : formatSetSummary(planned)}
          </span>
        </span>
        <Icon
          src={chevronRightIcon}
          className="size-[18px] shrink-0 text-faint"
        />
      </Link>
    </li>
  );
}

export default WorkoutExerciseRow;
