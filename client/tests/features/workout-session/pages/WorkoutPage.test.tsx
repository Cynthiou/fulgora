import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { WorkoutSessionTree, WorkoutSetRow } from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutPage from "../../../../src/features/workout-session/pages/WorkoutPage";
import {
  abandonWorkoutSession,
  completeWorkoutSession,
  readWorkoutSession,
} from "../../../../src/features/workout-session/services/workoutSessionService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    readWorkoutSession: vi.fn(),
    abandonWorkoutSession: vi.fn(),
    completeWorkoutSession: vi.fn(),
  }),
);
const readMock = vi.mocked(readWorkoutSession);
const abandonMock = vi.mocked(abandonWorkoutSession);
const completeMock = vi.mocked(completeWorkoutSession);

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
    updated_at: null,
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
          id: 1,
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
      ],
    },
    {
      id: 2,
      block_type: "note",
      name: null,
      position: 2,
      instructions: "Penser à respirer.",
      is_added: false,
      exercises: [],
    },
  ],
};

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/entrainement/:id", element: <WorkoutPage /> },
      { path: "/entrainement/:id/resume", element: <p>Page résumé</p> },
    ],
    { initialEntries: ["/entrainement/9"] },
  );
  render(<RouterProvider router={router} />);
}

describe("WorkoutPage", () => {
  beforeEach(() => {
    readMock.mockReset();
    abandonMock.mockReset();
    completeMock.mockReset();
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
    // A started exercise shows how far it has gone, not its plan (B2)
    expect(screen.getByText("1 / 3 séries")).toBeTruthy();
    expect(screen.queryByText("3 séries · 10 rép. · 40 kg")).toBeNull();
    expect(screen.getByText("Penser à respirer.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Terminer la séance" }),
    ).toBeTruthy();
  });

  it("abandons after a confirmation, keeps the sets and shows the session as unfinished", async () => {
    readMock.mockResolvedValue(tree);
    abandonMock.mockResolvedValue({
      ...tree,
      status: "unfinished",
      ended_at: "2026-11-26T07:30:00.000Z",
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Haut du corps" });

    await user.click(screen.getByRole("button", { name: "Abandonner" }));
    expect(screen.getByText("Abandonner cette séance ?")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Continuer ma séance" }),
    );
    expect(abandonMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Abandonner cette séance ?")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Abandonner" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Abandonner",
      }),
    );

    expect(abandonMock).toHaveBeenCalledWith(9);
    expect(await screen.findByText("Page résumé")).toBeTruthy();
  });

  it("asks how many sets are undone, completes and opens the summary", async () => {
    readMock.mockResolvedValue(tree);
    completeMock.mockResolvedValue({
      ...tree,
      status: "completed",
      ended_at: "2026-11-26T07:48:00.000Z",
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Haut du corps" });

    await user.click(
      screen.getByRole("button", { name: "Terminer la séance" }),
    );

    expect(screen.getByText("Terminer la séance ?")).toBeTruthy();
    expect(
      screen.getByText(
        "2 séries ne sont pas faites. Elles resteront non faites dans ton historique.",
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Terminer" }));

    expect(completeMock).toHaveBeenCalledWith(9);
    expect(await screen.findByText("Page résumé")).toBeTruthy();
  });

  it("refuses to complete without any validated set and offers to abandon", async () => {
    readMock.mockResolvedValue(tree);
    completeMock.mockRejectedValue(
      new ApiError(
        422,
        "NO_VALIDATED_SET",
        "Aucune série n'est faite. Tu peux abandonner la séance.",
      ),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Haut du corps" });

    await user.click(
      screen.getByRole("button", { name: "Terminer la séance" }),
    );
    await user.click(screen.getByRole("button", { name: "Terminer" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Aucune série n'est faite. Tu peux abandonner la séance.",
    );
    await user.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "Abandonner",
      }),
    );
    expect(screen.getByText("Abandonner cette séance ?")).toBeTruthy();
  });

  it("shows the message of a session closed after 4 hours, and a retry on error", async () => {
    readMock.mockResolvedValue({
      ...tree,
      status: "unfinished",
      ended_at: "2026-11-26T11:00:00.000Z",
      auto_closed: true,
    });
    renderPage();

    expect(
      await screen.findByText(/clôturée après 4 heures sans activité/),
    ).toBeTruthy();

    readMock.mockResolvedValue(tree);
    abandonMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    const buttons = await screen.findAllByRole("button", {
      name: "Abandonner",
    });
    await user.click(buttons[buttons.length - 1] as HTMLElement);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Abandonner",
      }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Impossible d'abandonner la séance. Réessaie.",
      );
    });
  });

  it("answers a missing session", async () => {
    readMock.mockRejectedValue(
      new ApiError(404, "WORKOUT_NOT_FOUND", "Cette séance n'existe pas."),
    );
    renderPage();

    expect(await screen.findByText("Séance introuvable")).toBeTruthy();
  });
});
