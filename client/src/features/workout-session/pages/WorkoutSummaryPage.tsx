import { Link, Navigate, useParams } from "react-router";
import {
  computeDurationSeconds,
  computeTonnage,
  countPlannedSets,
  countValidatedSets,
  formatExerciseResult,
  formatLongDate,
  formatSummaryDuration,
  formatTonnage,
} from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import AutoClosedNotice from "../components/AutoClosedNotice";
import { useWorkoutSession } from "../hooks/useWorkoutSession";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// Screen B6: the summary of a finished session (completed or unfinished).
// Everything is computed from the results (RM-051): duration, sets done,
// kilograms moved, and one line per exercise.
function WorkoutSummaryPage() {
  const params = useParams();
  const id = Number(params.id);
  const { session, isLoading, notFound, error, reload } = useWorkoutSession(id);

  if (session !== null && session.status === "in_progress") {
    // Still running: the summary is not for now.
    return <Navigate to={`/entrainement/${id}`} replace />;
  }

  const sets = session?.blocks.flatMap((block) =>
    block.exercises.flatMap((exercise) => exercise.sets),
  );
  const exercises = session?.blocks.flatMap((block) => block.exercises) ?? [];
  const startDate = session?.started_at.slice(0, 10) ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4 pb-28">
      {isLoading && <LoadingState label="Chargement du résumé…" />}

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
          title="Impossible de charger le résumé"
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={reload}
        />
      )}

      {!isLoading && session !== null && error === null && !notFound && (
        <>
          <header className="flex flex-col gap-1">
            <p className="text-overline uppercase text-accent">Résumé</p>
            <h1 className="text-display-md">{session.session_name}</h1>
            <p className="text-muted">
              {formatLongDate(startDate).charAt(0).toLowerCase() +
                formatLongDate(startDate).slice(1)}
            </p>
            <p className="text-overline uppercase text-base-content">
              {session.status === "completed" ? (
                <>
                  <span aria-hidden="true" className="text-status-done">
                    ✓{" "}
                  </span>
                  Terminée
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-status-pending">
                    ◧{" "}
                  </span>
                  Inachevée
                </>
              )}
            </p>
          </header>

          {session.auto_closed && <AutoClosedNotice />}

          <dl className="grid grid-cols-3 gap-2 rounded-card border border-base-300 bg-base-100 p-4 text-center shadow-card">
            <div className="flex flex-col">
              <dd className="font-display text-display-sm">
                {formatSummaryDuration(
                  computeDurationSeconds(session.started_at, session.ended_at),
                )}
              </dd>
              <dt className="text-sm text-muted">durée</dt>
            </div>
            <div className="flex flex-col">
              <dd className="font-display text-display-sm">
                {countValidatedSets(session)} / {countPlannedSets(session)}
              </dd>
              <dt className="text-sm text-muted">séries</dt>
            </div>
            <div className="flex flex-col">
              <dd className="font-display text-display-sm">
                {formatTonnage(computeTonnage(sets ?? []))}
              </dd>
              <dt className="text-sm text-muted">volume</dt>
            </div>
          </dl>

          <ul aria-label="Exercices" className="flex flex-col gap-2">
            {exercises.map((exercise) => {
              const allDone = exercise.sets.every(
                (set) => set.validated_at !== null,
              );
              return (
                <li
                  key={exercise.id}
                  className="flex items-start gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                >
                  <span
                    aria-hidden="true"
                    className={`font-bold ${allDone ? "text-status-done" : "text-muted"}`}
                  >
                    {allDone ? "✓" : "–"}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">
                      {exercise.name}
                      <span className="sr-only">
                        {allDone ? ", faite" : ", incomplète"}
                      </span>
                    </span>
                    <span className="text-sm text-muted">
                      {formatExerciseResult(exercise)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!isLoading && session !== null && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto max-w-md">
            {/* "Corriger les résultats" arrives with US-37. */}
            <Link to="/planning" className={PRIMARY_LINK}>
              Retour au planning
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutSummaryPage;
