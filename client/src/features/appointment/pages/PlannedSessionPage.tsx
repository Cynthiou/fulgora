import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  formatDayMonth,
  formatDayTime,
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
import { ApiError } from "../../../services/apiError";
import AlreadyInProgressDialog from "../../workout-session/components/AlreadyInProgressDialog";
import { useStartWorkout } from "../../workout-session/hooks/useStartWorkout";
import CancelAppointmentDialog from "../components/CancelAppointmentDialog";
import ConfirmPastSession from "../components/ConfirmPastSession";
import MoveAppointmentSheet from "../components/MoveAppointmentSheet";
import SessionActionsSheet from "../components/SessionActionsSheet";
import { useAppointment } from "../hooks/useAppointment";
import {
  cancelAppointment,
  markAppointmentNotDone,
  moveAppointment,
} from "../services/appointmentService";

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
  // The confirmation before giving up the session (CAL-07)
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingCancel, setIsSendingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // "Pas faite" (CAL-08)
  const [isSendingNotDone, setIsSendingNotDone] = useState(false);
  const [notDoneError, setNotDoneError] = useState<string | null>(null);
  const [justMissed, setJustMissed] = useState(false);
  // The move sheet (CAL-05)
  const [isMoving, setIsMoving] = useState(false);
  const [isSendingMove, setIsSendingMove] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
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

  // "Pas faite" of CAL-08: the session is missed right away (RM-067).
  async function confirmNotDone() {
    setIsSendingNotDone(true);
    setNotDoneError(null);
    try {
      await markAppointmentNotDone(id);
      setJustMissed(true);
      reload();
    } catch (caught) {
      setNotDoneError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'enregistrer. Réessaie.",
      );
    } finally {
      setIsSendingNotDone(false);
    }
  }

  // "Confirmer" of CAL-05: the session changes day (US-25).
  async function confirmMove(date: string, time: string | null) {
    setIsSendingMove(true);
    setMoveError(null);
    try {
      await moveAppointment(id, date, time);
      setIsMoving(false);
      reload();
    } catch (caught) {
      setMoveError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible de déplacer la séance. Réessaie.",
      );
    } finally {
      setIsSendingMove(false);
    }
  }

  // "Annuler la séance" of CAL-07: the appointment stays, as cancelled.
  async function confirmCancel() {
    setIsSendingCancel(true);
    setCancelError(null);
    try {
      await cancelAppointment(id);
      setIsCancelling(false);
      reload();
    } catch (caught) {
      setCancelError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'annuler la séance. Réessaie.",
      );
    } finally {
      setIsSendingCancel(false);
    }
  }

  const exerciseCount =
    appointment?.blocks.reduce(
      (total, block) => total + block.exercises.length,
      0,
    ) ?? 0;
  const workout = appointment?.workout_session ?? null;
  const isCancelled = appointment?.status === "cancelled";
  // A session not started yet can still be given up (RM-035).
  const canCancel =
    appointment !== null &&
    workout === null &&
    appointment.status !== "cancelled" &&
    appointment.status !== "attended";
  // A session done or cancelled never moves (RM-068).
  const canMove = canCancel;
  // A past session waiting for an answer (US-27, CAL-08)
  const needsConfirmation =
    appointment !== null && appointment.status === "to_confirm";

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
              <h2
                className={`text-display-md ${
                  isCancelled ? "text-muted line-through" : ""
                }`}
              >
                {appointment.session_name}
              </h2>
              {appointment.initial_date !== null && !isCancelled && (
                <p className="text-sm text-muted">
                  <span aria-hidden="true">↷ </span>
                  Prévue le {formatDayMonth(appointment.initial_date)} ·
                  déplacée au {formatDayMonth(appointment.planned_date)}
                </p>
              )}
              {isCancelled ? (
                // CAL-07c: what was planned, then when it was given up
                <>
                  <p className="text-muted">
                    Prévue{" "}
                    {formatLongDate(appointment.planned_date).toLocaleLowerCase(
                      "fr-FR",
                    )}
                    {appointment.planned_time === null
                      ? ""
                      : ` · ${appointment.planned_time}`}
                  </p>
                  {appointment.cancelled_at !== null && (
                    <p className="text-muted">
                      Annulée le {formatDayTime(appointment.cancelled_at)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted">
                  {formatLongDate(appointment.planned_date)}
                  {appointment.planned_time === null
                    ? ""
                    : ` · ${appointment.planned_time}`}{" "}
                  ·{" "}
                  {formatSessionContent(
                    appointment.blocks.length,
                    exerciseCount,
                  )}
                </p>
              )}
            </div>

            {justMissed && (
              // CAL-08c: what the answer did, and what is still possible
              <p
                role="status"
                className="flex gap-2 rounded-card border border-base-300 bg-soft p-3 font-semibold"
              >
                <span aria-hidden="true" className="text-status-done">
                  ✓
                </span>
                Séance marquée comme manquée. Tu pourras toujours la déclarer
                faite plus tard.
              </p>
            )}

            {needsConfirmation && (
              <ConfirmPastSession
                sessionName={appointment.session_name}
                plannedDate={appointment.planned_date}
                plannedTime={appointment.planned_time}
                programName={appointment.program_name}
                isSending={isSendingNotDone}
                error={notDoneError}
                onNotDone={confirmNotDone}
                onMove={() => {
                  setMoveError(null);
                  setIsMoving(true);
                }}
              />
            )}

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
            ) : needsConfirmation ? (
              // The answer is given in the card above (CAL-08)
              <p className="text-center font-semibold text-muted">
                Dis-nous si tu l'as faite.
              </p>
            ) : isCancelled ? (
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
                    <span aria-hidden="true">{"▶ "}</span>Démarrer la séance
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
          canEdit={canCancel}
          canCancel={canCancel}
          canMove={canMove}
          onMove={() => {
            setIsMenuOpen(false);
            setMoveError(null);
            setIsMoving(true);
          }}
          onCancel={() => {
            setIsMenuOpen(false);
            setCancelError(null);
            setIsCancelling(true);
          }}
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      {isMoving && appointment !== null && (
        <MoveAppointmentSheet
          sessionName={appointment.session_name}
          plannedDate={appointment.planned_date}
          plannedTime={appointment.planned_time}
          isSending={isSendingMove}
          error={moveError}
          onConfirm={confirmMove}
          onClose={() => setIsMoving(false)}
        />
      )}

      {isCancelling && appointment !== null && (
        <CancelAppointmentDialog
          sessionName={appointment.session_name}
          plannedDate={appointment.planned_date}
          plannedTime={appointment.planned_time}
          isSending={isSendingCancel}
          error={cancelError}
          onConfirm={confirmCancel}
          onClose={() => setIsCancelling(false)}
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
