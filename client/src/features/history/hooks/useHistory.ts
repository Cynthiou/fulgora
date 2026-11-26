import { useEffect, useRef, useState } from "react";
import type { HistoryFilters, HistoryItem } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readHistory } from "../services/historyService";

const GENERIC_ERROR = "Une erreur est survenue. Réessaie plus tard.";

function toMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

// The history, 20 lines at a time. The first load and "load more" keep their
// own flags and errors, so the lines already shown stay on a failure.
export function useHistory(filters: HistoryFilters) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadingMore = useRef(false);

  // The filters live in the address: a change reloads the first page.
  const asked = JSON.stringify(filters);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt and asked are listed on purpose, they re-run the first load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    readHistory(0, JSON.parse(asked) as HistoryFilters, controller.signal)
      .then((page) => {
        setItems(page.items);
        setHasMore(page.has_more);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError(toMessage(caught));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [attempt, asked]);

  async function loadMore() {
    if (!hasMore || loadingMore.current) {
      return;
    }
    loadingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await readHistory(items.length, filters);
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.has_more);
    } catch (caught) {
      setLoadMoreError(toMessage(caught));
    } finally {
      loadingMore.current = false;
      setIsLoadingMore(false);
    }
  }

  return {
    items,
    hasMore,
    isLoading,
    error,
    isLoadingMore,
    loadMoreError,
    loadMore,
    retry: () => setAttempt((count) => count + 1),
  };
}
