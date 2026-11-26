import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  DEFAULT_PREFERENCES,
  type PublicUser,
  type UserPreferences,
} from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import SoundSettingsPage from "../../../../src/features/user/pages/SoundSettingsPage";
import { updatePreferences } from "../../../../src/features/user/services/authService";

vi.mock("../../../../src/features/user/services/authService", () => ({
  updatePreferences: vi.fn(),
}));
const updateMock = vi.mocked(updatePreferences);

function userWith(preferences: UserPreferences): PublicUser {
  return {
    id: 3,
    username: "lucas_m",
    email: "lucas.martin@exemple.fr",
    sex: null,
    preferences,
  };
}

function renderPage(preferences = DEFAULT_PREFERENCES, path = "/profil/sons") {
  const auth: AuthContextValue = {
    user: userWith(preferences),
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/profil/sons", element: <SoundSettingsPage /> },
      { path: "/profil", element: <p>Page profil</p> },
      { path: "/notifications", element: <p>Page notifications</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { user: userEvent.setup() };
}

// The browser of the test does not know notifications: each test says what
// it wants (RM-063).
function giveNotifications(permission: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(permission);
  Object.defineProperty(window, "Notification", {
    configurable: true,
    writable: true,
    value: { requestPermission, permission: "default" },
  });
  return requestPermission;
}

function removeNotifications() {
  Reflect.deleteProperty(window, "Notification");
}

describe("SoundSettingsPage", () => {
  beforeEach(() => {
    updateMock.mockReset();
    updateMock.mockResolvedValue(userWith(DEFAULT_PREFERENCES));
  });

  afterEach(() => {
    removeNotifications();
  });

  it("shows the three switches, each one on its own", () => {
    removeNotifications();
    renderPage();

    const [sound, vibration, notifications] = screen.getAllByRole("switch");
    expect(sound?.getAttribute("aria-checked")).toBe("true");
    expect(vibration?.getAttribute("aria-checked")).toBe("true");
    expect(notifications?.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Selon ton téléphone\./)).toBeTruthy();
  });

  it("switches the sound off and saves it at once", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("switch", { name: /Sons/ }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ sound_enabled: false });
    });
  });

  it("asks the phone before switching the notifications on", async () => {
    const requestPermission = giveNotifications("granted");
    const { user } = renderPage();

    await user.click(
      screen.getByRole("switch", { name: /Notifications de minuteur/ }),
    );

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });
    expect(updateMock).toHaveBeenCalledWith({
      timer_notification_enabled: true,
    });
  });

  it("says it and saves nothing when the phone refuses", async () => {
    giveNotifications("denied");
    const { user } = renderPage();

    await user.click(
      screen.getByRole("switch", { name: /Notifications de minuteur/ }),
    );

    expect(
      await screen.findByText(/Ton téléphone a refusé les notifications\./),
    ).toBeTruthy();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("disables the switch on a browser without notifications", () => {
    removeNotifications();
    renderPage();

    const notifications = screen.getByRole("switch", {
      name: /Notifications de minuteur/,
    });
    expect(notifications.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Non disponible sur ce navigateur.")).toBeTruthy();
  });

  it("explains the bell when it comes from the notifications (NOT-08)", () => {
    removeNotifications();
    renderPage(DEFAULT_PREFERENCES, "/profil/sons?depuis=notifications");

    expect(
      screen.getByText(
        /Ces réglages ne concernent que les minuteurs pendant la séance\./,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Selon ton téléphone\./)).toBeNull();
  });
});
