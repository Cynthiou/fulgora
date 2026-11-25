import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
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

describe("SessionEditorPage", () => {
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

  it("adds a classic block, shows it in the review and removes it", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Ajouter un bloc" }));

    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(screen.getByText("Classique · Bloc 1")).toBeTruthy();
    expect(screen.getByText("0 exercice")).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Retirer le bloc Classique · Bloc 1",
      }),
    );

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
    expect(
      screen.getByText(
        "Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue.",
      ),
    ).toBeTruthy();

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
