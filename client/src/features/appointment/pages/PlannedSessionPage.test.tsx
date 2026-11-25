import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import type { AppointmentDetail } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/apiError";
import {
  readCurrentWorkoutSession,
  startWorkoutSession,
} from "../../workout-session/services/workoutSessionService";
import { readAppointment } from "../services/appointmentService";
import PlannedSessionPage from "./PlannedSessionPage";

vi.mock("../services/appointmentService", () => ({
  readAppointment: vi.fn(),
}));
vi.mock("../../workout-session/services/workoutSessionService", () => ({
  startWorkoutSession: vi.fn(),
  readCurrentWorkoutSession: vi.fn(),
}));
const readAppointmentMock = vi.mocked(readAppointment);
const startMock = vi.mocked(startWorkoutSession);
const readCurrentMock = vi.mocked(readCurrentWorkoutSession);

const planned: AppointmentDetail = {
  id: 12,
  planned_date: "2026-11-26",
  planned_time: "18:30",
  status: "planned",
  session_name: "Haut du corps",
  program_name: null,
  workout_session: null,
  blocks: [
    {
      id: 1,
      block_type: "classic",
      name: "Force",
      position: 1,
      exercises: [
        { id: 1, exercise_id: 31, name: "Développé couché" },
        { id: 2, exercise_id: 45, name: "Tractions" },
      ],
    },
  ],
};

function WorkoutStub() {
  const params = useParams();
  return <p>Page entraînement {params.id}</p>;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Page accueil</p> },
      { path: "/seances/:appointmentId", element: <PlannedSessionPage /> },
      { path: "/entrainement/:id", element: <WorkoutStub /> },
    ],
    { initialEntries: ["/", "/seances/12"], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("PlannedSessionPage", () => {
  beforeEach(() => {
    readAppointmentMock.mockReset();
    startMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("shows the planned session and starts it once", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    let finish: (value: { id: number }) => void = () => {};
    startMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = renderPage();

    expect(await screen.findByText("Haut du corps")).toBeTruthy();
    expect(screen.getByText("Planifiée")).toBeTruthy();
    expect(
      screen.getByText("Jeudi 26 novembre · 18:30 · 1 bloc · 2 exercices"),
    ).toBeTruthy();
    expect(screen.getByText("Classique · Force")).toBeTruthy();
    expect(screen.getByText("Développé couché · Tractions")).toBeTruthy();

    const button = screen.getByRole("button", { name: /Démarrer la séance/ });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Démarrage…" }));

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledWith(12);

    finish({ id: 77 });
    expect(await screen.findByText("Page entraînement 77")).toBeTruthy();
  });

  it("offers to resume the session already in progress", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    startMock.mockRejectedValue(
      new ApiError(
        409,
        "WORKOUT_ALREADY_IN_PROGRESS",
        "Termine ou abandonne « Jambes » avant d'en démarrer une autre.",
      ),
    );
    readCurrentMock.mockResolvedValue({
      id: 9,
      appointment_id: 3,
      session_name: "Jambes",
      started_at: "2026-11-26T06:04:00.000Z",
      validated_sets: 2,
      planned_sets: 11,
    });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: /Démarrer la séance/ }),
    );

    expect(
      await screen.findByText("Une séance est déjà en cours"),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Reprendre « Jambes »" })
        .getAttribute("href"),
    ).toBe("/entrainement/9");
  });

  it("shows the error with a retry, and opens the session if it started anyway", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    startMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: /Démarrer la séance/ }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible de démarrer la séance.",
    );

    // The retry finds the session started on the server after all
    readCurrentMock.mockResolvedValue({
      id: 55,
      appointment_id: 12,
      session_name: "Haut du corps",
      started_at: "2026-11-26T17:30:00.000Z",
      validated_sets: 0,
      planned_sets: 6,
    });
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Page entraînement 55")).toBeTruthy();
  });

  it("cannot start an empty session, and says when it was already done", async () => {
    readAppointmentMock.mockResolvedValue({ ...planned, blocks: [] });
    renderPage();
    await screen.findByText("Haut du corps");

    const add = screen.getByRole("button", {
      name: "Ajouter des exercices",
    }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(screen.queryByText(/Démarrer la séance/)).toBeNull();
  });

  it("links to the session in progress and answers the missing one", async () => {
    readAppointmentMock.mockResolvedValue({
      ...planned,
      status: "attended",
      workout_session: { id: 8, status: "in_progress" },
    });
    renderPage();

    expect(
      (
        await screen.findByRole("link", { name: "Reprendre ma séance" })
      ).getAttribute("href"),
    ).toBe("/entrainement/8");

    readAppointmentMock.mockRejectedValue(
      new ApiError(404, "APPOINTMENT_NOT_FOUND", "Cette séance n'existe pas."),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Séance introuvable")).toBeTruthy();
    });
  });
});
