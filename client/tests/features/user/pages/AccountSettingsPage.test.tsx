import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { DEFAULT_PREFERENCES, type PublicUser } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import AccountSettingsPage from "../../../../src/features/user/pages/AccountSettingsPage";
import { changePassword } from "../../../../src/features/user/services/authService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock("../../../../src/features/user/services/authService", () => ({
  changePassword: vi.fn(),
}));
const changeMock = vi.mocked(changePassword);

const lucas: PublicUser = {
  id: 3,
  username: "lucas_m",
  email: "lucas.martin@exemple.fr",
  sex: null,
  created_at: "2026-05-18",
  preferences: DEFAULT_PREFERENCES,
};

function renderPage() {
  const auth: AuthContextValue = {
    user: lucas,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/profil/compte", element: <AccountSettingsPage /> },
      { path: "/profil", element: <p>Page profil</p> },
    ],
    { initialEntries: ["/profil/compte"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { user: userEvent.setup() };
}

function field(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  await user.type(field("Mot de passe actuel"), current);
  await user.type(field("Nouveau mot de passe"), next);
  await user.type(field("Confirmer le mot de passe"), confirm);
}

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    changeMock.mockReset();
    changeMock.mockResolvedValue(undefined);
  });

  it("shows the account and the day it was created (D-05)", () => {
    renderPage();

    expect(screen.getByText("lucas_m")).toBeTruthy();
    expect(screen.getByText("lucas.martin@exemple.fr")).toBeTruthy();
    expect(screen.getByText("18 mai 2026")).toBeTruthy();
  });

  it("keeps the button off until the three fields are filled", async () => {
    const { user } = renderPage();
    const button = screen.getByRole("button", {
      name: "Changer le mot de passe",
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    await user.type(field("Mot de passe actuel"), "secret-2026");
    expect(button.disabled).toBe(true);
    await user.type(field("Nouveau mot de passe"), "nouveau-2027");
    expect(button.disabled).toBe(true);
    await user.type(field("Confirmer le mot de passe"), "nouveau-2027");
    expect(button.disabled).toBe(false);
  });

  it("changes the password and says the session stays open", async () => {
    const { user } = renderPage();
    await fill(user, "secret-2026", "nouveau-2027", "nouveau-2027");

    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );

    await waitFor(() => {
      expect(changeMock).toHaveBeenCalledWith({
        current_password: "secret-2026",
        new_password: "nouveau-2027",
        confirm_password: "nouveau-2027",
      });
    });
    expect(
      screen.getByText(
        "Mot de passe changé. La session en cours reste ouverte.",
      ),
    ).toBeTruthy();
    expect(field("Mot de passe actuel").value).toBe("");
  });

  it("empties the fields and shows the error of the server", async () => {
    changeMock.mockRejectedValueOnce(
      new ApiError(
        422,
        "WRONG_CURRENT_PASSWORD",
        "Mot de passe actuel incorrect.",
        "current_password",
      ),
    );
    const { user } = renderPage();
    await fill(user, "pas-le-bon-1", "nouveau-2027", "nouveau-2027");

    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );

    expect(
      await screen.findByText("Mot de passe actuel incorrect."),
    ).toBeTruthy();
    expect(field("Mot de passe actuel").value).toBe("");
    expect(field("Nouveau mot de passe").value).toBe("");
    expect(field("Confirmer le mot de passe").value).toBe("");
  });

  it("checks the rules and the confirmation without the server", async () => {
    const { user } = renderPage();
    await fill(user, "secret-2026", "court", "court");

    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );

    expect(
      await screen.findByText("Ne respecte pas les règles de l'inscription."),
    ).toBeTruthy();
    expect(changeMock).not.toHaveBeenCalled();

    await fill(user, "secret-2026", "nouveau-2027", "nouveau-2028");
    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );
    expect(
      await screen.findByText("Les deux mots de passe ne correspondent pas."),
    ).toBeTruthy();
    expect(changeMock).not.toHaveBeenCalled();
  });

  it("shows the password when « Afficher » is used", async () => {
    const { user } = renderPage();

    expect(field("Nouveau mot de passe").type).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "Afficher nouveau mot de passe" }),
    );
    expect(field("Nouveau mot de passe").type).toBe("text");
  });
});
