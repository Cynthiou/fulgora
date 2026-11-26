import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { DraftExercise } from "shared";
import { describe, expect, it, vi } from "vitest";
import SetConfigurator from "../../../../src/features/session-template/components/SetConfigurator";

// An exercise in reps and load, like the lunges or the squat of the catalog.
function makeExercise(overrides: Partial<DraftExercise>): DraftExercise {
  return {
    key: "ex-1",
    exercise_id: 1,
    name: "Fentes avec haltères",
    measure_codes: ["reps", "weight"],
    default_rest_seconds: 90,
    sets: [
      {
        reps: 10,
        weight_kg: 12,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: null,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
        rest_after_seconds: null,
      },
    ],
    ...overrides,
  };
}

function renderConfigurator(exercise: DraftExercise) {
  render(
    <MemoryRouter>
      <SetConfigurator
        exercise={exercise}
        onRemove={vi.fn()}
        onUpdateSet={vi.fn()}
        onAddSet={vi.fn()}
        onDuplicateLastSet={vi.fn()}
        onRemoveSet={vi.fn()}
        onMoveSet={vi.fn()}
        onChangePerSide={vi.fn()}
        onChangeSameLoad={vi.fn()}
        onChangeRest={vi.fn()}
        onDone={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("SetConfigurator, « Chaque côté » (RM-084)", () => {
  it("offers it when the catalog allows the exercise side by side", () => {
    renderConfigurator(makeExercise({ allows_per_side: true }));
    expect(screen.getByRole("switch", { name: "Chaque côté" })).toBeTruthy();
  });

  it("hides it for an exercise done with both arms or both legs", () => {
    renderConfigurator(
      makeExercise({ name: "Squat à la barre", allows_per_side: false }),
    );
    expect(screen.queryByRole("switch", { name: "Chaque côté" })).toBeNull();
  });

  it("keeps it on an older session already set side by side", () => {
    renderConfigurator(
      makeExercise({
        name: "Rowing haltères",
        allows_per_side: false,
        is_per_side: true,
      }),
    );
    expect(
      screen
        .getByRole("switch", { name: "Chaque côté" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
