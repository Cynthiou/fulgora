import { useEffect, useRef } from "react";
import { EXERCISE_PAGE_SIZE, formatExerciseCount } from "shared";
import ErrorState from "../../../components/ErrorState";
import { useAuth } from "../../../hooks/useAuth";
import ExerciseCard from "../components/ExerciseCard";
import ExerciseCardSkeleton from "../components/ExerciseCardSkeleton";
import { useExercises } from "../hooks/useExercises";

// Where the list was when the user left for a detail page (US-07).
const POSITION_KEY = "catalogue:position";
type SavedPosition = { loadedCount: number; scrollY: number };

function readSavedPosition(): SavedPosition | null {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    return raw === null ? null : (JSON.parse(raw) as SavedPosition);
  } catch {
    return null;
  }
}

function savePosition(position: SavedPosition) {
  try {
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Private mode or storage disabled: the position is simply not kept.
  }
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

// Screen 04 (states 1, 6, 7): the catalog, 20 exercises at a time.
function ExerciseListPage() {
  const { user } = useAuth();
  const saved = useRef(readSavedPosition());
  const {
    items,
    total,
    hasMore,
    isLoading,
    error,
    isLoadingMore,
    loadMoreError,
    loadMore,
    retry,
  } = useExercises({
    initialCount: saved.current?.loadedCount ?? EXERCISE_PAGE_SIZE,
  });
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Coming back from a detail: put the list where it was, once it is loaded.
  useEffect(() => {
    if (!isLoading && saved.current !== null) {
      window.scrollTo(0, saved.current.scrollY);
      saved.current = null;
    }
  }, [isLoading]);

  // Leaving the page: remember how far the list was loaded and scrolled.
  const loadedCount = items.length;
  useEffect(() => {
    return () => {
      if (loadedCount > 0) {
        savePosition({ loadedCount, scrollY: window.scrollY });
      }
    };
  }, [loadedCount]);

  // Near the bottom: load the next 20. The "Charger plus" button does the
  // same for the keyboard and screen readers, and for browsers without
  // IntersectionObserver.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      sentinel === null ||
      !hasMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-display-md">Catalogue</h1>

      {isLoading && (
        <>
          <p role="status" className="text-muted">
            Chargement des exercices
          </p>
          <ul className="flex flex-col gap-2">
            {SKELETON_KEYS.map((key) => (
              <ExerciseCardSkeleton key={key} />
            ))}
          </ul>
        </>
      )}

      {!isLoading && error !== null && (
        <ErrorState
          title="Impossible de charger les exercices"
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={retry}
        />
      )}

      {!isLoading && error === null && (
        <>
          <p className="font-semibold text-muted">
            {formatExerciseCount(total)}
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                sex={user?.sex ?? null}
              />
            ))}
            {isLoadingMore && <ExerciseCardSkeleton />}
          </ul>

          {isLoadingMore && (
            <p role="status" className="text-center text-muted">
              Chargement…
            </p>
          )}

          {!isLoadingMore && loadMoreError !== null && (
            <ErrorState title={loadMoreError} onRetry={loadMore} />
          )}

          {hasMore && !isLoadingMore && loadMoreError === null && (
            <>
              <div ref={sentinelRef} aria-hidden="true" className="h-px" />
              <button
                type="button"
                onClick={loadMore}
                className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
              >
                Charger plus
              </button>
            </>
          )}

          {!hasMore && items.length > 0 && (
            <p className="text-center text-sm text-muted">Fin de la liste</p>
          )}
        </>
      )}
    </div>
  );
}

export default ExerciseListPage;
