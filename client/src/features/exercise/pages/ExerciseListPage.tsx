import { useEffect, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  EXERCISE_PAGE_SIZE,
  type ExerciseFilters,
  type ExerciseListItem,
  formatExerciseCount,
  formatResultCount,
  formatSelectedCount,
  MAX_EXERCISES_PER_BLOCK,
  type SelectedExercise,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../hooks/useAuth";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
  loadDraft,
  savePendingExercises,
} from "../../session-template/services/sessionDraftStorage";
import { savePendingWorkoutExercises } from "../../workout-session/services/workoutAddStorage";
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
import SelectableExerciseCard from "../components/SelectableExerciseCard";
import SessionDestinationSheet from "../components/SessionDestinationSheet";
import { useExerciseSelection } from "../hooks/useExerciseSelection";
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

function toSelected(exercise: ExerciseListItem): SelectedExercise {
  return {
    exercise_id: exercise.id,
    name: exercise.name,
    // "Pectoraux · Barre" under the name of the configuration screen (A7)
    meta:
      [exercise.category_name, exercise.equipment_names]
        .filter((part) => part !== null)
        .join(" · ") || null,
    measure_codes: exercise.measure_codes,
    is_bodyweight: exercise.is_bodyweight,
  };
}

type Props = {
  // "catalog": the Catalogue tab, where "Sélectionner" turns selection on.
  // "block": the selection page of a block of the draft (A5), always selecting.
  // "workout": the same, for the session in progress (US-32).
  selectionMode?: "catalog" | "block" | "workout";
};

// Screen 04: the catalog, its search and its three filters. Search and
// filters live in the address, so a reload or a return keeps them. In
// selection mode (state 5 / A5), the cards become toggles and the chosen
// exercises leave for the session editor.
function ExerciseListPage({ selectionMode = "catalog" }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, equipments } = useReferenceLists();

  // Block mode: which block of the kept draft receives the exercises.
  const blockKey = selectionMode === "block" ? searchParams.get("block") : null;
  const storedDraft = selectionMode === "block" ? loadDraft() : null;
  const blockIndex =
    storedDraft?.draft.blocks.findIndex((block) => block.key === blockKey) ??
    -1;
  const block =
    blockIndex === -1 ? null : storedDraft?.draft.blocks[blockIndex];
  const existingCount = block?.exercises.length ?? 0;
  // Where the kept draft comes from: a new session, or one being changed.
  const editedAppointmentId = storedDraft?.appointmentId ?? null;
  const editorPath =
    editedAppointmentId === null
      ? "/seances/nouvelle"
      : `/seances/${editedAppointmentId}/modifier`;

  // The session in progress, when the catalog was opened from it (US-32)
  const workoutSessionId =
    selectionMode === "workout" ? Number(params.id) : null;

  const selection = useExerciseSelection(
    selectionMode === "block"
      ? `block:${blockKey ?? ""}`
      : selectionMode === "workout"
        ? `workout:${workoutSessionId ?? ""}`
        : "catalog",
    { alwaysActive: selectionMode !== "catalog" },
  );
  const [isChoosingDestination, setIsChoosingDestination] = useState(false);
  const isLimitReached =
    existingCount + selection.items.length >= MAX_EXERCISES_PER_BLOCK;

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

  // Back to the editor (block mode): the previous page, or its address when
  // the selection page was opened directly.
  function backToEditor() {
    if (location.key === "default") {
      navigate(editorPath, { replace: true });
    } else {
      navigate(-1);
    }
  }

  // "Ajouter à la séance": the exercises wait in the tab, and the session
  // asks where they go (US-32).
  function addToWorkout() {
    if (workoutSessionId === null || selection.items.length === 0) {
      return;
    }
    savePendingWorkoutExercises({
      workoutSessionId,
      exercises: selection.items,
    });
    selection.cancel();
    navigate(`/entrainement/${workoutSessionId}`, { replace: true });
  }

  // "Ajouter au bloc": the exercises wait in the tab for the editor.
  function addToBlock() {
    if (blockKey !== null && selection.items.length > 0) {
      savePendingExercises({ blockKey, exercises: selection.items });
      selection.cancel();
      backToEditor();
    }
  }

  // "Continuer vers l'éditeur": a new free session holding the selection.
  function continueToEditor() {
    const exercises = selection.items;
    setIsChoosingDestination(false);
    selection.cancel();
    navigate("/seances/nouvelle", { state: { exercises } });
  }

  const detailState =
    selection.isActive && selectionMode === "block"
      ? { selection: `block:${blockKey ?? ""}` }
      : selection.isActive
        ? { selection: "catalog" }
        : {};

  const actionLabel =
    selectionMode === "block"
      ? "Ajouter au bloc"
      : selectionMode === "workout"
        ? "Ajouter à la séance"
        : "Ajouter à une séance";

  const counterText =
    search === "" && !hasFilters
      ? formatExerciseCount(total)
      : formatResultCount(
          total,
          search,
          activeFilters.map((filter) => filter.label),
        );

  // Block mode without a known block: nothing to select for, back to the editor.
  if (selectionMode === "block" && block === null) {
    return <Navigate to={editorPath} replace />;
  }

  return (
    <div
      className={`mx-auto flex max-w-md flex-col gap-4 p-4 ${
        selection.isActive ? "pb-28" : ""
      }`}
    >
      {selectionMode !== "catalog" ? (
        <div className="-mx-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              selection.cancel();
              if (selectionMode === "workout") {
                navigate(`/entrainement/${workoutSessionId}`, {
                  replace: true,
                });
              } else {
                backToEditor();
              }
            }}
            aria-label={
              selectionMode === "workout"
                ? "Retour à la séance"
                : "Retour au bloc"
            }
            className="flex size-tap shrink-0 items-center justify-center rounded-btn text-secondary"
          >
            <Icon src={chevronLeftIcon} className="size-7" />
          </button>
          <div className="flex min-w-0 flex-col">
            <h1 className="text-display-md">Catalogue</h1>
            <p className="text-sm font-semibold text-muted">
              {selectionMode === "workout"
                ? "Sélection pour la séance en cours"
                : `Sélection pour le bloc ${blockIndex + 1}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-display-md">Catalogue</h1>
          {selection.isActive ? (
            <button
              type="button"
              onClick={selection.cancel}
              className="min-h-tap px-2 font-semibold text-secondary"
            >
              Annuler
            </button>
          ) : (
            <button
              type="button"
              onClick={selection.start}
              className="min-h-tap px-2 font-semibold text-secondary"
            >
              Sélectionner
            </button>
          )}
        </div>
      )}

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

      {selection.isActive && selectionMode === "catalog" && (
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="font-semibold">
            {formatSelectedCount(selection.items.length)}
          </p>
          {selection.items.length > 0 && (
            <button
              type="button"
              onClick={selection.clear}
              className="min-h-tap px-2 text-sm font-semibold text-secondary"
            >
              Tout désélectionner
            </button>
          )}
        </div>
      )}

      {selection.isActive && isLimitReached && (
        <p role="status" className="text-sm font-semibold text-muted">
          {MAX_EXERCISES_PER_BLOCK} exercices au maximum par bloc
        </p>
      )}

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

          <ul aria-label="Exercices" className="flex flex-col gap-2">
            {items.map((exercise) =>
              selection.isActive ? (
                <SelectableExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  sex={user?.sex ?? null}
                  searchTerm={search}
                  position={selection.positionOf(exercise.id)}
                  total={selection.items.length}
                  isLimitReached={isLimitReached}
                  onToggle={() => selection.toggle(toSelected(exercise))}
                  detailState={detailState}
                />
              ) : (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  sex={user?.sex ?? null}
                  searchTerm={search}
                />
              ),
            )}
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

      {selection.isActive && (
        <div
          className={`fixed inset-x-0 z-10 border-t border-base-300 bg-base-100 p-4 ${
            selectionMode === "catalog" ? "bottom-nav" : "bottom-0"
          }`}
        >
          <div className="mx-auto max-w-md">
            <button
              type="button"
              disabled={selection.items.length === 0}
              onClick={
                selectionMode === "block"
                  ? addToBlock
                  : selectionMode === "workout"
                    ? addToWorkout
                    : () => setIsChoosingDestination(true)
              }
              // "Ajouter au bloc · 6" on screen, "Ajouter au bloc, 6 sélectionnés" aloud
              aria-label={`${actionLabel}, ${formatSelectedCount(selection.items.length)}`}
              className="flex h-btn w-full items-center justify-center gap-2 rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
            >
              {actionLabel}
              {selection.items.length > 0 && (
                <span aria-hidden="true"> · {selection.items.length}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {isChoosingDestination && (
        <SessionDestinationSheet
          exercises={selection.items}
          onContinue={continueToEditor}
          onCancel={() => setIsChoosingDestination(false)}
        />
      )}
    </div>
  );
}

export default ExerciseListPage;
