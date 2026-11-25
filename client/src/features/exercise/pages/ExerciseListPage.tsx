import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  EXERCISE_PAGE_SIZE,
  type ExerciseFilters,
  formatExerciseCount,
  formatResultCount,
} from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import { useAuth } from "../../../hooks/useAuth";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import ActiveFilterChips, {
  type ActiveFilter,
} from "../components/ActiveFilterChips";
import {
  CATEGORY_ICONS,
  DIFFICULTY_ICONS,
  EQUIPMENT_ICONS,
} from "../components/catalogIcons";
import ExerciseCard from "../components/ExerciseCard";
import ExerciseCardSkeleton from "../components/ExerciseCardSkeleton";
import ExerciseSearch from "../components/ExerciseSearch";
import FilterGrid from "../components/FilterGrid";
import FilterToggle from "../components/FilterToggle";
import { useExercises } from "../hooks/useExercises";
import { useReferenceLists } from "../hooks/useReferenceLists";

// Where the list was when the user left for a detail page (US-07), for the
// same search and filters only.
const POSITION_KEY = "catalogue:position";
type SavedPosition = { search: string; loadedCount: number; scrollY: number };

function readSavedPosition(search: string): SavedPosition | null {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    const saved = raw === null ? null : (JSON.parse(raw) as SavedPosition);
    return saved !== null && saved.search === search ? saved : null;
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
type FilterName = "category" | "equipment" | "difficulty";

// "5,2" from the address -> ["5", "2"]; anything odd is ignored.
function readIdList(raw: string | null): string[] {
  return raw === null
    ? []
    : raw.split(",").filter((value) => /^[1-9]\d*$/.test(value));
}

function readDifficulties(raw: string | null): Difficulty[] {
  return raw === null
    ? []
    : raw
        .split(",")
        .filter((value): value is Difficulty =>
          (DIFFICULTIES as readonly string[]).includes(value),
        );
}

// Screen 04: the catalog, its search and its three filters. Search and
// filters live in the address, so a reload or a return keeps them.
function ExerciseListPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, equipments } = useReferenceLists();

  // What the address says
  const search = searchParams.get("search") ?? "";
  const categoryIds = readIdList(searchParams.get("category_ids"));
  const equipmentIds = readIdList(searchParams.get("equipment_ids"));
  const difficulties = readDifficulties(searchParams.get("difficulties"));
  const hasFilters =
    categoryIds.length > 0 ||
    equipmentIds.length > 0 ||
    difficulties.length > 0;

  // What is typed, sent to the address 300 ms after the last letter
  const [typed, setTyped] = useState(search);
  const debouncedTyped = useDebouncedValue(typed, 300);
  const [openFilter, setOpenFilter] = useState<FilterName | null>(null);

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next, { replace: true });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: only the debounced text must trigger the address update
  useEffect(() => {
    if (debouncedTyped.trim() !== search) {
      updateParams({ search: debouncedTyped.trim() });
    }
  }, [debouncedTyped]);

  const filters: ExerciseFilters = {
    ...(search !== "" && { search }),
    ...(categoryIds.length > 0 && { category_ids: categoryIds.map(Number) }),
    ...(equipmentIds.length > 0 && { equipment_ids: equipmentIds.map(Number) }),
    ...(difficulties.length > 0 && { difficulties }),
  };

  const saved = useRef(readSavedPosition(location.search));
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
    filters,
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
  const currentSearch = location.search;
  useEffect(() => {
    return () => {
      if (loadedCount > 0) {
        savePosition({
          search: currentSearch,
          loadedCount,
          scrollY: window.scrollY,
        });
      }
    };
  }, [loadedCount, currentSearch]);

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

  function toggleIn(list: string[], id: string): string {
    const next = list.includes(id)
      ? list.filter((item) => item !== id)
      : [...list, id];
    return next.join(",");
  }

  const activeFilters: ActiveFilter[] = [
    ...categoryIds.map((id) => ({
      key: `category-${id}`,
      label:
        categories.find((c) => String(c.id) === id)?.name ?? `Groupe ${id}`,
      onRemove: () => updateParams({ category_ids: toggleIn(categoryIds, id) }),
    })),
    ...equipmentIds.map((id) => ({
      key: `equipment-${id}`,
      label:
        equipments.find((e) => String(e.id) === id)?.name ?? `Matériel ${id}`,
      onRemove: () =>
        updateParams({ equipment_ids: toggleIn(equipmentIds, id) }),
    })),
    ...difficulties.map((difficulty) => ({
      key: `difficulty-${difficulty}`,
      label: DIFFICULTY_LABELS[difficulty],
      onRemove: () =>
        updateParams({ difficulties: toggleIn(difficulties, difficulty) }),
    })),
  ];

  function clearAllFilters() {
    updateParams({
      category_ids: null,
      equipment_ids: null,
      difficulties: null,
    });
  }

  function clearSearch() {
    setTyped("");
    updateParams({ search: null });
  }

  const counterText =
    search === "" && !hasFilters
      ? formatExerciseCount(total)
      : formatResultCount(
          total,
          search,
          activeFilters.map((filter) => filter.label),
        );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-display-md">Catalogue</h1>

      <ExerciseSearch value={typed} onChange={setTyped} onClear={clearSearch} />

      <div className="flex gap-2">
        <FilterToggle
          label="Groupe"
          count={categoryIds.length}
          isOpen={openFilter === "category"}
          controls="filter-category"
          onToggle={() =>
            setOpenFilter(openFilter === "category" ? null : "category")
          }
        />
        <FilterToggle
          label="Matériel"
          count={equipmentIds.length}
          isOpen={openFilter === "equipment"}
          controls="filter-equipment"
          onToggle={() =>
            setOpenFilter(openFilter === "equipment" ? null : "equipment")
          }
        />
        <FilterToggle
          label="Difficulté"
          count={difficulties.length}
          isOpen={openFilter === "difficulty"}
          controls="filter-difficulty"
          onToggle={() =>
            setOpenFilter(openFilter === "difficulty" ? null : "difficulty")
          }
        />
      </div>

      {openFilter === "category" && (
        <FilterGrid
          id="filter-category"
          label="Groupe"
          columns={4}
          options={categories.map((category) => ({
            id: String(category.id),
            name: category.name,
            icon: CATEGORY_ICONS[category.code],
          }))}
          activeIds={categoryIds}
          clearLabel="Effacer le groupe"
          onToggle={(id) =>
            updateParams({ category_ids: toggleIn(categoryIds, id) })
          }
          onClear={() => updateParams({ category_ids: null })}
        />
      )}
      {openFilter === "equipment" && (
        <FilterGrid
          id="filter-equipment"
          label="Matériel"
          columns={3}
          options={equipments.map((equipment) => ({
            id: String(equipment.id),
            name: equipment.name,
            icon: EQUIPMENT_ICONS[equipment.code],
          }))}
          activeIds={equipmentIds}
          clearLabel="Effacer le matériel"
          onToggle={(id) =>
            updateParams({ equipment_ids: toggleIn(equipmentIds, id) })
          }
          onClear={() => updateParams({ equipment_ids: null })}
        />
      )}
      {openFilter === "difficulty" && (
        <FilterGrid
          id="filter-difficulty"
          label="Difficulté"
          columns={3}
          options={DIFFICULTIES.map((difficulty) => ({
            id: difficulty,
            name: DIFFICULTY_LABELS[difficulty],
            icon: DIFFICULTY_ICONS[difficulty],
          }))}
          activeIds={difficulties}
          clearLabel="Effacer la difficulté"
          onToggle={(id) =>
            updateParams({ difficulties: toggleIn(difficulties, id) })
          }
          onClear={() => updateParams({ difficulties: null })}
        />
      )}

      <ActiveFilterChips filters={activeFilters} onClearAll={clearAllFilters} />

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
          <p aria-live="polite" className="font-semibold text-muted">
            {counterText}
          </p>

          {items.length === 0 && (
            <EmptyState
              title={
                search === ""
                  ? "Aucun exercice trouvé"
                  : `Aucun exercice trouvé pour « ${search} »`
              }
              message="Vérifie l'orthographe ou retire un filtre."
            >
              <div className="flex w-full flex-col gap-2">
                {search !== "" && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
                  >
                    Effacer la recherche
                  </button>
                )}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </EmptyState>
          )}

          <ul className="flex flex-col gap-2">
            {items.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                sex={user?.sex ?? null}
                searchTerm={search}
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
            <p className="text-center text-sm text-muted">
              {search === "" && !hasFilters
                ? "Fin de la liste"
                : "Fin des résultats"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default ExerciseListPage;
