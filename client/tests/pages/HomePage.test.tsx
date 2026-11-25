import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  type AppointmentListItem,
  type CurrentWorkoutSession,
  formatLongDate,
  type PublicUser,
  todayInParis,
} from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../src/contexts/AuthContext";
import {
  readAppointment,
  readAppointments,
} from "../../src/features/appointment/services/appointmentService";
import { readPrograms } from "../../src/features/program/services/programService";
import { readCurrentWorkoutSession } from "../../src/features/workout-session/services/workoutSessionService";
import HomePage from "../../src/pages/HomePage";
import { ApiError } from "../../src/services/apiError";

vi.mock("../../src/features/appointment/services/appointmentService", () => ({
  readAppointments: vi.fn(),
  readAppointment: vi.fn(),
}));
vi.mock("../../src/features/program/services/programService", () => ({
  readPrograms: vi.fn(),
}));
vi.mock(
  "../../src/features/workout-session/services/workoutSessionService",
  () => ({
    readCurrentWorkoutSession: vi.fn(),
  }),
);
const readAppointmentsMock = vi.mocked(readAppointments);
const readAppointmentMock = vi.mocked(readAppointment);
const readProgramsMock = vi.mocked(readPrograms);
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

// The home page greets the user by name (03-2): it needs the context.
const lea: PublicUser = {
  id: 1,
  username: "lea.m",
  email: "lea@exemple.fr",
  sex: "female",
};

function renderHome() {
  const auth: AuthContextValue = {
    user: lea,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/", element: <HomePage /> },
      { path: "*", element: <p>Autre page</p> },
    ],
    { initialEntries: ["/"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
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
    readAppointmentMock.mockReset();
    readAppointmentMock.mockRejectedValue(new ApiError(404, "X", "none"));
    readProgramsMock.mockReset();
    readProgramsMock.mockResolvedValue([]);
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("greets the user, dates the day and shows a loading status", () => {
    readAppointmentsMock.mockReturnValue(new Promise(() => {}));
    renderHome();

    // Screen 03-2: "Salut Lucas" is the title, the date is above it
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Salut lea.m",
    );
    expect(screen.getByText(formatLongDate(today))).toBeTruthy();
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
    expect(screen.getByRole("link", { name: "Mon planning" })).toBeTruthy();
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

    expect(screen.getByRole("link", { name: /3 aujourd'hui/ })).toBeTruthy();
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
      // The editor of the session, where the exercises are added (US-17)
    ).toBe("/seances/4/modifier");
  });

  it("puts the session in progress first and hides every other start", async () => {
    const current: CurrentWorkoutSession = {
      id: 9,
      appointment_id: 1,
      session_name: "Jambes",
      started_at: `${today}T06:04:00.000Z`,
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
          validated_sets: current.validated_sets,
          planned_sets: current.planned_sets,
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
    expect(screen.queryByText("Aucune séance prévue")).toBeNull();
    expect(screen.getByRole("link", { name: "Mon planning" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Aucune séance prévue")).toBeTruthy();
    expect(readAppointmentsMock).toHaveBeenCalledTimes(2);
  });
});

describe("HomePage · raccourcis (écran 03)", () => {
  it("shows the shortcuts of the wireframe, without doubling the main action", async () => {
    readAppointmentsMock.mockResolvedValue([]);
    readCurrentMock.mockResolvedValue(null);
    renderHome();
    await screen.findByText("Aucune séance prévue");

    // No "+" in the header: creating goes through the main action (écran 03)
    expect(
      screen.queryByRole("button", { name: "Ajouter une séance" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Créer ma première séance" })
        .getAttribute("href"),
    ).toBe("/seances/nouvelle");
    expect(screen.queryByRole("link", { name: "Créer une séance" })).toBeNull();
    expect(screen.getByRole("link", { name: "Mon planning" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Historique" })).toBeTruthy();
  });
});

describe("HomePage · séance déjà faite (correction 5)", () => {
  it("shows the status and the summary, never « Démarrer », once the session is over", async () => {
    readCurrentMock.mockResolvedValue(null);
    readAppointmentsMock.mockResolvedValue([
      appointment({
        id: 7,
        status: "attended",
        session_name: "Haut du corps",
        workout_session: {
          id: 12,
          status: "completed",
          started_at: `${today}T06:04:00.000Z`,
          validated_sets: 17,
          planned_sets: 18,
        },
      }),
    ]);
    renderHome();
    await waitForContent();

    // The chip carries its symbol: "✓ Effectuée" (03-2).
    expect(screen.getByText("✓ Effectuée")).toBeTruthy();
    expect(screen.getByText(/17 \/ 18 séries/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Voir le résumé" }).getAttribute("href"),
    ).toBe("/suivi/historique/7");
    expect(screen.queryByText(/Démarrer la séance/)).toBeNull();
  });

  it("says « Inachevée » after an abandon", async () => {
    readCurrentMock.mockResolvedValue(null);
    readAppointmentsMock.mockResolvedValue([
      appointment({
        id: 8,
        status: "attended",
        workout_session: {
          id: 13,
          status: "unfinished",
          started_at: `${today}T06:04:00.000Z`,
          validated_sets: 2,
          planned_sets: 11,
        },
      }),
    ]);
    renderHome();
    await waitForContent();

    expect(screen.getByText("Inachevée")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voir le résumé" })).toBeTruthy();
    expect(screen.queryByText(/Démarrer la séance/)).toBeNull();
  });
});
