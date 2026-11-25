import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  createEmptySet,
  type EditableSession,
  type PlannedSetValues,
} from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readEditableSession,
  updateSession,
} from "../../../../src/features/appointment/services/appointmentService";
import EditSessionPage from "../../../../src/features/session-template/pages/EditSessionPage";
import { ApiError } from "../../../../src/services/apiError";

vi.mock(
  "../../../../src/features/appointment/services/appointmentService",
  () => ({
    createFreeSession: vi.fn(),
    readEditableSession: vi.fn(),
    updateSession: vi.fn(),
  }),
);
const readEditableSessionMock = vi.mocked(readEditableSession);
const updateSessionMock = vi.mocked(updateSession);

function set(values: Partial<PlannedSetValues>): PlannedSetValues {
  return { ...createEmptySet(), ...values };
}

const saved: EditableSession = {
  appointment_id: 12,
  session_version_id: 4,
  program_name: null,
  can_apply_to_following: false,
  session: {
    name: "Jambes",
    planned_date: "2026-11-26",
    planned_time: "07:00",
    blocks: [
      {
        key: "bloc-1",
        block_type: "classic",
        name: "Force",
        instructions: null,
        exercises: [
          {
            key: "ex-1",
            exercise_id: 31,
            name: "Squat à la barre",
            meta: "Jambes · Barre",
            measure_codes: ["reps", "weight"],
            is_bodyweight: false,
            default_rest_seconds: 90,
            sets: [set({ reps: 8, weight_kg: 60 })],
          },
        ],
      },
    ],
  },
};

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: "/seances/:appointmentId/modifier",
        element: <EditSessionPage />,
      },
      { path: "/seances/:appointmentId", element: <p>Page séance</p> },
      { path: "/planning", element: <p>Page planning</p> },
    ],
    { initialEntries: ["/seances/12/modifier"] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("EditSessionPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    readEditableSessionMock.mockResolvedValue(structuredClone(saved));
  });

  it("opens the editor on the saved session, without its date", async () => {
    renderPage();

    expect(await screen.findByText("Modifier la séance")).toBeTruthy();
    expect(
      (screen.getByLabelText(/Nom de la séance/) as HTMLInputElement).value,
    ).toBe("Jambes");
    expect(
      screen.getByRole("button", { name: /Classique · Force/ }),
    ).toBeTruthy();
    // The date is read only: moving a session is US-25
    expect(screen.queryByLabelText(/Heure/)).toBeNull();
    expect(
      screen.getByText("Pour changer la date ou l'heure : « Déplacer »."),
    ).toBeTruthy();
  });

  it("keeps the validation closed while nothing changed", async () => {
    renderPage();
    await screen.findByText("Modifier la séance");

    const review = screen.getByRole("button", {
      name: "Vérifier les changements",
    }) as HTMLButtonElement;
    expect(review.disabled).toBe(true);
    expect(screen.getByText("Rien n'a changé pour l'instant.")).toBeTruthy();
  });

  it("lists the changes, then saves them as a new version", async () => {
    updateSessionMock.mockResolvedValue({
      version_id: 9,
      updated_appointment_ids: [12],
    });
    const user = renderPage();
    await screen.findByText("Modifier la séance");

    const name = screen.getByLabelText(/Nom de la séance/);
    await user.clear(name);
    await user.type(name, "Bas du corps");
    await user.click(
      screen.getByRole("button", { name: "Vérifier les changements" }),
    );

    expect(screen.getByText("Vérifier les changements")).toBeTruthy();
    expect(
      screen.getByText("Nom : « Jambes » → « Bas du corps »"),
    ).toBeTruthy();
    expect(screen.getByText("Séances concernées · 1")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(updateSessionMock).toHaveBeenCalledWith(
      12,
      "this",
      expect.objectContaining({ name: "Bas du corps" }),
    );
    expect(await screen.findByText("Page séance")).toBeTruthy();
  });

  it("comes back to the editor from the changes", async () => {
    const user = renderPage();
    await screen.findByText("Modifier la séance");

    const name = screen.getByLabelText(/Nom de la séance/);
    await user.clear(name);
    await user.type(name, "Bas du corps");
    await user.click(
      screen.getByRole("button", { name: "Vérifier les changements" }),
    );
    await user.click(screen.getByRole("button", { name: "Revenir" }));

    expect(screen.getByText("Modifier la séance")).toBeTruthy();
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("keeps the changes when the server refuses them", async () => {
    updateSessionMock.mockRejectedValue(
      new ApiError(500, "SERVER_ERROR", "Oups."),
    );
    const user = renderPage();
    await screen.findByText("Modifier la séance");

    const name = screen.getByLabelText(/Nom de la séance/);
    await user.clear(name);
    await user.type(name, "Bas du corps");
    await user.click(
      screen.getByRole("button", { name: "Vérifier les changements" }),
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Valider" })).toBeTruthy();
  });

  it("says when the session cannot be changed anymore", async () => {
    readEditableSessionMock.mockRejectedValue(
      new ApiError(409, "APPOINTMENT_NOT_EDITABLE", "Déjà commencée."),
    );
    renderPage();

    expect(
      await screen.findByText("Cette séance ne se modifie plus"),
    ).toBeTruthy();
  });

  it("says when the session does not exist", async () => {
    readEditableSessionMock.mockRejectedValue(
      new ApiError(404, "APPOINTMENT_NOT_FOUND", "Inconnue."),
    );
    renderPage();

    expect(await screen.findByText("Séance introuvable")).toBeTruthy();
  });
});
