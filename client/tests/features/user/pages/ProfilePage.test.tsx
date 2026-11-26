import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { CurrentWorkoutSession, PublicUser } from "shared";
import { DEFAULT_PREFERENCES } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import ProfilePage from "../../../../src/features/user/pages/ProfilePage";
import { logout } from "../../../../src/features/user/services/authService";
import { readCurrentWorkoutSession } from "../../../../src/features/workout-session/services/workoutSessionService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock("../../../../src/features/user/services/authService", () => ({
  logout: vi.fn(),
  refresh: vi.fn(),
  login: vi.fn(),
  readMe: vi.fn(),
}));
vi.mock(
  "../../../../src/features/workout-session/services/workoutSessionService",
  () => ({
    readCurrentWorkoutSession: vi.fn(),
  }),
);
const logoutMock = vi.mocked(logout);
const readCurrentMock = vi.mocked(readCurrentWorkoutSession);

const lucas: PublicUser = {
  id: 3,
  username: "lucas_m",
  email: "lucas.martin@exemple.fr",
  sex: null,
  preferences: DEFAULT_PREFERENCES,
};

// 17:34 UTC in November is 18:34 in Paris (PRF-09).
const IN_PROGRESS: CurrentWorkoutSession = {
  id: 9,
  appointment_id: 1,
  session_name: "Haut du corps",
  started_at: "2026-11-25T17:34:00.000Z",
  validated_sets: 3,
  planned_sets: 18,
};

function renderProfile() {
  const forgetUser = vi.fn();
  const auth: AuthContextValue = {
    user: lucas,
    isLoading: false,
    login: vi.fn(),
    logout: forgetUser,
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/profil", element: <ProfilePage /> },
      { path: "/connexion", element: <p>Page connexion</p> },
    ],
    { initialEntries: ["/profil"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { forgetUser, user: userEvent.setup() };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    logoutMock.mockReset();
    readCurrentMock.mockReset();
    readCurrentMock.mockResolvedValue(null);
    logoutMock.mockResolvedValue(undefined);
  });

  it("shows who is connected", () => {
    renderProfile();

    expect(screen.getByText("lucas_m")).toBeTruthy();
    expect(screen.getByText("lucas.martin@exemple.fr")).toBeTruthy();
    expect(screen.getByText("LM")).toBeTruthy();
  });

  it("logs out at once when no session is in progress", async () => {
    const { user, forgetUser } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByText("Page connexion")).toBeTruthy();
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(forgetUser).toHaveBeenCalledTimes(1);
  });

  it("asks for a confirmation when a session is in progress", async () => {
    readCurrentMock.mockResolvedValue(IN_PROGRESS);
    const { user } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(await screen.findByText("Une séance est en cours")).toBeTruthy();
    expect(
      screen.getByText(/Haut du corps · commencée à 18:34\./),
    ).toBeTruthy();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("keeps everything as is on « Rester connecté »", async () => {
    readCurrentMock.mockResolvedValue(IN_PROGRESS);
    const { user, forgetUser } = renderProfile();
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await screen.findByText("Une séance est en cours");

    await user.click(screen.getByRole("button", { name: "Rester connecté" }));

    expect(screen.queryByText("Une séance est en cours")).toBeNull();
    expect(logoutMock).not.toHaveBeenCalled();
    expect(forgetUser).not.toHaveBeenCalled();
    expect(screen.getByText("lucas_m")).toBeTruthy();
  });

  it("logs out after the confirmation", async () => {
    readCurrentMock.mockResolvedValue(IN_PROGRESS);
    const { user } = renderProfile();
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await screen.findByText("Une séance est en cours");

    const buttons = screen.getAllByRole("button", { name: "Se déconnecter" });
    await user.click(buttons[buttons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Page connexion")).toBeTruthy();
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("shows a message and a retry when the server fails", async () => {
    logoutMock.mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    const { user, forgetUser } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Déconnexion impossible. Réessaie.",
    );
    expect(forgetUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => {
      expect(screen.getByText("Page connexion")).toBeTruthy();
    });
    expect(logoutMock).toHaveBeenCalledTimes(2);
  });

  it("logs out anyway when the session check fails", async () => {
    readCurrentMock.mockRejectedValue(new Error("down"));
    const { user } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByText("Page connexion")).toBeTruthy();
    });
  });
});
