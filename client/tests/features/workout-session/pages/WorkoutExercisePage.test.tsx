import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import type { WorkoutSessionTree, WorkoutSetRow } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutExercisePage from "../../../../src/features/workout-session/pages/WorkoutExercisePage";
import {
  addWorkoutSet,
  readWorkoutSession,
  removeWorkoutSet,
  validateSet,
} from "../../../../src/features/workout-session/services/workoutSessionService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    readWorkoutSession: vi.fn(),
    validateSet: vi.fn(),
    addWorkoutSet: vi.fn(),
    removeWorkoutSet: vi.fn(),
  }),
);
const readMock = vi.mocked(readWorkoutSession);
const validateMock = vi.mocked(validateSet);
const addSetMock = vi.mocked(addWorkoutSet);
const removeSetMock = vi.mocked(removeWorkoutSet);

function set(id: number, validated: boolean): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: 10,
    reps_actual: validated ? 10 : null,
    weight_planned_kg: 40,
    weight_actual_kg: validated ? 40 : null,
    duration_planned_seconds: null,
    duration_actual_seconds: null,
    distance_planned_meters: null,
    distance_actual_meters: null,
    speed_planned_kmh: null,
    speed_actual_kmh: null,
    resistance_planned: null,
    resistance_actual: null,
    incline_planned_percent: null,
    incline_actual_percent: null,
    calories_planned: null,
    calories_actual: null,
    planned_rest_seconds: null,
    validated_at: validated ? "2026-11-26T07:05:00.000Z" : null,
    is_added: false,
  };
}

const tree: WorkoutSessionTree = {
  id: 9,
  appointment_id: 1,
  session_name: "Haut du corps",
  program_name: null,
  status: "in_progress",
  started_at: "2026-11-26T07:00:00.000Z",
  ended_at: null,
  auto_closed: false,
  blocks: [
    {
      id: 1,
      block_type: "classic",
      name: "Force",
      position: 1,
      instructions: null,
      is_added: false,
      exercises: [
        {
          id: 11,
          exercise_id: 31,
          position: 1,
          name: "Développé couché",
          meta: "Pectoraux · Barre",
          measure_codes: ["reps", "weight"],
          is_bodyweight: false,
          default_rest_seconds: 90,
          is_added: false,
          sets: [set(1, true), set(2, false), set(3, false)],
        },
        {
          id: 12,
          exercise_id: 45,
          position: 2,
          name: "Tractions",
          meta: "Dos · Poids du corps",
          measure_codes: ["reps"],
          is_bodyweight: false,
          default_rest_seconds: 120,
          is_added: false,
          sets: [set(4, false)],
        },
      ],
    },
  ],
};

function Stub() {
  const params = useParams();
  return (
    <p>
      Page {params.id ?? "entraînement"} / {params.exerciseId ?? "liste"}
    </p>
  );
}

function renderPage(exerciseId = 11) {
  const router = createMemoryRouter(
    [
      { path: "/entrainement/:id", element: <Stub /> },
      {
        path: "/entrainement/:id/exercices/:exerciseId",
        element: <WorkoutExercisePage />,
      },
    ],
    { initialEntries: [`/entrainement/9/exercices/${exerciseId}`] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("WorkoutExercisePage", () => {
  beforeEach(() => {
    readMock.mockReset();
    validateMock.mockReset();
    readMock.mockResolvedValue(tree);
  });

  it("shows the done, active and upcoming sets, and validates the plan in one tap", async () => {
    validateMock.mockResolvedValue({
      ...set(2, true),
      validated_at: "2026-11-26T07:20:00.000Z",
      is_added: false,
    });
    const user = renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Développé couché",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Exercice 1 / 2 · repos 1 min 30 s")).toBeTruthy();
    expect(screen.getByText("Série 1").textContent).toContain("Série 1");
    expect(screen.getByText("10 rép. · 40 kg")).toBeTruthy();
    expect(screen.getByText(/Série 2 \/ 3/)).toBeTruthy();
    expect(screen.getByText(/prévu 10 rép. · 40 kg/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Faire la série 3" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Suivant : Tractions/ }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Valider la série 2" }),
    );

    expect(validateMock).toHaveBeenCalledWith(2, {
      reps: 10,
      weight_kg: 40,
      duration_seconds: null,
      distance_meters: null,
      speed_kmh: null,
      resistance: null,
      incline_percent: null,
      calories: null,
    });
    // The rest starts right away (B4), then the exercise comes back
    expect(screen.getByText("Repos · 1 min 30 s par défaut")).toBeTruthy();
    expect(
      screen.getByText("Ensuite : série 3 · prévu 10 rép. · 40 kg"),
    ).toBeTruthy();
    expect(screen.getByText("1:30")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Passer le repos" }));

    // Set 2 is done, set 3 becomes the active one
    expect(
      await screen.findByRole("button", { name: "Valider la série 3" }),
    ).toBeTruthy();
    expect(screen.getAllByText("10 rép. · 40 kg")).toHaveLength(2);
  });

  it("records other values through « Modifier » and lets a set be picked", async () => {
    validateMock.mockImplementation(async (id, values) => ({
      ...set(id, true),
      reps_actual: values.reps,
      weight_actual_kg: values.weight_kg,
    }));
    const user = renderPage();
    await screen.findByText(/Série 2 \/ 3/);

    await user.click(screen.getByRole("button", { name: "Faire la série 3" }));
    expect(
      screen.getByRole("button", { name: "Valider la série 3" }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /^Modifier la série/ }),
    );
    expect(screen.getByText("Ce que tu as réellement fait")).toBeTruthy();
    const reps = screen.getByLabelText(
      "Répétitions · prévu 10",
    ) as HTMLInputElement;
    expect(reps.value).toBe("10");
    await user.click(
      screen.getByRole("button", { name: "Diminuer Répétitions · prévu 10" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Diminuer Répétitions · prévu 10" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Valider la série 3",
      }),
    );

    expect(validateMock).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ reps: 8, weight_kg: 40 }),
    );
    // Last set of the exercise: the rest announces the next exercise
    expect(
      screen.getByText("Ensuite : exercice suivant, Tractions"),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Passer le repos" }));
    expect(await screen.findByText("8 rép. · 40 kg")).toBeTruthy();
  });

  it("refuses an empty set in the sheet, then goes back on a server error", async () => {
    validateMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    const user = renderPage();
    await screen.findByText(/Série 2 \/ 3/);

    await user.click(
      screen.getByRole("button", { name: /^Modifier la série/ }),
    );
    await user.clear(screen.getByLabelText("Répétitions · prévu 10"));
    await user.clear(screen.getByLabelText("Charge (kg) · prévu 40"));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Valider la série 2",
      }),
    );
    expect(
      screen.getByText("Indique au moins une valeur pour valider la série."),
    ).toBeTruthy();
    expect(validateMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    await user.click(
      screen.getByRole("button", { name: "Valider la série 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Passer le repos" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "La série n'a pas été enregistrée. Réessaie.",
    );
    // Back to the previous state: set 2 is still the one to do
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Valider la série 2" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("offers the way back on the last exercise", async () => {
    renderPage(12);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tractions" }),
    ).toBeTruthy();
    expect(screen.getByText("Exercice 2 / 2 · repos 2 min")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Retour aux exercices" })
        .getAttribute("href"),
    ).toBe("/entrainement/9");
  });
});

describe("WorkoutExercisePage · ajouter et retirer une série (US-32)", () => {
  beforeEach(() => {
    readMock.mockReset();
    validateMock.mockReset();
    addSetMock.mockReset();
    removeSetMock.mockReset();
  });

  it("adds a set at the end of the exercise", async () => {
    readMock.mockResolvedValue(tree);
    addSetMock.mockResolvedValue({ id: 99 });
    const user = renderPage();
    await screen.findByText("Développé couché");

    await user.click(screen.getByRole("button", { name: "Ajouter une série" }));

    expect(addSetMock).toHaveBeenCalledWith(11);
  });

  it("removes a set that was added, never a planned one", async () => {
    const added: WorkoutSetRow = {
      ...set(5, false),
      reps_planned: null,
      weight_planned_kg: null,
      is_added: true,
    };
    readMock.mockResolvedValue({
      ...tree,
      blocks: [
        {
          ...tree.blocks[0],
          exercises: [
            {
              ...tree.blocks[0].exercises[0],
              sets: [set(1, true), set(2, false), added],
            },
            tree.blocks[0].exercises[1],
          ],
        },
      ],
    });
    removeSetMock.mockResolvedValue(undefined);
    const user = renderPage();
    await screen.findByText("Développé couché");

    // Only the added set carries a trash
    const trashes = screen.getAllByRole("button", {
      name: /^Retirer la série/,
    });
    expect(trashes).toHaveLength(1);

    await user.click(trashes[0]);
    expect(removeSetMock).toHaveBeenCalledWith(5);
  });
});

describe("WorkoutExercisePage · pas de repos après la dernière série (US-30)", () => {
  beforeEach(() => {
    readMock.mockReset();
    validateMock.mockReset();
    addSetMock.mockReset();
    removeSetMock.mockReset();
  });

  it("goes back to the exercises instead of resting", async () => {
    // One exercise, one set left to do: it is the last of the session.
    const lastOne: WorkoutSessionTree = {
      ...tree,
      blocks: [
        {
          ...tree.blocks[0],
          exercises: [
            {
              ...tree.blocks[0].exercises[0],
              sets: [set(1, true), set(2, false)],
            },
          ],
        },
      ],
    };
    readMock.mockResolvedValue(lastOne);
    validateMock.mockResolvedValue({ ...set(2, true) });
    const user = renderPage();
    await screen.findByText("Développé couché");

    await user.click(
      screen.getByRole("button", { name: /Valider la série 2/ }),
    );

    expect(await screen.findByText("Page 9 / liste")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Repos" }),
    ).toBeNull();
  });

  it("still rests when a set remains elsewhere in the session", async () => {
    readMock.mockResolvedValue(tree);
    validateMock.mockResolvedValue({ ...set(2, true) });
    const user = renderPage();
    await screen.findByText("Développé couché");

    await user.click(
      screen.getByRole("button", { name: /Valider la série 2/ }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Repos" }),
    ).toBeTruthy();
  });
});
