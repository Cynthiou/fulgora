import { useState } from "react";
import type { SelectedExercise } from "shared";

// The exercises picked in the catalog, in the order they were touched: that
// order becomes the order in the block (US-14). Kept in sessionStorage so a
// detour through a detail page (another route) does not lose it.

type Stored = { active: boolean; items: SelectedExercise[] };

function storageKey(scope: string): string {
  return `catalogue:selection:${scope}`;
}

function read(scope: string): Stored {
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    return raw === null
      ? { active: false, items: [] }
      : (JSON.parse(raw) as Stored);
  } catch {
    return { active: false, items: [] };
  }
}

function write(scope: string, stored: Stored): void {
  try {
    if (!stored.active && stored.items.length === 0) {
      sessionStorage.removeItem(storageKey(scope));
    } else {
      sessionStorage.setItem(storageKey(scope), JSON.stringify(stored));
    }
  } catch {
    // Private mode or storage disabled: the selection lives in memory only.
  }
}

// Current selection of a scope, for a page that is not the list (the detail).
export function readSelection(scope: string): SelectedExercise[] {
  return read(scope).items;
}

// Adds an exercise from the detail page; an exercise already picked stays
// where it is.
export function appendToSelection(scope: string, item: SelectedExercise): void {
  const stored = read(scope);
  if (stored.items.some((picked) => picked.exercise_id === item.exercise_id)) {
    return;
  }
  write(scope, { active: true, items: [...stored.items, item] });
}

type Options = {
  // True for the block selection page: always selecting, no on/off.
  alwaysActive?: boolean;
};

export function useExerciseSelection(
  scope: string,
  { alwaysActive = false }: Options = {},
) {
  const [stored, setStored] = useState<Stored>(() => {
    const initial = read(scope);
    return alwaysActive ? { ...initial, active: true } : initial;
  });

  function update(next: Stored) {
    setStored(next);
    write(scope, next);
  }

  const { items } = stored;

  return {
    items,
    isActive: alwaysActive || stored.active,
    // "Sélectionner": enters the mode with an empty selection.
    start: () => update({ active: true, items: [] }),
    // "Annuler": leaves the mode, selection dropped.
    cancel: () => update({ active: false, items: [] }),
    // "Tout désélectionner": empties without leaving.
    clear: () => update({ active: stored.active, items: [] }),
    // Touching a card: picked at the end, or removed (the others move up).
    toggle: (item: SelectedExercise) => {
      const picked = items.some((i) => i.exercise_id === item.exercise_id);
      update({
        active: stored.active,
        items: picked
          ? items.filter((i) => i.exercise_id !== item.exercise_id)
          : [...items, item],
      });
    },
    // 1-based position of an exercise in the selection, null when not picked.
    positionOf: (exerciseId: number): number | null => {
      const index = items.findIndex((i) => i.exercise_id === exerciseId);
      return index === -1 ? null : index + 1;
    },
  };
}
