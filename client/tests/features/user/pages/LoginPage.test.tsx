import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { PublicUser } from "shared";
import { DEFAULT_PREFERENCES } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import LoginPage from "../../../../src/features/user/pages/LoginPage";
import { login } from "../../../../src/features/user/services/authService";
import { ApiError } from "../../../../src/services/apiError";

// The server is replaced by a fake: each test decides what it answers.
vi.mock("../../../../src/features/user/services/authService", () => ({
  login: vi.fn(),
  readMe: vi.fn(),
}));
const loginMock = vi.mocked(login);

const lea: PublicUser = {
  id: 7,
  username: "lea.m",
  email: "lea.martin@mail.fr",
  sex: null,
  created_at: "2026-05-18",
  preferences: DEFAULT_PREFERENCES,
};

type Entry = { pathname: string; search?: string; state?: unknown };

function renderLogin(entry: Entry = { pathname: "/connexion" }) {
  const authLogin = vi.fn();
  const auth: AuthContextValue = {
    user: null,
    isLoading: false,
    login: authLogin,
    logout: vi.fn(),
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/connexion", element: <LoginPage /> },
      { path: "/", element: <p>Page accueil</p> },
      { path: "/planning", element: <p>Page planning</p> },
      { path: "/inscription", element: <p>Page inscription</p> },
    ],
    { initialEntries: [entry] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { authLogin, user: userEvent.setup() };
}

function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Pseudo ou adresse e-mail/), "lea.m");
  await user.type(screen.getByLabelText(/^Mot de passe/), "secret-2026");
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("asks for both fields before calling the server", async () => {
    const { user } = renderLogin();

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getAllByText("Ce champ est obligatoire.")).toHaveLength(2);
    expect(document.activeElement).toBe(
      screen.getByLabelText(/^Pseudo ou adresse e-mail/),
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows one single message for wrong credentials and clears the password", async () => {
    loginMock.mockRejectedValue(
      new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Identifiants incorrects. Vérifie ta saisie et réessaie.",
      ),
    );
    const { user } = renderLogin();
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Identifiants incorrects. Vérifie ta saisie et réessaie.",
    );
    expect(document.querySelectorAll("[aria-invalid='true']")).toHaveLength(0);
    expect(inputValue(/^Pseudo ou adresse e-mail/)).toBe("lea.m");
    expect(inputValue(/^Mot de passe/)).toBe("");
    expect(document.activeElement).toBe(screen.getByLabelText(/^Mot de passe/));
  });

  it("sends only once on a double click", async () => {
    let finish: (user: PublicUser) => void = () => {};
    loginMock.mockReturnValue(
      new Promise<PublicUser>((resolve) => {
        finish = resolve;
      }),
    );
    const { user } = renderLogin();
    await fillForm(user);

    await user.dblClick(screen.getByRole("button", { name: "Se connecter" }));

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Connexion en cours");
    finish(lea);
    await screen.findByText("Page accueil");
  });

  it("opens the session and goes to the home page", async () => {
    loginMock.mockResolvedValue(lea);
    const { user, authLogin } = renderLogin();
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText("Page accueil")).toBeTruthy();
    });
    expect(authLogin).toHaveBeenCalledWith(lea);
    expect(loginMock).toHaveBeenCalledWith({
      identifier: "lea.m",
      password: "secret-2026",
    });
  });

  it("comes back to the private page that was asked for", async () => {
    loginMock.mockResolvedValue(lea);
    const { user } = renderLogin({
      pathname: "/connexion",
      state: { from: "/planning" },
    });
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText("Page planning")).toBeTruthy();
    });
  });

  it("pre-fills the e-mail given by the signup page", () => {
    renderLogin({ pathname: "/connexion", search: "?email=lea%40mail.fr" });

    expect(inputValue(/^Pseudo ou adresse e-mail/)).toBe("lea@mail.fr");
  });
});
