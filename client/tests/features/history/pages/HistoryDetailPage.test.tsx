import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { HistoryDetail, WorkoutSetRow } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryDetailPage from "../../../../src/features/history/pages/HistoryDetailPage";
import { readHistoryDetail } from "../../../../src/features/history/services/historyService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock("../../../../src/features/history/services/historyService", () => ({
  readHistoryDetail: vi.fn(),
}));
const readMock = vi.mocked(readHistoryDetail);

function set(
  id: number,
  planned: [number, number],
  actual: [number, number] | null,
): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: planned[0],
    reps_actual: actual?.[0] ?? null,
    reps_left_planned: null,
    reps_right_planned: null,
    weight_planned_kg: planned[1],
    weight_actual_kg: actual?.[1] ?? null,
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
    validated_at: actual === null ? null : "2026-11-19T06:10:00.000Z",
    weight_left_planned_kg: null,
    weight_right_planned_kg: null,
    updated_at: null,
    is_added: false,
    sides: [],
  };
}

const done: HistoryDetail = {
  kind: "done",
  appointment: {
    id: 5,
    planned_date: "2026-11-19",
    planned_time: "07:00",
    status: "attended",
    session_name: "Jambes",
    program_name: null,
  },
  workout: {
    id: 9,
    appointment_id: 5,
    session_name: "Jambes",
    program_name: null,
    status: "completed",
    started_at: "2026-11-19T06:02:00.000Z",
    ended_at: "2026-11-19T06:54:00.000Z",
    auto_closed: false,
    declared_afterwards: false,
    blocks: [
      {
        id: 1,
        block_type: "classic",
        name: null,
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
            exercise_id: 12,
            position: 1,
            name: "Squat à la barre",
            meta: "Jambes · Barre",
            measure_codes: ["reps", "weight"],
            is_bodyweight: false,
            is_per_side: false,
            default_rest_seconds: 90,
            is_added: false,
            sets: [
              set(1, [8, 60], [8, 60]),
              set(2, [8, 60], [7, 60]),
              set(3, [8, 60], [8, 62.5]),
              set(4, [8, 60], null),
            ],
          },
        ],
      },
    ],
  },
};

const missed: HistoryDetail = {
  kind: "planned_only",
  appointment: {
    id: 6,
    planned_date: "2026-11-21",
    planned_time: null,
    status: "missed",
    session_name: "Course",
    program_name: "Cardio base",
  },
  blocks: [
    {
      id: 2,
      block_type: "classic",
      name: null,
      position: 1,
      exercises: [
        {
          id: 21,
          name: "Tapis de course",
          meta: "Cardio · Cardio",
          measure_codes: [
            "duration",
            "distance",
            "speed",
            "incline",
            "calories",
          ],
          is_bodyweight: false,
          is_per_side: false,
          default_rest_seconds: null,
          sets: [
            {
              reps: null,
              weight_kg: null,
              reps_left: null,
              reps_right: null,
              weight_left_kg: null,
              weight_right_kg: null,
              duration_seconds: 1800,
              distance_meters: null,
              speed_kmh: 9,
              resistance: null,
              incline_percent: 1,
              calories: null,
              rest_after_seconds: null,
            },
          ],
        },
      ],
    },
  ],
};

function renderPage(id = 5) {
  const router = createMemoryRouter(
    [
      { path: "/suivi", element: <p>Page historique</p> },
      {
        path: "/suivi/historique/:appointmentId",
        element: <HistoryDetailPage />,
      },
    ],
    { initialEntries: [`/suivi/historique/${id}`] },
  );
  render(<RouterProvider router={router} />);
}

describe("HistoryDetailPage", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("compares planned and done, set by set, with the figures of the session", async () => {
    readMock.mockResolvedValue(done);
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Jambes" }),
    ).toBeTruthy();
    // The chip of the status, then the line with the date (SUI-06).
    expect(screen.getByText("✓ Effectuée")).toBeTruthy();
    expect(
      screen.getByText(/^Effectuée jeudi 19 novembre · \d{2}:\d{2}$/),
    ).toBeTruthy();
    expect(screen.getByText("Séance libre")).toBeTruthy();
    expect(screen.getByText("52 min")).toBeTruthy();
    // (8 + 7) x 60 + 8 x 62,5 = 1 400 kg
    expect(screen.getByText(/^1\s400 kg$/)).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText("2 / 3 objectifs")).toBeTruthy();

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
      // The mockup writes what was done first, then the plan (SUI-06).
    ).toEqual(["Série", "Réalisé", "Prévu", "Écart"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "S118 × 60 kgprévu 8 × 60 kg=",
      "S227 × 60 kgprévu 8 × 60 kg▼ 1 rép.",
      "S338 × 62,5 kgprévu 8 × 60 kg▲ 2,5 kg",
      "S44Non faiteprévu 8 × 60 kg—",
    ]);
  });

  it("shows only the plan of a missed session, without tonnage nor corrections", async () => {
    readMock.mockResolvedValue(missed);
    renderPage(6);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Course" }),
    ).toBeTruthy();
    expect(screen.getByText(/Manquée/)).toBeTruthy();
    expect(
      screen.getByText("Prévue samedi 21 novembre · sans heure"),
    ).toBeTruthy();
    expect(screen.getByText("Cardio base")).toBeTruthy();
    expect(
      screen.getByText("Aucun résultat : seul le prévu est affiché."),
    ).toBeTruthy();
    expect(screen.getByText("1 × 30:00 · 9 km/h · 1 %")).toBeTruthy();
    expect(screen.queryByText("Corriger les résultats")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("answers a missing session with a way back to the history", async () => {
    readMock.mockRejectedValue(
      new ApiError(404, "APPOINTMENT_NOT_FOUND", "Cette séance n'existe pas."),
    );
    renderPage(99);

    expect(await screen.findByText("Séance introuvable")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Retour à l'historique" })
        .getAttribute("href"),
    ).toBe("/suivi");
  });
});
