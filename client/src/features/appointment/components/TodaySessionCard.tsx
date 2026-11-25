import { Link } from "react-router";
import {
  type AppointmentListItem,
  type CurrentWorkoutSession,
  formatSessionContent,
  formatTimeOfDay,
  getAppointmentStatus,
  isWorkoutOver,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";
import StatusBadge from "../../../components/StatusBadge";

type Props = {
  appointment: AppointmentListItem;
  // The session in progress, if any (yours: this card, or another one).
  currentSession: CurrentWorkoutSession | null;
};

const PRIMARY_LINK =
  "flex h-btn items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";
const SECONDARY_LINK =
  "flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold";

// Screen 03: the card of the selected session of the day. Time and program on
// the first line, the name in big, what it holds, then the main action.
// A session already done or given up never offers to start again (RM-038):
// it shows its status and the way to its summary.
function TodaySessionCard({ appointment, currentSession }: Props) {
  const isInProgress =
    currentSession !== null &&
    appointment.workout_session?.id === currentSession.id;
  const anotherIsInProgress = currentSession !== null && !isInProgress;
  const isOver = isWorkoutOver(appointment);
  const workout = appointment.workout_session;

  return (
    <article
      aria-label={appointment.session_name}
      className={`flex flex-col gap-3 rounded-card border border-base-300 p-4 shadow-card ${
        isInProgress ? "bg-soft" : "bg-base-100"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {isInProgress ? (
          <p className="rounded-chip bg-primary px-2 py-1 text-overline uppercase text-primary-content">
            <span aria-hidden="true">● </span>En cours
          </p>
        ) : isOver ? (
          <StatusBadge status={getAppointmentStatus(appointment)} />
        ) : (
          <p className="font-display text-display-sm">
            {appointment.planned_time ?? "Sans heure"}
          </p>
        )}
        {appointment.program !== null && (
          <p className="rounded-chip border border-base-300 px-2 py-1 text-overline uppercase text-accent">
            {appointment.program.name}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-display-md">
          {appointment.session_name}
        </h3>
        <Link
          to={`/seances/${appointment.id}`}
          aria-label={`Voir le détail de ${appointment.session_name}`}
          className="flex size-tap shrink-0 items-center justify-center text-muted"
        >
          <Icon src={chevronRightIcon} className="size-6" />
        </Link>
      </div>

      {isInProgress && currentSession !== null ? (
        <p className="text-muted">
          Commencée à {formatTimeOfDay(currentSession.started_at)} ·{" "}
          {currentSession.validated_sets} / {currentSession.planned_sets} séries
        </p>
      ) : isOver && workout !== null ? (
        <p className="text-muted">
          Commencée à {formatTimeOfDay(workout.started_at)} ·{" "}
          {workout.validated_sets} / {workout.planned_sets} séries
        </p>
      ) : (
        <p className="text-muted">
          {formatSessionContent(
            appointment.block_count,
            appointment.exercise_count,
          )}
        </p>
      )}

      {isInProgress && currentSession !== null ? (
        <Link
          to={`/entrainement/${currentSession.id}`}
          className={PRIMARY_LINK}
        >
          Reprendre ma séance
        </Link>
      ) : isOver ? (
        <Link
          to={`/suivi/historique/${appointment.id}`}
          className={SECONDARY_LINK}
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
        <Link to={`/seances/${appointment.id}`} className={PRIMARY_LINK}>
          Ajouter des exercices
        </Link>
      ) : (
        <Link to={`/seances/${appointment.id}`} className={PRIMARY_LINK}>
          <span aria-hidden="true">▶ </span>Démarrer la séance
        </Link>
      )}
    </article>
  );
}

export default TodaySessionCard;
