import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { type AppointmentListItem, addDays, todayInParis } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanningPage from "../../../../src/features/appointment/pages/PlanningPage";
import { readAppointments } from "../../../../src/features/appointment/services/appointmentService";
import { startWorkoutSession } from "../../../../src/features/workout-session/services/workoutSessionService";

vi.mock(
  "../../../../src/features/appointment/services/appointmentService",
  () => ({
    readAppointments: vi.fn(),
  }),
);
vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    startWorkoutSession: vi.fn(),
    readCurrentWorkoutSession: vi.fn(),
  }),
);
const readAppointmentsMock = vi.mocked(readAppointments);
const startMock = vi.mocked(startWorkoutSession);

const today = todayInParis();
const tomorrow = addDays(today, 1);

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

function renderPlanning(entry = "/planning") {
  const router = createMemoryRouter(
    [
      { path: "/planning", element: <PlanningPage /> },
      { path: "*", element: <p>Autre page</p> },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("PlanningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readAppointmentsMock.mockResolvedValue([]);
  });

  it("opens on the month, with the legend and the day of today", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 1, session_name: "Dos" }),
    ]);
    renderPlanning();

    expect(
      await screen.findByRole("table", { name: /^Calendrier de/ }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Légende des statuts")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Mois" }).ariaSelected).toBe("true");
    expect(screen.getByText(/· 1 séance$/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Dos/ })).toBeTruthy();
  });

  it("walks from a month to the next one", async () => {
    renderPlanning();
    const user = await Promise.resolve(userEvent.setup());
    const title = (await screen.findByRole("table")).textContent;

    await user.click(screen.getByRole("button", { name: "Mois suivant" }));

    await waitFor(() => {
      expect(screen.getByRole("table").textContent).not.toBe(title);
    });
    expect(screen.getByText(/Revenir à aujourd'hui/)).toBeTruthy();
  });

  it("shows the week view, one line per day", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 1, session_name: "Dos", planned_time: "12:00" }),
    ]);
    const user = renderPlanning();
    await screen.findByRole("table");

    await user.click(screen.getByRole("tab", { name: "Semaine" }));

    expect(await screen.findByText("12:00")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("starts the next session of the day from the day view", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 4, session_name: "Jambes", planned_time: "07:00" }),
    ]);
    startMock.mockResolvedValue({ id: 77 });
    const user = renderPlanning(`/planning?vue=jour&jour=${today}`);

    expect(await screen.findByText("À suivre")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Démarrer Jambes/ }));

    expect(startMock).toHaveBeenCalledWith(4);
    expect(await screen.findByText("Autre page")).toBeTruthy();
  });

  it("offers to create a session on an empty day, and names the next one", async () => {
    readAppointmentsMock.mockResolvedValue([
      appointment({ id: 5, planned_date: tomorrow, session_name: "Mobilité" }),
    ]);
    renderPlanning(`/planning?vue=jour&jour=${today}`);

    expect(await screen.findByText("Rien de prévu aujourd'hui")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Créer une séance/ })
        .getAttribute("href"),
    ).toBe(`/seances/nouvelle?date=${today}`);
    expect(screen.getByText("Prochaine séance")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Mobilité/ })).toBeTruthy();
  });

  it("puts a session done in advance on its real day, and leaves a reminder", async () => {
    const plannedDay = addDays(today, 2);
    readAppointmentsMock.mockResolvedValue([
      appointment({
        id: 6,
        session_name: "Haut du corps",
        planned_date: plannedDay,
        status: "attended",
        workout_session: {
          id: 9,
          status: "completed",
          started_at: `${today}T17:30:00.000Z`,
          validated_sets: 6,
          planned_sets: 6,
        },
      }),
    ]);
    renderPlanning(`/planning?vue=jour&jour=${today}`);

    expect(await screen.findByText(/prévue le/)).toBeTruthy();
    expect(screen.getByText(/1 séance · 1 effectuée$/)).toBeTruthy();
  });

  it("says when the planning cannot be loaded", async () => {
    readAppointmentsMock.mockRejectedValue(new Error("coupure"));
    renderPlanning();

    expect(
      await screen.findByText("Impossible de charger ton planning."),
    ).toBeTruthy();
  });
});
