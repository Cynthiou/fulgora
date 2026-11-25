import { act, renderHook } from "@testing-library/react";
import type { SelectedExercise } from "shared";
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendToSelection,
  readSelection,
  useExerciseSelection,
} from "./useExerciseSelection";

const squat: SelectedExercise = {
  exercise_id: 12,
  name: "Squat",
  measure_codes: ["reps"],
};
const bench: SelectedExercise = {
  exercise_id: 31,
  name: "Développé couché",
  measure_codes: ["reps", "weight"],
};
const plank: SelectedExercise = {
  exercise_id: 7,
  name: "Gainage",
  measure_codes: ["duration"],
};

describe("useExerciseSelection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps the order of the touches and renumbers after a removal", () => {
    const { result } = renderHook(() => useExerciseSelection("catalog"));
    expect(result.current.isActive).toBe(false);

    act(() => result.current.start());
    act(() => result.current.toggle(squat));
    act(() => result.current.toggle(bench));
    act(() => result.current.toggle(plank));

    expect(result.current.isActive).toBe(true);
    expect(result.current.items.map((item) => item.name)).toEqual([
      "Squat",
      "Développé couché",
      "Gainage",
    ]);
    expect(result.current.positionOf(31)).toBe(2);

    // Touching Squat again removes it: the others move up.
    act(() => result.current.toggle(squat));
    expect(result.current.positionOf(12)).toBeNull();
    expect(result.current.positionOf(31)).toBe(1);
    expect(result.current.positionOf(7)).toBe(2);

    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.isActive).toBe(true);

    act(() => result.current.cancel());
    expect(result.current.isActive).toBe(false);
  });

  it("survives a remount through sessionStorage and accepts additions from a detail", () => {
    const first = renderHook(() => useExerciseSelection("block:b1"));
    act(() => first.result.current.toggle(squat));
    first.unmount();

    appendToSelection("block:b1", bench);
    // Already picked: stays at its place
    appendToSelection("block:b1", squat);
    expect(readSelection("block:b1").map((item) => item.name)).toEqual([
      "Squat",
      "Développé couché",
    ]);

    const second = renderHook(() =>
      useExerciseSelection("block:b1", { alwaysActive: true }),
    );
    expect(second.result.current.isActive).toBe(true);
    expect(second.result.current.positionOf(31)).toBe(2);
  });

  it("keeps the selections of two scopes apart", () => {
    const catalog = renderHook(() => useExerciseSelection("catalog"));
    const block = renderHook(() => useExerciseSelection("block:b1"));

    act(() => catalog.result.current.toggle(squat));

    expect(block.result.current.items).toEqual([]);
  });
});
