import { useEffect, useRef, useState } from "react";
import { EXERCISE_PAGE_SIZE, type ExerciseListItem } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readExercises } from "../services/exerciseService";

const GENERIC_ERROR = "Une erreur est survenue. Réessaie plus tard.";

function toMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

type Options = {
  // How many exercises to load at first: 20, or more when coming back to the
  // list (the pages already seen are loaded again, in order).
  initialCount?: number;
};

// The catalog, 20 exercises at a time. The first load and the "load more"
// have their own loading flags and errors, so the cards already shown stay.
export function useExercises({
  initialCount = EXERCISE_PAGE_SIZE,
}: Options = {}) {
  const [items, setItems] = useState<ExerciseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // One "load more" at a time, even if the sentinel fires twice.
  const loadingMore = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the first load when retry() is called
  useEffect(() => {
    const controller = new AbortController();
    const pages = Math.max(1, Math.ceil(initialCount / EXERCISE_PAGE_SIZE));

    async function loadFirstPages() {
      setIsLoading(true);
      setError(null);
      try {
        const loaded: ExerciseListItem[] = [];
        let offset: number | null = 0;
        for (let page = 0; page < pages && offset !== null; page += 1) {
          const response = await readExercises(offset, controller.signal);
          loaded.push(...response.items);
          setTotal(response.total);
          offset = response.next_offset;
        }
        setItems(loaded);
        setNextOffset(offset);
        setIsLoading(false);
      } catch (caught) {
        if (isAbortError(caught)) {
          return;
        }
        setError(toMessage(caught));
        setIsLoading(false);
      }
    }

    loadFirstPages();
    return () => controller.abort();
  }, [initialCount, attempt]);

  async function loadMore() {
    if (nextOffset === null || loadingMore.current) {
      return;
    }
    loadingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await readExercises(nextOffset);
      setItems((current) => [...current, ...response.items]);
      setTotal(response.total);
      setNextOffset(response.next_offset);
    } catch (caught) {
      setLoadMoreError(toMessage(caught));
    } finally {
      loadingMore.current = false;
      setIsLoadingMore(false);
    }
  }

  return {
    items,
    total,
    hasMore: nextOffset !== null,
    isLoading,
    error,
    isLoadingMore,
    loadMoreError,
    loadMore,
    retry: () => setAttempt((count) => count + 1),
  };
}
