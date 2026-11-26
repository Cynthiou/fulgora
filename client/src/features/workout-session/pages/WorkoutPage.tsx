import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import {
  type BlockResultInput,
  countPlannedSets,
  countValidatedSets,
  getBlockLabel,
  isTimedBlock,
  type SelectedExercise,
} from "shared";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import StatusChip from "../../../components/StatusChip";
import { ApiError } from "../../../services/apiError";
import AbandonWorkoutDialog from "../components/AbandonWorkoutDialog";
import AutoClosedNotice from "../components/AutoClosedNotice";
import BlockTimer from "../components/BlockTimer";
import CompleteWorkoutDialog from "../components/CompleteWorkoutDialog";
import WorkoutDestinationSheet from "../components/WorkoutDestinationSheet";
import WorkoutExerciseRow from "../components/WorkoutExerciseRow";
import { useSessionChrono } from "../hooks/useSessionChrono";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import {
  clearPendingWorkoutExercises,
  readPendingWorkoutExercises,
} from "../services/workoutAddStorage";
import {
  abandonWorkoutSession,
  addWorkoutBlock,
  addWorkoutExercises,
  completeWorkoutSession,
  readWorkoutSession,
  saveBlockResult,
} from "../services/workoutSessionService";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// Grey blocks while the tree loads; the chrono waits for the start time.
function WorkoutSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Chargement de la séance</span>
      <div className="h-8 w-2/3 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      <div className="h-16 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
    </div>
  );
}

// Screen B2: the session in progress, its chrono and its exercises, in any
// order. Over (abandoned, closed after 4 hours, finished), the same screen
// shows the sets read-only with its status. Finishing (US-34) comes next.
function WorkoutPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // "?correction=1": the same screens, on a session already over (US-37)
  const isCorrecting = searchParams.get("correction") === "1";
  // Where "Enregistrer les corrections" goes back to
  const backTo =
    (location.state as { from?: string } | null)?.from ??
    `/entrainement/${id}/resume`;
  const { session, isLoading, notFound, error, reload, replaceSession } =
    useWorkoutSession(id);
  // The timed block being saved, and what went wrong (US-31)
  const [savingBlockId, setSavingBlockId] = useState<number | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const isInProgress = session?.status === "in_progress";
  const chrono = useSessionChrono(isInProgress ? session.started_at : null);
  const [isConfirmingAbandon, setIsConfirmingAbandon] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  // "Aucune série n'est faite" (D-10): the way out is to abandon
  const [cannotComplete, setCannotComplete] = useState<string | null>(null);
  const inFlight = useRef(false);
  // The exercises chosen in the catalog, waiting for their place (US-32)
  const [pending, setPending] = useState<SelectedExercise[] | null>(null);
  // Something was added during this correction (US-37)
  const [hasAdded, setHasAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Coming back from the catalog: the chosen exercises are taken once, and
  // the session asks where they go.
  useEffect(() => {
    const waiting = readPendingWorkoutExercises();
    if (waiting !== null && waiting.workoutSessionId === id) {
      setPending(waiting.exercises);
    }
    clearPendingWorkoutExercises();
  }, [id]);

  // A timed block already holds a result: its card shows it (US-31).
  function hasResult(block: {
    completed_rounds: number | null;
    actual_duration_seconds: number | null;
  }): boolean {
    return (
      block.completed_rounds !== null || block.actual_duration_seconds !== null
    );
  }

  // "Terminer le bloc": the total of the block goes to the server (D-06).
  async function finishBlock(blockId: number, result: BlockResultInput) {
    if (savingBlockId !== null) {
      return;
    }
    setSavingBlockId(blockId);
    setBlockError(null);
    try {
      await saveBlockResult(blockId, result);
      reload();
    } catch (caught) {
      setBlockError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'enregistrer ce bloc. Réessaie.",
      );
    } finally {
      setSavingBlockId(null);
    }
  }

  // The destination sheet: an existing block, or a new one at the end.
  async function addToDestination(blockId: number | null) {
    if (pending === null || isAdding) {
      return;
    }
    setIsAdding(true);
    setAddError(null);
    const ids = pending.map((exercise) => exercise.exercise_id);
    try {
      if (blockId === null) {
        await addWorkoutBlock(id, null, ids);
      } else {
        await addWorkoutExercises(blockId, ids);
      }
      setPending(null);
      setHasAdded(true);
      reload();
    } catch (caught) {
      setAddError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'ajouter ces exercices. Réessaie.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  // "Enregistrer les corrections" stays grey until something changed: a
  // set carrying a correction date, or something added in this visit.
  const hasCorrection =
    hasAdded ||
    (session?.blocks.some((block) =>
      block.exercises.some((exercise) =>
        exercise.sets.some((set) => set.updated_at !== null),
      ),
    ) ??
      false);

  function openSummary() {
    navigate(`/entrainement/${id}/resume`, { replace: true });
  }

  // "Terminer la séance": completed, the undone sets stay empty (RM-046),
  // then the summary (B6). A 409 loads the true state back.
  async function complete() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setIsConfirmingEnd(false);
    setIsEnding(true);
    setEndError(null);
    setCannotComplete(null);
    try {
      replaceSession(await completeWorkoutSession(id));
      openSummary();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setCannotComplete(caught.message);
      } else if (caught instanceof ApiError && caught.status === 409) {
        const latest = await readWorkoutSession(id).catch(() => null);
        if (latest !== null) {
          replaceSession(latest);
          openSummary();
        }
      } else {
        setEndError("Impossible de terminer la séance. Réessaie.");
      }
    } finally {
      inFlight.current = false;
      setIsEnding(false);
    }
  }

  // "Abandonner": over for good, validated sets kept (RM-045). On failure,
  // the true state is loaded back (already over: shown as such).
  async function abandon() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setIsConfirmingAbandon(false);
    setIsEnding(true);
    setEndError(null);
    setCannotComplete(null);
    try {
      replaceSession(await abandonWorkoutSession(id));
      openSummary();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        const latest = await readWorkoutSession(id).catch(() => null);
        if (latest !== null) {
          replaceSession(latest);
          openSummary();
        }
      } else {
        setEndError("Impossible d'abandonner la séance. Réessaie.");
      }
    } finally {
      inFlight.current = false;
      setIsEnding(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <div className="flex flex-1 flex-col gap-2 px-[18px] pt-1.5 pb-32">
        {isLoading && <WorkoutSkeleton />}

        {!isLoading && notFound && (
          <EmptyState
            title="Séance introuvable"
            message="Elle n'existe pas, ou elle ne t'appartient pas."
          >
            <Link to="/" className={PRIMARY_LINK}>
              Retour à l'accueil
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

        {!isLoading && session !== null && error === null && !notFound && (
          <>
            {/* The name, what the session is doing, and the chrono in
                its dark pill (B2). */}
            <header className="flex items-center gap-2.5 pb-1.5">
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <h1 className="truncate text-[26px] leading-none">
                  {session.session_name}
                </h1>
                {isInProgress ? (
                  <p className="truncate text-xs font-semibold leading-[1.45] text-action-text">
                    En cours · {session.program_name ?? "séance libre"}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <StatusChip
                      status={
                        session.status === "completed"
                          ? "completed"
                          : "unfinished"
                      }
                    />
                    {session.program_name ?? "séance libre"}
                  </p>
                )}
              </span>
              {chrono !== null && isInProgress && (
                <p className="flex h-[34px] shrink-0 items-center gap-2 rounded-full bg-pick px-3 text-sm font-extrabold text-pick-content">
                  <span className="sr-only">Durée de la séance </span>
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-primary"
                  />
                  {chrono}
                </p>
              )}
            </header>

            {session.auto_closed && <AutoClosedNotice />}

            {isCorrecting && (
              <div className="flex flex-col gap-1 rounded-card border border-secondary bg-secondary/10 px-4 py-3">
                <p className="font-sans text-overline uppercase not-italic text-secondary">
                  Correction
                </p>
                <p className="text-sm leading-[1.45]">
                  Les objectifs prévus ne changent pas.
                </p>
              </div>
            )}

            {endError !== null && (
              <ErrorState
                title={endError}
                onRetry={
                  endError.startsWith("Impossible d'abandonner")
                    ? abandon
                    : complete
                }
              />
            )}

            {pending !== null && session !== null && (
              <WorkoutDestinationSheet
                exercises={pending}
                blocks={session.blocks}
                isSending={isAdding}
                error={addError}
                onPick={addToDestination}
                onCancel={() => setPending(null)}
              />
            )}

            {cannotComplete !== null && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-card border border-status-pending bg-base-100 p-4"
              >
                <p className="font-semibold">{cannotComplete}</p>
                <button
                  type="button"
                  onClick={() => setIsConfirmingAbandon(true)}
                  className="h-13 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
                >
                  Abandonner
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-overline uppercase text-muted">
                  Séries réalisées
                </span>
                <span className="text-[13px] font-extrabold">
                  {countValidatedSets(session)} / {countPlannedSets(session)}
                </span>
              </div>
              {/* How far the session has gone (B2) */}
              <div
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-chip bg-track"
              >
                <div
                  className="h-full rounded-chip bg-secondary"
                  style={{
                    width: `${
                      countPlannedSets(session) === 0
                        ? 0
                        : Math.round(
                            (countValidatedSets(session) /
                              countPlannedSets(session)) *
                              100,
                          )
                    }%`,
                  }}
                />
              </div>
            </div>

            {session.blocks.map((block, index) => (
              <section
                key={block.id}
                aria-labelledby={`block-${block.id}`}
                className="flex flex-col gap-2 pt-1"
              >
                <h2
                  id={`block-${block.id}`}
                  className="font-sans text-overline not-italic uppercase text-accent"
                >
                  {getBlockLabel(block, index)}
                </h2>
                {/* A timed block is launched by hand and saved as one
                    total (US-31, RM-042). */}
                {isTimedBlock(block.block_type) &&
                  (isInProgress || hasResult(block)) && (
                    <BlockTimer
                      block={block}
                      isPending={savingBlockId === block.id}
                      error={savingBlockId === block.id ? blockError : null}
                      onSave={(result) => void finishBlock(block.id, result)}
                    />
                  )}
                {block.block_type === "note" ? (
                  <p className="rounded-card border border-base-300 bg-base-100 p-4 text-sm leading-[1.45] text-muted shadow-card">
                    {block.instructions ?? "Note vide"}
                  </p>
                ) : (
                  <ul
                    aria-label="Exercices du bloc"
                    className="flex flex-col gap-2"
                  >
                    {block.exercises.map((exercise) => (
                      <WorkoutExerciseRow
                        key={exercise.id}
                        sessionId={session.id}
                        exercise={exercise}
                        isCorrecting={isCorrecting}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {(isInProgress || isCorrecting) && (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to={`/entrainement/${id}/exercices`}
                  className="flex h-13 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-dash text-sm font-bold text-secondary"
                >
                  <Icon src={plusIcon} className="size-[18px]" />
                  Ajouter un exercice ou un bloc
                </Link>
                <p className="text-xs text-muted">
                  Une série en plus s'ajoute depuis l'exercice.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {!isLoading && session !== null && !isInProgress && !isCorrecting && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto max-w-md">
            <Link
              to={`/entrainement/${id}/resume`}
              className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
            >
              Voir le résumé
            </Link>
          </div>
        </div>
      )}

      {/* Every correction is written set by set: this button only closes
          the correction and says so (US-37). */}
      {!isLoading && session !== null && isCorrecting && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto grid max-w-md grid-cols-[1fr_1.6fr] gap-2.5">
            <Link
              to={backTo}
              className="flex h-btn items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
            >
              Annuler
            </Link>
            <button
              type="button"
              disabled={!hasCorrection}
              onClick={() =>
                navigate(backTo, {
                  replace: true,
                  state: { flash: "Résultats corrigés." },
                })
              }
              className="flex h-btn items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
            >
              Enregistrer les corrections
            </button>
          </div>
        </div>
      )}

      {isConfirmingEnd && session !== null && (
        <CompleteWorkoutDialog
          missingCount={countPlannedSets(session) - countValidatedSets(session)}
          onConfirm={complete}
          onCancel={() => setIsConfirmingEnd(false)}
        />
      )}

      {isConfirmingAbandon && (
        <AbandonWorkoutDialog
          onConfirm={abandon}
          onCancel={() => setIsConfirmingAbandon(false)}
        />
      )}

      {!isLoading && session !== null && isInProgress && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto grid max-w-md grid-cols-[1fr_1.6fr] gap-2.5">
            <button
              type="button"
              onClick={() => setIsConfirmingAbandon(true)}
              disabled={isEnding}
              className="h-btn rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
            >
              Abandonner
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingEnd(true)}
              disabled={isEnding}
              className="h-btn rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
            >
              {isEnding ? "Un instant…" : "Terminer la séance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutPage;
