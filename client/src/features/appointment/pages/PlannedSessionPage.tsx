import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  formatLongDate,
  formatSessionContent,
  getAppointmentStatus,
  getBlockLabel,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import StatusBadge from "../../../components/StatusBadge";
import AlreadyInProgressDialog from "../../workout-session/components/AlreadyInProgressDialog";
import { useStartWorkout } from "../../workout-session/hooks/useStartWorkout";
import SessionActionsSheet from "../components/SessionActionsSheet";
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
  const workoutStart = useStartWorkout();
  // The "⋯" menu of the header (CAL-04m)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // "Séance modifiée.", handed over by the editor
  const flash = (location.state as { flash?: string } | null)?.flash ?? null;
  function goBack() {
    if (location.key === "default") {
      navigate("/");
    } else {
      navigate(-1);
    }
  }

  function start() {
    workoutStart.start(id);
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
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-display-sm">Séance</h1>
          {appointment !== null && (
            <p className="truncate text-sm text-muted">
              {formatLongDate(appointment.planned_date)}
            </p>
          )}
        </div>
        {appointment !== null && (
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-haspopup="dialog"
            aria-label="Actions de la séance"
            className="flex size-tap items-center justify-center rounded-btn text-secondary"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ⋯
            </span>
          </button>
        )}
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
            {flash !== null && (
              <p
                role="status"
                className="flex gap-2 rounded-card border border-base-300 bg-soft p-3 font-semibold"
              >
                <span aria-hidden="true" className="text-status-done">
                  ✓
                </span>
                {flash}
              </p>
            )}

            <div className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  status={getAppointmentStatus({
                    status: appointment.status,
                    workout_session:
                      appointment.workout_session === null
                        ? null
                        : {
                            ...appointment.workout_session,
                            started_at: "",
                            validated_sets: 0,
                            planned_sets: 0,
                          },
                  })}
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

            {workoutStart.error !== null && (
              <ErrorState title={workoutStart.error} onRetry={start} />
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
            ) : workout !== null ? (
              // Done or given up: it never starts again (RM-038)
              <Link
                to={`/suivi/historique/${appointment.id}`}
                className="flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold"
              >
                Voir le résumé
              </Link>
            ) : appointment.status === "cancelled" ? (
              <p className="text-center font-semibold text-muted">
                Ce rendez-vous est annulé.
              </p>
            ) : exerciseCount === 0 ? (
              // A session without any exercise cannot start (RM-018): the
              // editor is the way out (US-17).
              <Link
                to={`/seances/${appointment.id}/modifier`}
                className={PRIMARY_BUTTON}
              >
                Ajouter des exercices
              </Link>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={workoutStart.isStarting}
                className={PRIMARY_BUTTON}
              >
                {workoutStart.isStarting ? (
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

      {isMenuOpen && appointment !== null && (
        <SessionActionsSheet
          appointmentId={appointment.id}
          canEdit={
            appointment.workout_session === null &&
            appointment.status !== "cancelled" &&
            appointment.status !== "attended"
          }
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      {workoutStart.inProgress !== null && (
        <AlreadyInProgressDialog
          current={workoutStart.inProgress}
          onClose={workoutStart.closeInProgress}
        />
      )}
    </div>
  );
}

export default PlannedSessionPage;
