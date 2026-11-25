import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { WorkoutSessionTree, WorkoutSetRow } from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/apiError";
import { readWorkoutSession } from "../services/workoutSessionService";
import WorkoutPage from "./WorkoutPage";

vi.mock("../services/workoutSessionService", () => ({
  readWorkoutSession: vi.fn(),
}));
const readMock = vi.mocked(readWorkoutSession);

function set(position: number, validated: boolean): WorkoutSetRow {
  return {
    id: position,
    position,
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
  blocks: [
    {
      id: 1,
      block_type: "classic",
      name: "Force",
      position: 1,
      instructions: null,
      exercises: [
        {
          id: 1,
          exercise_id: 31,
          position: 1,
          name: "Développé couché",
          meta: "Pectoraux · Barre",
          measure_codes: ["reps", "weight"],
          default_rest_seconds: 90,
          sets: [set(1, true), set(2, false), set(3, false)],
        },
      ],
    },
    {
      id: 2,
      block_type: "note",
      name: null,
      position: 2,
      instructions: "Penser à respirer.",
      exercises: [],
    },
  ],
};

function renderPage() {
  const router = createMemoryRouter(
    [{ path: "/entrainement/:id", element: <WorkoutPage /> }],
    { initialEntries: ["/entrainement/9"] },
  );
  render(<RouterProvider router={router} />);
}

describe("WorkoutPage", () => {
  beforeEach(() => {
    readMock.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-26T07:12:40.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the session in progress, its chrono from the start time and its counts", async () => {
    readMock.mockResolvedValue(tree);
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Haut du corps" }),
    ).toBeTruthy();
    expect(screen.getByText("En cours · séance libre")).toBeTruthy();
    expect(screen.getByText("12:40")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByText("Classique · Force")).toBeTruthy();
    expect(screen.getByText("1 / 3 séries")).toBeTruthy();
    expect(screen.getByText("3 séries · 10 rép. · 40 kg")).toBeTruthy();
    expect(screen.getByText("Penser à respirer.")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Terminer la séance",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("answers a missing session", async () => {
    readMock.mockRejectedValue(
      new ApiError(404, "WORKOUT_NOT_FOUND", "Cette séance n'existe pas."),
    );
    renderPage();

    expect(await screen.findByText("Séance introuvable")).toBeTruthy();
  });
});
