import { Link, useLocation, useNavigate, useParams } from "react-router";
import { formatExerciseMeta, getExerciseImage } from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../hooks/useAuth";
import ExerciseTextList from "../components/ExerciseTextList";
import MeasureList from "../components/MeasureList";
import MuscleMap from "../components/MuscleMap";
import { useExercise } from "../hooks/useExercise";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// Grey blocks while the detail loads; the name is already known from the list.
function DetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Chargement de la fiche</span>
      <div className="h-56 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-6 w-2/3 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
    </div>
  );
}

// Screen 05: the detail of an exercise, with a fixed header (back arrow and
// name) and a fixed "Ajouter à une séance" button at the bottom.
function ExerciseDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { exercise, isLoading, notFound, error, reload } = useExercise(id);

  // The name travels with the navigation from the list (state), so the
  // header can show it before the detail arrives.
  const state = location.state as { name?: string } | null;
  const title = exercise?.name ?? state?.name ?? "Exercice";

  // Back to the catalog as it was (address and position). Arriving straight
  // on this address leaves no page to go back to: the catalog then.
  function goBack() {
    if (location.key === "default") {
      navigate("/catalogue");
    } else {
      navigate(-1);
    }
  }

  const image =
    exercise === null ? null : getExerciseImage(exercise, user?.sex ?? null);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Retour au catalogue"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <h1 className="truncate text-display-sm">{title}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pb-28">
        {isLoading && <DetailSkeleton />}

        {!isLoading && notFound && (
          <EmptyState
            title="Exercice introuvable"
            message="Il n'existe pas, ou il ne t'appartient pas."
          >
            <Link to="/catalogue" className={PRIMARY_BUTTON}>
              Retour au catalogue
            </Link>
          </EmptyState>
        )}

        {!isLoading && !notFound && error !== null && (
          <ErrorState
            title="Impossible de charger la fiche"
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={reload}
          />
        )}

        {!isLoading && exercise !== null && error === null && !notFound && (
          <>
            {image === null ? (
              <div
                role="img"
                aria-label={`${exercise.name}, illustration non disponible`}
                className="flex h-56 items-center justify-center rounded-card bg-soft text-center font-semibold text-muted"
              >
                Illustration non disponible
              </div>
            ) : (
              <img
                src={image}
                alt=""
                className="h-56 w-full rounded-card bg-soft object-cover"
              />
            )}

            <div className="flex flex-col gap-1">
              {exercise.is_personal && (
                <p className="text-overline uppercase text-accent">
                  Exercice personnel
                </p>
              )}
              <h2 className="text-display-md">{exercise.name}</h2>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
              <dt className="text-overline uppercase text-accent">Groupe</dt>
              <dd className="font-semibold">
                {exercise.categories.join(" · ") || "Non renseigné"}
              </dd>
              <dt className="text-overline uppercase text-accent">
                Difficulté
              </dt>
              <dd className="font-semibold">
                {formatExerciseMeta(null, exercise.difficulty)}
              </dd>
              <dt className="text-overline uppercase text-accent">Matériel</dt>
              <dd className="font-semibold">
                {exercise.equipments.join(" · ") || "Aucun"}
              </dd>
            </dl>

            <section
              aria-labelledby="section-muscles"
              className="flex flex-col gap-3"
            >
              <h2 id="section-muscles" className="text-display-sm">
                Muscles sollicités
              </h2>
              <MuscleMap exercise={exercise} sex={user?.sex ?? null} />
            </section>

            <ExerciseTextList
              title="Instructions"
              items={exercise.instructions}
              ordered
            />
            <ExerciseTextList
              title="Erreurs à éviter"
              items={exercise.mistakes}
              marker="×"
            />
            <ExerciseTextList
              title="Exercices alternatifs"
              items={exercise.alternatives}
            />
            <MeasureList measures={exercise.measures} />
          </>
        )}
      </div>

      {!notFound && error === null && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto max-w-md">
            {isLoading ? (
              <button
                type="button"
                disabled
                className={`${PRIMARY_BUTTON} opacity-60`}
              >
                Ajouter à une séance
              </button>
            ) : (
              <Link
                to="/seances/nouvelle"
                state={{ exerciseIds: [id] }}
                className={PRIMARY_BUTTON}
              >
                Ajouter à une séance
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExerciseDetailPage;
