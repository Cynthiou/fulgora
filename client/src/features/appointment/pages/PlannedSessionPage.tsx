import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  type CurrentWorkoutSession,
  formatLongDate,
  formatSessionContent,
  getBlockLabel,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import StatusBadge from "../../../components/StatusBadge";
import { ApiError } from "../../../services/apiError";
import AlreadyInProgressDialog from "../../workout-session/components/AlreadyInProgressDialog";
import {
  readCurrentWorkoutSession,
  startWorkoutSession,
} from "../../workout-session/services/workoutSessionService";
import { useAppointment } from "../hooks/useAppointment";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60";

// Screen B1: a planned session, read-only, with "Démarrer la séance". Starting
// copies the plan on the server and opens the session in progress (B2).
function PlannedSessionPage() {
  const params = useParams();
  const id = Number(params.appointmentId);
  const navigate = useNavigate();
  const location = useLocation();
  const { appointment, isLoading, notFound, error, reload } =
    useAppointment(id);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState<CurrentWorkoutSession | null>(
    null,
  );
  // Read at the very instant of a second tap: one start, never two.
  const inFlight = useRef(false);

  function goBack() {
    if (location.key === "default") {
      navigate("/");
    } else {
      navigate(-1);
    }
  }

  async function start() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setIsStarting(true);
    setStartError(null);
    try {
      const started = await startWorkoutSession(id);
      navigate(`/entrainement/${started.id}`, { replace: true });
    } catch (caught) {
      // The true state first: the session may have started anyway, or
      // another one may be running (RM-040).
      const current = await readCurrentWorkoutSession().catch(() => null);
      if (current !== null && current.appointment_id === id) {
        navigate(`/entrainement/${current.id}`, { replace: true });
        return;
      }
      if (
        caught instanceof ApiError &&
        caught.code === "WORKOUT_ALREADY_IN_PROGRESS" &&
        current !== null
      ) {
        setInProgress(current);
      } else {
        setStartError(
          caught instanceof ApiError && caught.status === 422
            ? caught.message
            : "Impossible de démarrer la séance.",
        );
      }
    } finally {
      inFlight.current = false;
      setIsStarting(false);
    }
  }

  const exerciseCount =
    appointment?.blocks.reduce(
      (total, block) => total + block.exercises.length,
      0,
    ) ?? 0;
  const workout = appointment?.workout_session ?? null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="text-display-sm">Séance</h1>
          {appointment !== null && (
            <p className="truncate text-sm text-muted">
              {formatLongDate(appointment.planned_date)}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pb-28">
        {isLoading && <LoadingState label="Chargement de la séance…" />}

        {!isLoading && notFound && (
          <EmptyState
            title="Séance introuvable"
            message="Elle n'existe pas, ou elle ne t'appartient pas."
          >
            <Link to="/planning" className={PRIMARY_BUTTON}>
              Voir le planning
            </Link>
          </EmptyState>
        )}

        {!isLoading && !notFound && error !== null && (
          <ErrorState
            title="Impossible de charger la séance"
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={reload}
          />
        )}

        {!isLoading && appointment !== null && error === null && !notFound && (
          <>
            <div className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  status={
                    appointment.status === "attended" ? "completed" : "planned"
                  }
                />
                {appointment.program_name !== null && (
                  <span className="text-overline uppercase text-accent">
                    {appointment.program_name}
                  </span>
                )}
              </div>
              <h2 className="text-display-md">{appointment.session_name}</h2>
              <p className="text-muted">
                {formatLongDate(appointment.planned_date)}
                {appointment.planned_time === null
                  ? ""
                  : ` · ${appointment.planned_time}`}{" "}
                ·{" "}
                {formatSessionContent(appointment.blocks.length, exerciseCount)}
              </p>
            </div>

            <section
              aria-labelledby="blocks-title"
              className="flex flex-col gap-3"
            >
              <h2
                id="blocks-title"
                className="font-sans text-overline not-italic uppercase text-accent"
              >
                Blocs
              </h2>
              {appointment.blocks.length === 0 ? (
                <p className="text-muted">
                  Cette séance n'a pas encore de bloc.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {appointment.blocks.map((block, index) => (
                    <li
                      key={block.id}
                      className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                    >
                      <span className="font-semibold">
                        {getBlockLabel(block, index)}
                      </span>
                      <span className="text-sm text-muted">
                        {block.exercises.length === 0
                          ? "Aucun exercice"
                          : block.exercises
                              .map((exercise) => exercise.name)
                              .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {startError !== null && (
              <ErrorState title={startError} onRetry={start} />
            )}
          </>
        )}
      </div>

      {!isLoading && appointment !== null && error === null && !notFound && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {workout !== null && workout.status === "in_progress" ? (
              <Link
                to={`/entrainement/${workout.id}`}
                className={PRIMARY_BUTTON}
              >
                Reprendre ma séance
              </Link>
            ) : workout !== null || appointment.status === "cancelled" ? (
              <p className="text-center font-semibold text-muted">
                {appointment.status === "cancelled"
                  ? "Ce rendez-vous est annulé."
                  : "Cette séance a été faite."}
              </p>
            ) : exerciseCount === 0 ? (
              <>
                {/* A session without any exercise cannot start (RM-018);
                    changing a saved session is US-17. */}
                <button
                  type="button"
                  disabled
                  aria-describedby="add-exercises-later"
                  className={PRIMARY_BUTTON}
                >
                  Ajouter des exercices
                </button>
                <p
                  id="add-exercises-later"
                  className="text-center text-sm text-muted"
                >
                  Modifier une séance enregistrée arrive bientôt.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={isStarting}
                className={PRIMARY_BUTTON}
              >
                {isStarting ? (
                  "Démarrage…"
                ) : (
                  <>
                    <span aria-hidden="true">▶ </span>Démarrer la séance
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {inProgress !== null && (
        <AlreadyInProgressDialog
          current={inProgress}
          onClose={() => setInProgress(null)}
        />
      )}
    </div>
  );
}

export default PlannedSessionPage;
