import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  type AppointmentListItem,
  type CurrentWorkoutSession,
  formatLongDate,
  todayInParis,
} from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readAppointments } from "../features/appointment/services/appointmentService";
import { readCurrentWorkoutSession } from "../features/workout-session/services/workoutSessionService";
import { ApiError } from "../services/apiError";
import HomePage from "./HomePage";

vi.mock("../features/appointment/services/appointmentService", () => ({
  readAppointments: vi.fn(),
}));
vi.mock("../features/workout-session/services/workoutSessionService", () => ({
  readCurrentWorkoutSession: vi.fn(),
}));
const readAppointmentsMock = vi.mocked(readAppointments);
const readCurrentMock = vi.mocked(readCurrentWorkoutSession);

const today = todayInParis();

function appointment(
  overrides: Partial<AppointmentListItem> & { id: number },
): AppointmentListItem {
  return {
    planned_date: today,
    planned_time: "07:00",
    status: "planned",
    moved_manually: false,
    initial_date: null,
    session_version_id: overrides.id,
    session_name: "Jambes",
    program: null,
    block_count: 1,
    exercise_count: 3,
    workout_session: null,
    ...overrides,
  };
}

function renderHome() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <HomePage /> },
      { path: "*", element: <p>Autre page</p> },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

async function waitForContent() {
  await waitFor(() => {
    expect(screen.queryByRole("status")).toBeNull();
  });
}

describe("HomePage", () => {
  beforeEach(() => {
    readAppointmentsMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("shows today's date and a loading status first", () => {
    readAppointmentsMock.mockReturnValue(new Promise(() => {}));
    renderHome();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      formatLongDate(today),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Chargement de l'accueil",
    );
  });

  it("invites a beginner to create a first session", async () => {
    readAppointmentsMock.mockResolvedValue([]);
    renderHome();
    await waitForContent();

    expect(screen.getByText("Aucune séance prévue")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Créer ma première séance" }),
    ).toBeTruthy();
    // Already the main action: not repeated in the quick actions.
    expect(screen.queryByRole("link", { name: "Créer une séance" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Voir mon planning" }),
    ).toBeTruthy();
    expect(screen.getByText(/Aucun programme en cours/)).toBeTruthy();
  });

  it("says « Créer une séance » when other sessions exist", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 1, planned_date: "2000-01-01" }),
    ]);
    renderHome();
    await waitForContent();

    expect(screen.getByRole("link", { name: "Créer une séance" })).toBeTruthy();
  });

  it("shows the first session of the day and lets the user pick another", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 3, planned_time: null, session_name: "Course" }),
      appointment({
        id: 2,
        planned_time: "12:30",
        session_name: "Dos",
        block_count: 2,
        exercise_count: 5,
      }),
      appointment({
        id: 1,
        planned_time: "07:00",
        session_name: "Jambes",
        program: { id: 1, name: "Force 8 sem." },
      }),
    ]);
    const user = renderHome();
    await waitForContent();

    expect(screen.getByText("3 aujourd'hui")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Jambes",
    );
    expect(screen.getByText("07:00")).toBeTruthy();
    expect(screen.getByText("Force 8 sem.")).toBeTruthy();
    expect(screen.getByText("1 bloc · 3 exercices")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Démarrer la séance/ })
        .getAttribute("href"),
    ).toBe("/seances/1");

    await user.selectOptions(screen.getByRole("combobox"), "3");

    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Course",
    );
    expect(screen.getByText("Sans heure")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Créer une séance" })).toBeTruthy();
  });

  it("offers to add exercises to an empty session", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 4, block_count: 0, exercise_count: 0 }),
    ]);
    renderHome();
    await waitForContent();

    expect(
      screen
        .getByRole("link", { name: "Ajouter des exercices" })
        .getAttribute("href"),
    ).toBe("/seances/4");
  });

  it("puts the session in progress first and hides every other start", async () => {
    const current: CurrentWorkoutSession = {
      id: 9,
      session_name: "Jambes",
      started_at: "2026-11-26T06:04:00.000Z",
      validated_sets: 6,
      planned_sets: 11,
    };
    readCurrentMock.mockResolvedValue(current);
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 1, planned_time: "07:00", session_name: "Dos" }),
      appointment({
        id: 2,
        planned_time: "12:30",
        session_name: "Jambes",
        workout_session: {
          id: 9,
          status: "in_progress",
          started_at: current.started_at,
        },
      }),
    ]);
    const user = renderHome();
    await waitForContent();

    expect(screen.getByText("En cours")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Jambes",
    );
    expect(screen.getByText("Commencée à 07:04 · 6 / 11 séries")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Reprendre ma séance" })
        .getAttribute("href"),
    ).toBe("/entrainement/9");

    await user.selectOptions(screen.getByRole("combobox"), "1");

    expect(
      screen.queryByRole("link", { name: /Démarrer la séance/ }),
    ).toBeNull();
    expect(screen.getByText("Une séance est en cours")).toBeTruthy();
  });

  it("shows one single error and retries on demand", async () => {
    readAppointmentsMock
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce([]);
    const user = renderHome();
    await waitForContent();

    expect(screen.getByRole("alert").textContent).toContain(
      "Impossible de charger tes séances",
    );
    expect(screen.queryByText("Séance du jour")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Voir mon planning" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Aucune séance prévue")).toBeTruthy();
    expect(readAppointmentsMock).toHaveBeenCalledTimes(2);
  });
});

describe("HomePage · « + » (US-23)", () => {
  it("opens the choice of a free session planned today", async () => {
    readAppointmentsMock.mockResolvedValue([]);
    readCurrentMock.mockResolvedValue(null);
    renderHome();
    const user = userEvent.setup();
    await screen.findByText("Aucune séance prévue");

    await user.click(
      screen.getByRole("button", { name: "Ajouter une séance" }),
    );

    expect(screen.getByText("Nouvelle séance")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /^Séance libre/ }).getAttribute("href"),
    ).toBe(`/seances/nouvelle?date=${today}`);
  });
});
