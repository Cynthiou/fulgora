import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  DEFAULT_PREFERENCES,
  type PublicUser,
  setDisplayUnits,
  type UserPreferences,
} from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import PreferencesPage from "../../../../src/features/user/pages/PreferencesPage";
import { updatePreferences } from "../../../../src/features/user/services/authService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock("../../../../src/features/user/services/authService", () => ({
  updatePreferences: vi.fn(),
}));
const updateMock = vi.mocked(updatePreferences);

// The radio of a label is checked or not.
function isChecked(name: string): boolean {
  const radio = screen.getByRole("radio", { name }) as HTMLInputElement;
  return radio.checked;
}

function userWith(preferences: UserPreferences): PublicUser {
  return {
    id: 3,
    username: "lucas_m",
    email: "lucas.martin@exemple.fr",
    sex: null,
    preferences,
  };
}

function renderPage(preferences = DEFAULT_PREFERENCES) {
  const refresh = vi.fn();
  const auth: AuthContextValue = {
    user: userWith(preferences),
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh,
  };
  const router = createMemoryRouter(
    [
      { path: "/profil/affichage", element: <PreferencesPage /> },
      { path: "/profil", element: <p>Page profil</p> },
    ],
    { initialEntries: ["/profil/affichage"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { refresh, user: userEvent.setup() };
}

describe("PreferencesPage", () => {
  beforeEach(() => {
    updateMock.mockReset();
    updateMock.mockResolvedValue(userWith(DEFAULT_PREFERENCES));
  });

  afterEach(() => {
    setDisplayUnits({ weight: "kg", distance: "km" });
  });

  it("shows the units of the account and its indicator", () => {
    renderPage();

    expect(isChecked("kg")).toBe(true);
    expect(isChecked("km")).toBe(true);
    expect(isChecked("Séances faites cette semaine")).toBe(true);
    expect(screen.getByText("4 × 8 · 60 kg")).toBeTruthy();
    expect(screen.getByText("5,2 km")).toBeTruthy();
  });

  it("saves the pound right away, with no button", async () => {
    const { user, refresh } = renderPage();

    await user.click(screen.getByRole("radio", { name: "lb" }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ weight_unit: "lb" });
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Enregistrer" })).toBeNull();
  });

  it("shows the preview in pounds and miles", () => {
    renderPage({
      ...DEFAULT_PREFERENCES,
      weight_unit: "lb",
      distance_unit: "mi",
    });

    expect(screen.getByText("4 × 8 · 132,3 lb")).toBeTruthy();
    expect(screen.getByText("3,2 mi")).toBeTruthy();
  });

  it("saves the indicator of the home page", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("radio", { name: "Aucun" }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ home_metric: "none" });
    });
  });

  it("says it when the server refuses the change", async () => {
    updateMock.mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible."),
    );
    const { user } = renderPage();

    await user.click(screen.getByRole("radio", { name: "mi" }));

    expect(
      await screen.findByText("Impossible d'enregistrer ce réglage. Réessaie."),
    ).toBeTruthy();
    // The choice of the account did not move
    expect(isChecked("km")).toBe(true);
  });
});
