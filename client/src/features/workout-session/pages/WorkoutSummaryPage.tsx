import { Link, Navigate, useLocation, useParams } from "react-router";
import {
  computeDurationSeconds,
  computeTonnage,
  countAddedSets,
  countPlannedSets,
  countValidatedSets,
  formatAddedSets,
  formatBlockResult,
  formatExerciseResult,
  formatLongDate,
  formatSummaryDuration,
  formatTonnage,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import AutoClosedNotice from "../components/AutoClosedNotice";
import { useWorkoutSession } from "../hooks/useWorkoutSession";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

// Screen B6: the summary of a finished session (completed or unfinished).
// Everything is computed from the results (RM-051): duration, sets done,
// kilograms moved, and one line per exercise.
function WorkoutSummaryPage() {
  const params = useParams();
  const id = Number(params.id);
  const { session, isLoading, notFound, error, reload } = useWorkoutSession(id);
  const location = useLocation();
  // "Résultats corrigés.", handed over by the correction (US-37)
  const flash = (location.state as { flash?: string } | null)?.flash ?? null;

  if (session !== null && session.status === "in_progress") {
    // Still running: the summary is not for now.
    return <Navigate to={`/entrainement/${id}`} replace />;
  }

  const sets = session?.blocks.flatMap((block) =>
    block.exercises.flatMap((exercise) => exercise.sets),
  );
  const exercises = session?.blocks.flatMap((block) => block.exercises) ?? [];
  // "AMRAP · 5 tours + 8 rép.", one line per timed block that ran (US-31)
  const blockResults = (session?.blocks ?? [])
    .map((block) => ({ id: block.id, text: formatBlockResult(block) }))
    .filter(
      (result): result is { id: number; text: string } => result.text !== null,
    );
  const startDate = session?.started_at.slice(0, 10) ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      {session !== null && !isLoading && (
        <PageHeader
          title="Résumé"
          subtitle={`${session.session_name} · ${
            formatLongDate(startDate).charAt(0).toLowerCase() +
            formatLongDate(startDate).slice(1)
          }`}
        />
      )}
      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-28">
        {flash !== null && (
          <p
            role="status"
            className="rounded-card bg-pick px-4 py-3.5 text-sm font-semibold text-pick-content shadow-hero"
          >
            {flash}
          </p>
        )}
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
            {/* "✓ Terminée" then the congratulation of the mockup (B6). */}
            <div className="flex flex-col items-start gap-2">
              {/* The session says "Terminée", where an appointment says
                  "Effectuée": the chip is written here (B6). */}
              <span
                className={`rounded-chip px-2 py-[3px] text-[11px] font-bold ${
                  session.status === "completed"
                    ? "bg-status-done/10 text-status-done-text"
                    : "bg-status-pending/10 text-status-pending-text"
                }`}
              >
                {session.status === "completed" ? "✓ Terminée" : "Inachevée"}
              </span>
              {/* Written after the fact, not lived in the app (US-38) */}
              {session.declared_afterwards && (
                <span className="rounded-chip bg-neutral/[0.06] px-2 py-[3px] text-[11px] font-bold text-muted">
                  Déclarée après coup
                </span>
              )}
              <p className="font-display text-display-lg font-extrabold uppercase italic">
                {session.status === "completed"
                  ? "Bien joué"
                  : "Séance arrêtée"}
              </p>
            </div>

            {session.auto_closed && <AutoClosedNotice />}

            <dl className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "duree",
                  value: formatSummaryDuration(
                    computeDurationSeconds(
                      session.started_at,
                      session.ended_at,
                    ),
                  ),
                  label: "durée",
                },
                {
                  key: "series",
                  value: `${countValidatedSets(session)} / ${countPlannedSets(
                    session,
                  )}`,
                  label: "séries",
                },
                {
                  key: "volume",
                  value: formatTonnage(computeTonnage(sets ?? [])),
                  label: "volume",
                },
              ].map((figure) => (
                <div
                  key={figure.key}
                  className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
                >
                  <dd className="font-display text-display-sm">
                    {figure.value}
                  </dd>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    {figure.label}
                  </dt>
                </div>
              ))}
            </dl>

            {/* Sets added during the session are counted apart (US-32). */}
            {countAddedSets(session) > 0 && (
              <p className="text-xs text-muted">
                Dont {formatAddedSets(countAddedSets(session))}.
              </p>
            )}

            {/* The totals of the timed blocks (US-31, D-06). */}
            {blockResults.length > 0 && (
              <ul
                aria-label="Blocs chronométrés"
                className="flex flex-col rounded-card border border-base-300 bg-base-100 px-4 py-1.5 shadow-card"
              >
                {blockResults.map((result, index) => (
                  <li
                    key={result.id}
                    className={`py-2.5 text-sm font-semibold ${
                      index === 0 ? "" : "border-t border-base-300"
                    }`}
                  >
                    {result.text}
                  </li>
                ))}
              </ul>
            )}

            <ul
              aria-label="Exercices"
              className="flex flex-col rounded-card border border-base-300 bg-base-100 px-4 py-1.5 shadow-card"
            >
              {exercises.map((exercise, index) => {
                const allDone = exercise.sets.every(
                  (set) => set.validated_at !== null,
                );
                return (
                  <li
                    key={exercise.id}
                    className={`flex items-start gap-2.5 py-2.5 ${
                      index === 0 ? "" : "border-t border-base-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-[22px] shrink-0 place-items-center rounded-full ${
                        allDone
                          ? "bg-status-done text-white"
                          : "bg-status-pending/10 text-status-pending-text"
                      }`}
                    >
                      {allDone ? (
                        <Icon src={checkIcon} className="size-3" />
                      ) : (
                        "–"
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-bold">
                        {exercise.name}
                        <span className="sr-only">
                          {allDone ? ", faite" : ", incomplète"}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-medium leading-[1.45] ${
                          allDone ? "text-muted" : "text-status-pending-text"
                        }`}
                      >
                        {formatExerciseResult(exercise)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {!isLoading && session !== null && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto grid max-w-md grid-cols-[1fr_1.3fr] gap-2.5">
            {/* The same screens as the session, in correction mode. */}
            <Link
              to={`/entrainement/${id}?correction=1`}
              state={{ from: `/entrainement/${id}/resume` }}
              className="flex h-btn items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
            >
              <Icon src={pencilIcon} className="size-4" />
              <span className="sr-only">Corriger les résultats</span>
              <span aria-hidden="true">Corriger</span>
            </Link>
            <Link to="/planning" className={PRIMARY_LINK}>
              <span className="sr-only">Retour au planning</span>
              <span aria-hidden="true">Planning</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutSummaryPage;
