import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import type { AppointmentDetail } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlannedSessionPage from "../../../../src/features/appointment/pages/PlannedSessionPage";
import {
  cancelAppointment,
  markAppointmentNotDone,
  moveAppointment,
  readAppointment,
} from "../../../../src/features/appointment/services/appointmentService";
import {
  readCurrentWorkoutSession,
  startWorkoutSession,
} from "../../../../src/features/workout-session/services/workoutSessionService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock(
  "../../../../src/features/appointment/services/appointmentService",
  () => ({
    readAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
    moveAppointment: vi.fn(),
    markAppointmentNotDone: vi.fn(),
  }),
);
vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    startWorkoutSession: vi.fn(),
    readCurrentWorkoutSession: vi.fn(),
  }),
);
const readAppointmentMock = vi.mocked(readAppointment);
const cancelAppointmentMock = vi.mocked(cancelAppointment);
const moveAppointmentMock = vi.mocked(moveAppointment);
const notDoneMock = vi.mocked(markAppointmentNotDone);
const startMock = vi.mocked(startWorkoutSession);
const readCurrentMock = vi.mocked(readCurrentWorkoutSession);

const planned: AppointmentDetail = {
  id: 12,
  planned_date: "2026-11-26",
  planned_time: "18:30",
  status: "planned",
  cancelled_at: null,
  initial_date: null,
  moved_manually: false,
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
        {
          id: 1,
          exercise_id: 31,
          name: "Développé couché",
          set_summary: "4 × 8 · 60 kg",
        },
        { id: 2, exercise_id: 45, name: "Tractions", set_summary: "3 × 10" },
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
      {
        path: "/seances/:appointmentId/modifier",
        element: <p>Page modifier</p>,
      },
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
    // The mockup B1 numbers the exercises, one line each.
    expect(screen.getByText("Développé couché")).toBeTruthy();
    expect(screen.getByText("Tractions")).toBeTruthy();

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

  it("opens the ⋯ menu and leads to the editor (CAL-04m)", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );
    expect(screen.getByText("Blocs, exercices, séries")).toBeTruthy();
    expect(screen.getByText("Autre date ou heure")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /Modifier la séance/ }),
    );
    expect(await screen.findByText("Page modifier")).toBeTruthy();
  });

  it("never offers to change a session already done", async () => {
    readAppointmentMock.mockResolvedValue({
      ...planned,
      status: "attended",
      workout_session: { id: 8, status: "completed" },
    });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Modifier la séance/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("cannot start an empty session, and leads to the editor instead", async () => {
    readAppointmentMock.mockResolvedValue({ ...planned, blocks: [] });
    renderPage();
    await screen.findByText("Haut du corps");

    const add = screen.getByRole("link", { name: "Ajouter des exercices" });
    expect(add.getAttribute("href")).toBe("/seances/12/modifier");
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

describe("PlannedSessionPage · annuler (US-26)", () => {
  beforeEach(() => {
    readAppointmentMock.mockReset();
    cancelAppointmentMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("asks before cancelling, then shows the session as cancelled", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    cancelAppointmentMock.mockResolvedValue({ status: "cancelled" });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Annuler le rendez-vous/ }),
    );

    expect(screen.getByText("Annuler « Haut du corps » ?")).toBeTruthy();

    // The session comes back cancelled from the server
    readAppointmentMock.mockResolvedValue({
      ...planned,
      status: "cancelled",
      cancelled_at: "2026-11-25T20:12:00.000Z",
    });
    await user.click(screen.getByRole("button", { name: "Annuler la séance" }));

    expect(cancelAppointmentMock).toHaveBeenCalledWith(12);
    expect(
      await screen.findByText("Annulée le 25 novembre à 21:12"),
    ).toBeTruthy();
    expect(screen.getByText("Ce rendez-vous est annulé.")).toBeTruthy();
    expect(screen.queryByText(/Démarrer la séance/)).toBeNull();
  });

  it("keeps the session when the user changes his mind", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Annuler le rendez-vous/ }),
    );
    await user.click(screen.getByRole("button", { name: "Garder la séance" }));

    expect(cancelAppointmentMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Démarrer la séance/ }),
    ).toBeTruthy();
  });

  it("never offers to cancel a session already started", async () => {
    readAppointmentMock.mockResolvedValue({
      ...planned,
      status: "attended",
      workout_session: { id: 8, status: "in_progress" },
    });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );

    expect(
      (
        screen.getByRole("button", {
          name: /Annuler le rendez-vous/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

describe("PlannedSessionPage · déplacer (US-25)", () => {
  beforeEach(() => {
    readAppointmentMock.mockReset();
    moveAppointmentMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("moves the session to another day and shows where it came from", async () => {
    readAppointmentMock.mockResolvedValue(planned);
    moveAppointmentMock.mockResolvedValue({
      id: 12,
      planned_date: "2026-11-27",
      status: "planned",
    });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));

    expect(screen.getByText("Déplacer « Haut du corps »")).toBeTruthy();
    // Nothing chosen yet: the confirmation waits
    expect(
      (screen.getByRole("button", { name: "Confirmer" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await user.click(
      screen.getByRole("button", { name: /^Vendredi 27 novembre/ }),
    );

    // The session comes back moved
    readAppointmentMock.mockResolvedValue({
      ...planned,
      planned_date: "2026-11-27",
      initial_date: "2026-11-26",
      moved_manually: true,
    });
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(moveAppointmentMock).toHaveBeenCalledWith(12, "2026-11-27", "18:30");
    expect(
      await screen.findByText(
        /Prévue le 26 novembre · déplacée au 27 novembre/,
      ),
    ).toBeTruthy();
  });

  it("never offers to move a session already done", async () => {
    readAppointmentMock.mockResolvedValue({
      ...planned,
      status: "attended",
      workout_session: { id: 8, status: "completed" },
    });
    const user = renderPage();
    await screen.findByText("Haut du corps");

    await user.click(
      screen.getByRole("button", { name: "Actions de la séance" }),
    );

    expect(
      (screen.getByRole("button", { name: /Déplacer/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("PlannedSessionPage · confirmer une séance passée (US-27)", () => {
  beforeEach(() => {
    readAppointmentMock.mockReset();
    notDoneMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
  });

  it("asks the question and marks the session missed", async () => {
    const toConfirm = {
      ...planned,
      planned_date: "2026-11-24",
      status: "to_confirm" as const,
    };
    readAppointmentMock.mockResolvedValue(toConfirm);
    notDoneMock.mockResolvedValue({ status: "missed" });
    const user = renderPage();
    await screen.findByText("Tu as fait cette séance ?");

    expect(
      screen.getByText(
        "Sans réponse, elle passera « Manquée » le samedi 28 novembre à 00 h.",
      ),
    ).toBeTruthy();
    // Writing the results after the fact is US-38
    expect(
      (
        screen.getByRole("button", {
          name: "Je l'ai faite",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    readAppointmentMock.mockResolvedValue({ ...toConfirm, status: "missed" });
    await user.click(screen.getByRole("button", { name: "Pas faite" }));

    expect(notDoneMock).toHaveBeenCalledWith(12);
    expect(
      await screen.findByText(/Séance marquée comme manquée/),
    ).toBeTruthy();
  });

  it("never offers to start a session waiting for an answer", async () => {
    readAppointmentMock.mockResolvedValue({
      ...planned,
      planned_date: "2026-11-24",
      status: "to_confirm" as const,
    });
    renderPage();
    await screen.findByText("Tu as fait cette séance ?");

    expect(screen.queryByText(/Démarrer la séance/)).toBeNull();
    expect(screen.getByText("Dis-nous si tu l'as faite.")).toBeTruthy();
  });
});
