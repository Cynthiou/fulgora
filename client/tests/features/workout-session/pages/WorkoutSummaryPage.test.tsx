import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { WorkoutSessionTree, WorkoutSetRow } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutSummaryPage from "../../../../src/features/workout-session/pages/WorkoutSummaryPage";
import { readWorkoutSession } from "../../../../src/features/workout-session/services/workoutSessionService";

vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    readWorkoutSession: vi.fn(),
  }),
);
const readMock = vi.mocked(readWorkoutSession);

function set(
  id: number,
  reps: number | null,
  weight: number | null,
): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: 10,
    reps_actual: reps,
    weight_planned_kg: 40,
    weight_actual_kg: weight,
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
    validated_at: reps === null ? null : "2026-11-26T07:10:00.000Z",
    weight_left_planned_kg: null,
    weight_right_planned_kg: null,
    updated_at: null,
    is_added: false,
    sides: [],
  };
}

const completed: WorkoutSessionTree = {
  id: 9,
  appointment_id: 1,
  session_name: "Haut du corps",
  program_name: null,
  status: "completed",
  started_at: "2026-11-26T07:00:00.000Z",
  ended_at: "2026-11-26T07:48:00.000Z",
  auto_closed: false,
  declared_afterwards: false,
  blocks: [
    {
      id: 1,
      block_type: "classic",
      name: "Force",
      position: 1,
      instructions: null,
      planned_rounds: null,
      time_limit_seconds: null,
      completed_rounds: null,
      extra_reps: null,
      actual_duration_seconds: null,
      is_added: false,
      exercises: [
        {
          id: 11,
          exercise_id: 31,
          position: 1,
          name: "Développé couché",
          meta: null,
          measure_codes: ["reps", "weight"],
          is_bodyweight: false,
          is_per_side: false,
          default_rest_seconds: 90,
          is_added: false,
          sets: [set(1, 10, 40), set(2, 8, 40), set(3, 10, 40)],
        },
        {
          id: 12,
          exercise_id: 45,
          position: 2,
          name: "Tractions",
          meta: null,
          measure_codes: ["reps"],
          is_bodyweight: false,
          is_per_side: false,
          default_rest_seconds: 90,
          is_added: false,
          sets: [set(4, 8, null), set(5, null, null)],
        },
      ],
    },
  ],
};

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/entrainement/:id", element: <p>Page entraînement</p> },
      { path: "/entrainement/:id/resume", element: <WorkoutSummaryPage /> },
    ],
    { initialEntries: ["/entrainement/9/resume"] },
  );
  render(<RouterProvider router={router} />);
}

describe("WorkoutSummaryPage", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("shows the figures computed from the results and one line per exercise", async () => {
    readMock.mockResolvedValue(completed);
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Résumé" }),
    ).toBeTruthy();
    expect(screen.getByText("Haut du corps · jeudi 26 novembre")).toBeTruthy();
    expect(screen.getByText(/Terminée/)).toBeTruthy();
    expect(screen.getByText("48 min")).toBeTruthy();
    expect(screen.getByText("4 / 5")).toBeTruthy();
    // (10 + 8 + 10) x 40 = 1 120 kg; the pull-ups carry no weight
    expect(screen.getByText(/^1\s120 kg$/)).toBeTruthy();
    expect(screen.getByText("3 / 3 · 10, 8, 10 rép.")).toBeTruthy();
    expect(screen.getByText("1 / 2 · 8 rép. · série 2 non faite")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Retour au planning" })
        .getAttribute("href"),
    ).toBe("/planning");
  });

  it("says « Inachevée » after an abandon and sends a running session back", async () => {
    readMock.mockResolvedValue({ ...completed, status: "unfinished" });
    renderPage();
    expect(await screen.findByText(/Inachevée/)).toBeTruthy();

    readMock.mockResolvedValue({
      ...completed,
      status: "in_progress",
      ended_at: null,
    });
    renderPage();
    expect(await screen.findByText("Page entraînement")).toBeTruthy();
  });
});
