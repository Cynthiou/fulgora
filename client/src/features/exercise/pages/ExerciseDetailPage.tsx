import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  DIFFICULTY_LABELS,
  getExerciseImage,
  type SelectedExercise,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/app/chevron-left.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../hooks/useAuth";
import ExerciseTextList from "../components/ExerciseTextList";
import MeasureList from "../components/MeasureList";
import MuscleMap from "../components/MuscleMap";
import SessionDestinationSheet from "../components/SessionDestinationSheet";
import { useExercise } from "../hooks/useExercise";
import {
  appendToSelection,
  readSelection,
} from "../hooks/useExerciseSelection";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

// Grey blocks while the detail loads; the name is already known from the list.
function DetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Chargement de la fiche</span>
      <div className="h-[210px] w-full animate-pulse rounded-hero bg-soft motion-reduce:animate-none" />
      <div className="h-10 w-2/3 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
    </div>
  );
}

// Screen 05: the detail of an exercise. The header carries the way back and
// says where it goes; once the page is scrolled it takes the name of the
// exercise, as the mockups 05-1 and 05-3b draw it. The orange button stays
// at the bottom of the screen.
function ExerciseDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { exercise, isLoading, notFound, error, reload } = useExercise(id);
  const [isChoosingDestination, setIsChoosingDestination] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 160);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The name travels with the navigation from the list (state), so the
  // header can show it before the detail arrives. "selection" is set when
  // the page was opened from the catalog in selection mode (US-14).
  const state = location.state as { name?: string; selection?: string } | null;
  const title = exercise?.name ?? state?.name ?? "Exercice";
  const selectionScope = state?.selection ?? null;
  const isAlreadySelected =
    selectionScope !== null &&
    readSelection(selectionScope).some((item) => item.exercise_id === id);

  const selected: SelectedExercise | null =
    exercise === null
      ? null
      : {
          exercise_id: exercise.id,
          name: exercise.name,
          meta:
            [exercise.categories.join(" · "), exercise.equipments.join(" · ")]
              .filter((part) => part !== "")
              .join(" · ") || null,
          measure_codes: exercise.measures.map((measure) => measure.code),
          is_bodyweight: exercise.is_bodyweight,
          allows_per_side: exercise.allows_per_side,
        };

  // From the selection: the exercise joins the selection and we go back.
  function addToSelection() {
    if (selectionScope !== null && selected !== null) {
      appendToSelection(selectionScope, selected);
      goBack();
    }
  }

  // From the catalog: a new free session holding this exercise.
  function continueToEditor() {
    if (selected !== null) {
      setIsChoosingDestination(false);
      navigate("/seances/nouvelle", { state: { exercises: [selected] } });
    }
  }

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
  const backLabel = selectionScope === null ? "Catalogue" : "Sélection";

  // "Jambes", "Barre", "Intermédiaire": the three chips under the name.
  const chips =
    exercise === null
      ? []
      : [
          ...exercise.categories,
          ...exercise.equipments,
          DIFFICULTY_LABELS[exercise.difficulty],
        ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex min-h-[56px] items-center gap-1.5 bg-base-200 pr-4 pl-2">
        <button
          type="button"
          onClick={goBack}
          aria-label={
            selectionScope === null
              ? "Retour au catalogue"
              : "Retour à la sélection"
          }
          className="grid size-tap shrink-0 place-items-center rounded-btn"
        >
          <Icon src={chevronLeftIcon} className="size-[22px]" />
        </button>
        {/* While the detail is loading the header carries the name, known
            from the list (05-4). Once it is there the name becomes the title
            of the page, and the header only repeats it when scrolled. */}
        {exercise === null ? (
          <h1 className="min-w-0 flex-1 truncate font-display text-display-sm leading-[1.15]">
            {title}
          </h1>
        ) : isScrolled ? (
          <p
            aria-hidden="true"
            className="min-w-0 flex-1 truncate font-display text-display-sm leading-[1.15]"
          >
            {title}
          </p>
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">
            {backLabel}
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-0.5 pb-28">
        {isLoading && <DetailSkeleton />}

        {!isLoading && notFound && (
          <EmptyState
            centered
            title="Exercice introuvable"
            message="Il n'existe pas, ou il ne t'appartient pas."
          >
            <Link to="/catalogue" className={`${PRIMARY_BUTTON} no-underline`}>
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
            <div className="overflow-hidden rounded-hero border border-base-300 bg-base-100">
              {image === null ? (
                <div
                  role="img"
                  aria-label={`${exercise.name}, illustration non disponible`}
                  className="flex h-[210px] w-full items-center justify-center text-center font-semibold text-muted"
                >
                  Illustration non disponible
                </div>
              ) : (
                <img
                  src={image}
                  alt=""
                  className="h-[210px] w-full bg-white object-contain"
                />
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {exercise.is_personal && (
                <p className="font-sans text-overline uppercase not-italic text-accent">
                  Exercice personnel
                </p>
              )}
              {/* The header shows the same name once the page is scrolled,
                  so only this one is the title of the page. */}
              <h1 className="text-display-page">{exercise.name}</h1>
              <ul className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-ctl border border-base-300 bg-base-100 px-2.5 py-1.5 text-xs font-semibold shadow-card"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>

            <MuscleMap exercise={exercise} sex={user?.sex ?? null} />

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
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {/* "Ma progression" only outside a selection (US-39). */}
            {selectionScope === null && exercise !== null && (
              <Link
                to={`/suivi/exercices/${exercise.id}`}
                className="flex h-13 items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
              >
                Ma progression
              </Link>
            )}
            {selectionScope !== null ? (
              <button
                type="button"
                disabled={isLoading || isAlreadySelected}
                onClick={addToSelection}
                className={`${PRIMARY_BUTTON} disabled:opacity-60`}
              >
                <Icon src={plusIcon} className="size-4" />
                {isAlreadySelected
                  ? "Déjà dans la sélection"
                  : "Ajouter à la sélection"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsChoosingDestination(true)}
                className={`${PRIMARY_BUTTON} disabled:opacity-60`}
              >
                <Icon src={plusIcon} className="size-4" />
                Ajouter à une séance
              </button>
            )}
          </div>
        </div>
      )}

      {isChoosingDestination && selected !== null && (
        <SessionDestinationSheet
          exercises={[selected]}
          onContinue={continueToEditor}
          onCancel={() => setIsChoosingDestination(false)}
        />
      )}
    </div>
  );
}

export default ExerciseDetailPage;
