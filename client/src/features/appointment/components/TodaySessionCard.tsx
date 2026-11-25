import { Link } from "react-router";
import {
  type AppointmentDetail,
  type AppointmentListItem,
  type CurrentWorkoutSession,
  formatSessionContent,
  formatTimeOfDay,
  getAppointmentStatus,
  isWorkoutOver,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import Icon from "../../../components/Icon";
import StatusChip from "../../../components/StatusChip";

type Props = {
  appointment: AppointmentListItem;
  // The blocks of the session, once loaded: the rows of the mockup (03-2)
  detail: AppointmentDetail | null;
  // The session in progress, if any (yours: this card, or another one).
  currentSession: CurrentWorkoutSession | null;
};

const ACTION =
  "flex h-btn items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";
const SECONDARY =
  "flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold";

// Screen 03-2: the card of the session of the day. Time and program on the
// first line, the name very large, what it holds, then its exercises and the
// one orange button of the screen. A session already done or given up never
// offers to start again (RM-038): it shows its status and its summary.
function TodaySessionCard({ appointment, detail, currentSession }: Props) {
  const isInProgress =
    currentSession !== null &&
    appointment.workout_session?.id === currentSession.id;
  const anotherIsInProgress = currentSession !== null && !isInProgress;
  const isOver = isWorkoutOver(appointment);
  const workout = appointment.workout_session;
  const exercises = (detail?.blocks ?? []).flatMap((block) => block.exercises);

  return (
    <article
      aria-label={appointment.session_name}
      className="overflow-hidden rounded-hero border border-base-300 bg-base-100 shadow-hero"
    >
      <div className="flex flex-col gap-2.5 p-4 pb-1.5">
        <div className="flex items-center justify-between gap-3">
          {isInProgress ? (
            <p className="rounded-chip bg-primary px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-primary-content">
              <span aria-hidden="true">● </span>En cours
            </p>
          ) : isOver ? (
            <StatusChip status={getAppointmentStatus(appointment)} />
          ) : (
            <p className="font-display text-display-sm">
              {appointment.planned_time ?? "Sans heure"}
            </p>
          )}
          {appointment.program !== null && (
            <p className="rounded-chip bg-neutral/[0.06] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]">
              {appointment.program.name}
            </p>
          )}
        </div>

        <div className="flex items-end gap-2">
          {/* A long name wraps instead of being cut (03-2). */}
          <h3 className="line-clamp-2 min-w-0 flex-1 text-display-xl">
            {appointment.session_name}
          </h3>
          <Link
            to={`/seances/${appointment.id}`}
            aria-label={`Voir le détail de ${appointment.session_name}`}
            className="flex size-tap shrink-0 items-center justify-center text-faint"
          >
            <Icon src={chevronRightIcon} className="size-[22px]" />
          </Link>
        </div>

        {isInProgress && currentSession !== null ? (
          <p className="text-[13px] text-muted">
            Commencée à {formatTimeOfDay(currentSession.started_at)} ·{" "}
            {currentSession.validated_sets} / {currentSession.planned_sets}{" "}
            séries
          </p>
        ) : isOver && workout !== null ? (
          <p className="text-[13px] text-muted">
            Commencée à {formatTimeOfDay(workout.started_at)} ·{" "}
            {workout.validated_sets} / {workout.planned_sets} séries
          </p>
        ) : (
          <p className="text-[13px] text-muted">
            {formatSessionContent(
              appointment.block_count,
              appointment.exercise_count,
            )}
          </p>
        )}

        {exercises.length > 0 && (
          <ul aria-label="Exercices de la séance">
            {exercises.map((exercise, index) => (
              <li
                key={exercise.id}
                className="flex h-11 items-center gap-3 border-t border-base-300"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[30px] shrink-0 place-items-center rounded-ctl bg-neutral/[0.06] text-[11px] font-extrabold text-muted"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {exercise.name}
                </span>
                {exercise.set_summary !== null && (
                  <span className="shrink-0 text-[13px] text-muted">
                    {exercise.set_summary}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 pb-4 pt-2.5">
        {isInProgress && currentSession !== null ? (
          <Link to={`/entrainement/${currentSession.id}`} className={ACTION}>
            Reprendre ma séance
          </Link>
        ) : isOver ? (
          <Link
            to={`/suivi/historique/${appointment.id}`}
            className={SECONDARY}
          >
            Voir le résumé
          </Link>
        ) : anotherIsInProgress ? (
          // One session at a time (RM-040): no start while another one runs.
          <p className="text-center font-semibold text-muted">
            Une séance est en cours
          </p>
        ) : appointment.exercise_count === 0 ? (
          // A session without any exercise cannot start (RM-018).
          <Link to={`/seances/${appointment.id}/modifier`} className={ACTION}>
            Ajouter des exercices
          </Link>
        ) : (
          <Link to={`/seances/${appointment.id}`} className={ACTION}>
            <Icon src={playIcon} className="size-[15px]" />
            Démarrer la séance
          </Link>
        )}
      </div>
    </article>
  );
}

export default TodaySessionCard;
