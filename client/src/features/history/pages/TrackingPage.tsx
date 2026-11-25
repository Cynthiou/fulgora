import { groupByWeek } from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import HistoryWeekGroup from "../components/HistoryWeekGroup";
import { useHistory } from "../hooks/useHistory";

const SKELETON_KEYS = ["a", "b", "c", "d"];

// Grey lines of the same height while the history loads.
function HistorySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Chargement de l'historique</span>
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="h-[4.5rem] animate-pulse rounded-card bg-soft motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// The Suivi tab: the history of past sessions (SUI-05), newest first, by
// week. The Résumé and Exercices tabs come after the MVP (US-41, US-39).
function TrackingPage() {
  const {
    items,
    hasMore,
    isLoading,
    error,
    isLoadingMore,
    loadMoreError,
    loadMore,
    retry,
  } = useHistory();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 px-[18px] pt-1 pb-3.5">
      {/* The title lives in the header of the shell (SUI-05). */}
      <h1 className="sr-only">Suivi</h1>
      <p className="font-sans text-overline uppercase not-italic text-accent">
        Historique
      </p>

      {isLoading && <HistorySkeleton />}

      {!isLoading && error !== null && (
        <ErrorState
          title="Impossible de charger ton historique."
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={retry}
        />
      )}

      {!isLoading && error === null && items.length === 0 && (
        <EmptyState
          title="Aucune séance passée"
          message="Tes séances apparaîtront ici dès qu'elles seront faites, manquées ou annulées."
        />
      )}

      {!isLoading && error === null && items.length > 0 && (
        <>
          {groupByWeek(items).map((week) => (
            <HistoryWeekGroup key={week.monday} week={week} />
          ))}

          {isLoadingMore && (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">Chargement des séances suivantes</span>
              <div className="h-[4.5rem] animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
            </div>
          )}

          {!isLoadingMore && loadMoreError !== null && (
            <ErrorState title={loadMoreError} onRetry={loadMore} />
          )}

          {hasMore && !isLoadingMore && loadMoreError === null && (
            <button
              type="button"
              onClick={loadMore}
              className="h-13 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
            >
              Charger plus
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default TrackingPage;
