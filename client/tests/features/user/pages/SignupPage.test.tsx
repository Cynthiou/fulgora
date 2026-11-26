import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { PublicUser } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../../src/contexts/AuthContext";
import SignupPage from "../../../../src/features/user/pages/SignupPage";
import { createUser } from "../../../../src/features/user/services/userService";
import { ApiError } from "../../../../src/services/apiError";

// The server is replaced by a fake: each test decides what it answers.
vi.mock("../../../../src/features/user/services/userService", () => ({
  createUser: vi.fn(),
}));
const createUserMock = vi.mocked(createUser);

const lea: PublicUser = {
  id: 7,
  username: "lea.m",
  email: "lea.martin@mail.fr",
  sex: null,
};

function renderSignup() {
  const login = vi.fn();
  const auth: AuthContextValue = {
    user: null,
    isLoading: false,
    login,
    logout: vi.fn(),
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/inscription", element: <SignupPage /> },
      { path: "/", element: <p>Page accueil</p> },
      { path: "/connexion", element: <p>Page connexion</p> },
    ],
    { initialEntries: ["/inscription"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { login, user: userEvent.setup() };
}

// Plain DOM reads, so no extra assertion library is needed.
function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

function checkbox(label: RegExp): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Pseudo/), "lea.m");
  await user.type(
    screen.getByLabelText(/^Adresse e-mail/),
    "lea.martin@mail.fr",
  );
  await user.type(screen.getByLabelText(/^Mot de passe/), "secret-2026");
  await user.click(screen.getByLabelText(/J'accepte/));
}

describe("SignupPage", () => {
  beforeEach(() => {
    createUserMock.mockReset();
  });

  it("shows one message per empty field and focuses the first one", async () => {
    const { user } = renderSignup();

    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "4 champs à corriger. Le compte n'a pas été créé.",
    );
    expect(screen.getAllByText("Ce champ est obligatoire.")).toHaveLength(3);
    expect(
      screen.getByText(
        "Tu dois accepter les conditions pour créer ton compte.",
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Pseudo/));
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("shows a taken username under the field and clears the password", async () => {
    createUserMock.mockRejectedValue(
      new ApiError(
        409,
        "USERNAME_TAKEN",
        "Ce pseudo est déjà utilisé. Choisis-en un autre.",
        "username",
      ),
    );
    const { user } = renderSignup();
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(
      await screen.findByText(
        "Ce pseudo est déjà utilisé. Choisis-en un autre.",
      ),
    ).toBeTruthy();
    expect(inputValue(/^Pseudo/)).toBe("lea.m");
    expect(inputValue(/^Mot de passe/)).toBe("");
    expect(
      screen.getByText("Pour ta sécurité, ressaisis ton mot de passe."),
    ).toBeTruthy();
    expect(checkbox(/J'accepte/).checked).toBe(true);
  });

  it("offers to log in when the e-mail already has an account", async () => {
    createUserMock.mockRejectedValue(
      new ApiError(
        409,
        "EMAIL_TAKEN",
        "Un compte existe déjà avec cette adresse.",
        "email",
      ),
    );
    const { user } = renderSignup();
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    // Two "Se connecter" links: the footer one and the one in the error.
    const links = await screen.findAllByRole("link", { name: "Se connecter" });
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/connexion?email=lea.martin%40mail.fr");
  });

  it("shows a network failure at the top and keeps the typed values", async () => {
    createUserMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    const { user } = renderSignup();
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Connexion impossible. Réessaie.",
    );
    expect(inputValue(/^Adresse e-mail/)).toBe("lea.martin@mail.fr");
  });

  it("sends only once on a double click", async () => {
    let finish: (user: PublicUser) => void = () => {};
    createUserMock.mockReturnValue(
      new Promise<PublicUser>((resolve) => {
        finish = resolve;
      }),
    );
    const { user } = renderSignup();
    await fillValidForm(user);

    const button = screen.getByRole("button", { name: "Créer mon compte" });
    await user.dblClick(button);

    expect(createUserMock).toHaveBeenCalledTimes(1);
    const pending = screen.getByRole("button", {
      name: "Création du compte…",
    }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe(
      "Création du compte en cours",
    );
    finish(lea);
    await screen.findByRole("heading", { name: "Compte créé" });
  });

  it("toggles the password visibility", async () => {
    const { user } = renderSignup();
    const password = screen.getByLabelText(/^Mot de passe/);

    expect(password.getAttribute("type")).toBe("password");
    await user.click(
      screen.getByRole("button", { name: "Afficher le mot de passe" }),
    );
    expect(password.getAttribute("type")).toBe("text");
    await user.click(
      screen.getByRole("button", { name: "Masquer le mot de passe" }),
    );
    expect(password.getAttribute("type")).toBe("password");
  });

  it("opens the session and shows the success screen, then goes home", async () => {
    createUserMock.mockResolvedValue(lea);
    const { user, login } = renderSignup();
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    const title = await screen.findByRole("heading", { name: "Compte créé" });
    expect(document.activeElement).toBe(title);
    expect(
      screen.getByText("Bienvenue lea.m. Ton compte est prêt."),
    ).toBeTruthy();
    expect(login).toHaveBeenCalledWith(lea);
    expect(createUserMock).toHaveBeenCalledWith({
      username: "lea.m",
      email: "lea.martin@mail.fr",
      password: "secret-2026",
      terms_accepted: true,
    });

    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await waitFor(() => {
      expect(screen.getByText("Page accueil")).toBeTruthy();
    });
  });
});
