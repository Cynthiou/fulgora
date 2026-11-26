import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  describeHistoryFilters,
  formatPeriodLabel,
  groupByWeek,
  HISTORY_PERIODS,
  HISTORY_STATUSES,
  type HistoryFilters,
  type HistoryPeriod,
  type HistoryStatusFilter,
  shiftPeriod,
  todayInParis,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/app/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import sortIcon from "../../../assets/icons/ui/app/grid.svg";
import ActiveFilterChips from "../../../components/ActiveFilterChips";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import {
  type ProgramListItem,
  readPrograms,
} from "../../program/services/programService";
import HistoryFilterSheet from "../components/HistoryFilterSheet";
import HistoryWeekGroup from "../components/HistoryWeekGroup";
import TrackingTabs from "../components/TrackingTabs";
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

// The filters live in the address, so a reload or a back keeps them.
function readFilters(params: URLSearchParams, today: string): HistoryFilters {
  const period = params.get("period") as HistoryPeriod | null;
  const program = params.get("program");
  const statuses = (params.get("statuses") ?? "")
    .split(",")
    .filter((part): part is HistoryStatusFilter =>
      HISTORY_STATUSES.includes(part as HistoryStatusFilter),
    );
  return {
    period:
      period !== null && HISTORY_PERIODS.includes(period) ? period : "all",
    date: params.get("date") ?? today,
    program:
      program === null
        ? null
        : program === "free"
          ? "free"
          : Number(program) || null,
    statuses,
  };
}

function toParams(filters: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.period !== "all") {
    params.set("period", filters.period);
    params.set("date", filters.date);
  }
  if (filters.program !== null) {
    params.set("program", String(filters.program));
  }
  if (filters.statuses.length > 0) {
    params.set("statuses", filters.statuses.join(","));
  }
  return params;
}

// The Suivi tab: the history of past sessions (SUI-05), newest first, by
// week, with the filters of SUI-05f (US-52).
function TrackingPage() {
  const today = todayInParis();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams, today);
  const [isFiltering, setIsFiltering] = useState(false);
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);

  const {
    items,
    hasMore,
    isLoading,
    error,
    isLoadingMore,
    loadMoreError,
    loadMore,
    retry,
  } = useHistory(filters);

  // The programs feed the filter panel; a failure only hides them.
  useEffect(() => {
    const controller = new AbortController();
    readPrograms(controller.signal)
      .then(setPrograms)
      .catch(() => setPrograms([]));
    return () => controller.abort();
  }, []);

  const programName =
    typeof filters.program === "number"
      ? (programs.find((program) => program.id === filters.program)?.name ??
        null)
      : null;
  const chips = describeHistoryFilters(filters, programName);

  function clearAll() {
    apply({ period: "all", date: today, program: null, statuses: [] });
  }

  function apply(next: HistoryFilters) {
    setSearchParams(toParams(next), { replace: true });
    setIsFiltering(false);
  }

  function removeChip(key: string) {
    if (key === "period") {
      apply({ ...filters, period: "all" });
      return;
    }
    if (key === "program") {
      apply({ ...filters, program: null });
      return;
    }
    const status = key.slice("status:".length) as HistoryStatusFilter;
    apply({
      ...filters,
      statuses: filters.statuses.filter((one) => one !== status),
    });
  }

  function step(direction: -1 | 1) {
    apply({
      ...filters,
      date: shiftPeriod(filters.period, filters.date, direction),
    });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 px-[18px] pt-1 pb-3.5">
      {/* The title lives in the header of the shell (SUI-05). */}
      <h1 className="sr-only">Suivi</h1>
      <TrackingTabs current="historique" />

      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-overline uppercase not-italic text-accent">
          Historique
        </p>
        <button
          type="button"
          onClick={() => setIsFiltering(true)}
          aria-haspopup="dialog"
          className="flex h-9 items-center gap-2 rounded-chip border border-base-300 bg-base-100 px-3 text-[13px] font-bold shadow-card"
        >
          <Icon src={sortIcon} className="size-4" />
          Filtrer
          {chips.length > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-secondary text-[11px] font-extrabold text-white">
              {chips.length}
            </span>
          )}
        </button>
      </div>

      {filters.period !== "all" && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Période précédente"
            className="grid size-tap place-items-center rounded-btn border border-base-300 bg-base-100"
          >
            <Icon src={chevronLeftIcon} className="size-[18px]" />
          </button>
          <p className="font-display text-display-xs uppercase italic">
            {formatPeriodLabel(filters.period, filters.date)}
          </p>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Période suivante"
            className="grid size-tap place-items-center rounded-btn border border-base-300 bg-base-100"
          >
            <Icon src={chevronRightIcon} className="size-[18px]" />
          </button>
        </div>
      )}

      <ActiveFilterChips
        filters={chips.map((chip) => ({
          key: chip.key,
          label: chip.label,
          onRemove: () => removeChip(chip.key),
        }))}
        onClearAll={clearAll}
      />

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
          title={
            chips.length > 0
              ? "Aucune séance pour ces filtres"
              : "Aucune séance passée"
          }
          message={
            chips.length > 0
              ? "Change de période ou retire un filtre."
              : "Tes séances apparaîtront ici dès qu'elles seront faites, manquées ou annulées."
          }
        >
          {chips.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex h-13 items-center justify-center rounded-btn border border-base-300 bg-base-100 px-4 text-sm font-bold shadow-card"
            >
              Effacer les filtres
            </button>
          )}
        </EmptyState>
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

      {isFiltering && (
        <HistoryFilterSheet
          filters={filters}
          programs={programs}
          count={items.length}
          onApply={apply}
          onClear={clearAll}
          onClose={() => setIsFiltering(false)}
        />
      )}
    </div>
  );
}

export default TrackingPage;
