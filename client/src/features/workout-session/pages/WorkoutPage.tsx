import { Link, useParams } from "react-router";
import { countPlannedSets, countValidatedSets, getBlockLabel } from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import WorkoutExerciseRow from "../components/WorkoutExerciseRow";
import { useSessionChrono } from "../hooks/useSessionChrono";
import { useWorkoutSession } from "../hooks/useWorkoutSession";

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
// order. Validating a set (US-29), the rest timer (US-30), giving up (US-33)
// and finishing (US-34) come next.
function WorkoutPage() {
  const params = useParams();
  const id = Number(params.id);
  const { session, isLoading, notFound, error, reload } = useWorkoutSession(id);
  const chrono = useSessionChrono(session?.started_at ?? null);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 pb-32">
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
            <header className="flex flex-col gap-1">
              <h1 className="text-display-md">{session.session_name}</h1>
              <div className="flex items-center justify-between gap-3">
                <p className="text-overline uppercase text-primary">
                  {session.status === "in_progress" ? "En cours" : "Terminée"} ·{" "}
                  {session.program_name ?? "séance libre"}
                </p>
                {chrono !== null && session.status === "in_progress" && (
                  <p className="font-display text-display-sm text-primary">
                    <span className="sr-only">Durée de la séance </span>
                    <span aria-hidden="true">● </span>
                    {chrono}
                  </p>
                )}
              </div>
            </header>

            <div className="flex items-center justify-between rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
              <span className="font-semibold">Séries réalisées</span>
              <span className="font-display text-display-sm">
                {countValidatedSets(session)} / {countPlannedSets(session)}
              </span>
            </div>

            {session.blocks.map((block, index) => (
              <section
                key={block.id}
                aria-labelledby={`block-${block.id}`}
                className="flex flex-col gap-3"
              >
                <h2
                  id={`block-${block.id}`}
                  className="font-sans text-overline not-italic uppercase text-accent"
                >
                  {getBlockLabel(block, index)}
                </h2>
                {block.block_type === "note" ? (
                  <p className="rounded-card border border-base-300 bg-base-100 p-4 text-muted shadow-card">
                    {block.instructions ?? "Note vide"}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {block.exercises.map((exercise) => (
                      <WorkoutExerciseRow
                        key={exercise.id}
                        sessionId={session.id}
                        exercise={exercise}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </>
        )}
      </div>

      {!isLoading && session !== null && session.status === "in_progress" && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto flex max-w-md gap-3">
            {/* Giving up (US-33) and finishing (US-34) arrive next. */}
            <button
              type="button"
              disabled
              aria-describedby="end-later"
              className="h-btn flex-1 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
            >
              Abandonner
            </button>
            <button
              type="button"
              disabled
              aria-describedby="end-later"
              className="h-btn flex-1 rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
            >
              Terminer la séance
            </button>
          </div>
          <p id="end-later" className="sr-only">
            Disponible à l'étape suivante.
          </p>
        </div>
      )}
    </div>
  );
}

export default WorkoutPage;
