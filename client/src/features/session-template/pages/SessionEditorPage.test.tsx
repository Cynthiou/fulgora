import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionEditorPage from "./SessionEditorPage";

function renderEditor(search = "?date=2026-11-26") {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Page accueil</p> },
      { path: "/seances/nouvelle", element: <SessionEditorPage /> },
    ],
    { initialEntries: ["/", `/seances/nouvelle${search}`], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

// Opens the type panel and picks a type.
async function addBlock(
  user: ReturnType<typeof userEvent.setup>,
  typeLabel: string,
) {
  await user.click(screen.getByRole("button", { name: "Ajouter un bloc" }));
  await user.click(
    screen.getByRole("button", { name: new RegExp(`^${typeLabel}`) }),
  );
}

describe("SessionEditorPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the chosen date, no time, no block and the warning", () => {
    renderEditor();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Nouvelle séance",
    );
    expect(screen.getByText("Séance libre")).toBeTruthy();
    expect(inputValue(/^Date/)).toBe("2026-11-26");
    expect(inputValue(/^Heure/)).toBe("");
    expect(screen.getByText("0 bloc")).toBeTruthy();
    expect(
      screen.getByText("Ajoute un premier bloc pour y mettre des exercices."),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Cette séance n'a pas encore d'exercice : tu ne pourras pas la démarrer.",
    );
  });

  it("falls back on today when the date of the address is unusable", () => {
    renderEditor("?date=hier");

    expect(inputValue(/^Date/)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("requires a name to save", async () => {
    const user = renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Enregistrer la séance" }),
    );

    expect(screen.getByText("Ce champ est obligatoire.")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText(/^Nom de la séance/),
    );

    await user.type(
      screen.getByLabelText(/^Nom de la séance/),
      "Haut du corps",
    );
    expect(screen.queryByText("Ce champ est obligatoire.")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Enregistrer la séance" }),
    );
    expect(
      screen.getByText("L'enregistrement arrive avec l'étape suivante."),
    ).toBeTruthy();
  });

  it("shows the 8 types, 3 of them unavailable, and closes the panel", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Ajouter un bloc" }));

    expect(screen.getByText("Type de bloc")).toBeTruthy();
    expect(
      screen.getByText("Exercices et séries, avec objectifs et repos"),
    ).toBeTruthy();
    const amrap = screen.getByRole("button", {
      name: /^AMRAP/,
    }) as HTMLButtonElement;
    expect(amrap.disabled).toBe(true);
    expect(amrap.textContent).toContain("Bientôt");
    expect(amrap.textContent).toContain("indisponible");
    expect(
      (screen.getByRole("button", { name: /^Circuit/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /^For Time/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /^Classique/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByText("Type de bloc")).toBeNull();
    expect(screen.getByText("0 bloc")).toBeTruthy();
  });

  it("adds a block of the chosen type, opens it, names it and comes back", async () => {
    const user = renderEditor();
    await user.type(
      screen.getByLabelText(/^Nom de la séance/),
      "Haut du corps",
    );

    await addBlock(user, "Échauffement");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Échauffement",
    );
    expect(screen.getByText("Bloc 1 · Haut du corps")).toBeTruthy();
    expect(screen.getByText("0 exercice")).toBeTruthy();
    expect(
      screen.getByText("Choisis tes exercices dans le catalogue."),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Ajouter des exercices",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await user.type(screen.getByLabelText(/^Intitulé/), "Mise en route");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bloc" }),
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Nouvelle séance",
    );
    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(screen.getByText("Échauffement · Mise en route")).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Ouvrir le bloc Échauffement · Mise en route",
      }),
    );
    expect(inputValue(/^Intitulé/)).toBe("Mise en route");
  });

  it("changes the type of an empty block and shows the note field for a Note", async () => {
    const user = renderEditor();
    await addBlock(user, "Classique");

    await user.click(screen.getByRole("button", { name: "Changer" }));
    await user.click(screen.getByRole("button", { name: /^Note/ }));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Note");
    expect(screen.queryByText("Exercices")).toBeNull();
    await user.type(screen.getByLabelText("Note"), "Penser à respirer.");
    expect(screen.getByText("18 / 2000 caractères")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Retour à la séance" }),
    );
    expect(screen.getByText("Note · Bloc 1")).toBeTruthy();
    expect(screen.getByText("Penser à respirer.")).toBeTruthy();
  });

  it("removes a block with a 5 second undo", async () => {
    const user = renderEditor();
    await addBlock(user, "Classique");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bloc" }),
    );
    expect(screen.getByText("Classique · Bloc 1")).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Retirer le bloc Classique · Bloc 1",
      }),
    );

    expect(screen.getByText("0 bloc")).toBeTruthy();
    expect(screen.getByText("Bloc retiré")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(screen.getByText("Classique · Bloc 1")).toBeTruthy();
    expect(screen.queryByText("Bloc retiré")).toBeNull();
  });

  it("makes the removal final once the toast is gone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = renderEditor();
    await addBlock(user, "Classique");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bloc" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Retirer le bloc Classique · Bloc 1",
      }),
    );
    expect(screen.getByText("Bloc retiré")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5_100);
    });

    expect(screen.queryByText("Bloc retiré")).toBeNull();
    expect(screen.getByText("0 bloc")).toBeTruthy();
  });

  it("leaves at once when nothing changed", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Retour" }));

    await waitFor(() => {
      expect(screen.getByText("Page accueil")).toBeTruthy();
    });
  });

  it("asks before leaving a changed draft and can stay", async () => {
    const user = renderEditor();
    await user.type(screen.getByLabelText(/^Nom de la séance/), "Jambes");

    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(await screen.findByText("Quitter sans enregistrer ?")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Continuer la séance" }),
    );

    expect(screen.queryByText("Quitter sans enregistrer ?")).toBeNull();
    expect(inputValue(/^Nom de la séance/)).toBe("Jambes");

    await user.click(screen.getByRole("button", { name: "Retour" }));
    await user.click(await screen.findByRole("button", { name: "Quitter" }));

    await waitFor(() => {
      expect(screen.getByText("Page accueil")).toBeTruthy();
    });
  });

  it("warns the browser before closing a changed draft", async () => {
    const user = renderEditor();

    const quiet = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(quiet);
    expect(quiet.defaultPrevented).toBe(false);

    await user.type(screen.getByLabelText(/^Nom de la séance/), "Dos");

    const warned = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(warned);
    expect(warned.defaultPrevented).toBe(true);
  });
});
