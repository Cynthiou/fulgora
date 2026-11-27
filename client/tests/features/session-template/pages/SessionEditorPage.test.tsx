import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  createEmptySet,
  formatShortDayMonth,
  type SelectedExercise,
  todayInParis,
} from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFreeSession } from "../../../../src/features/appointment/services/appointmentService";
import SessionEditorPage from "../../../../src/features/session-template/pages/SessionEditorPage";
import {
  loadDraft,
  saveDraft,
  savePendingExercises,
} from "../../../../src/features/session-template/services/sessionDraftStorage";
import { ApiError } from "../../../../src/services/apiError";

vi.mock(
  "../../../../src/features/appointment/services/appointmentService",
  () => ({
    createFreeSession: vi.fn(),
  }),
);
const createFreeSessionMock = vi.mocked(createFreeSession);

type Entry = string | { pathname: string; state: unknown };

function renderEditor(entry: Entry = "/seances/nouvelle?date=2026-11-26") {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Page accueil</p> },
      { path: "/seances/nouvelle", element: <SessionEditorPage /> },
      { path: "/seances/nouvelle/exercices", element: <p>Page sélection</p> },
    ],
    { initialEntries: ["/", entry], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

// Opens one block of the session on its own screen, through its menu.
async function editBlock(
  user: ReturnType<typeof userEvent.setup>,
  menuName: RegExp,
) {
  await user.click(screen.getByRole("button", { name: menuName }));
  await user.click(screen.getByRole("button", { name: "Modifier le bloc" }));
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

const bench: SelectedExercise = {
  exercise_id: 31,
  name: "Développé couché",
  measure_codes: ["reps", "weight"],
};
const pullUps: SelectedExercise = {
  exercise_id: 45,
  name: "Tractions",
  measure_codes: ["reps"],
};

describe("SessionEditorPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the chosen date, no time, no block and the warning", () => {
    renderEditor();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Nouvelle séance",
    );
    expect(screen.getByText("Séance libre")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain(
      "Jeu 26 nov.",
    );
    expect(inputValue(/^Heure/)).toBe("");
    expect(screen.getByText("0 bloc")).toBeTruthy();
    expect(
      screen.getByText("Ajoute un premier bloc pour y mettre des exercices."),
    ).toBeTruthy();
    // With no block at all, the empty card says it: no warning on top.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("falls back on today when the date of the address is unusable", () => {
    renderEditor("/seances/nouvelle?date=hier");

    // The app lives in Paris: after 23:00 UTC the day is already the next
    // one there, so the test asks the same clock as the editor.
    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain(
      formatShortDayMonth(todayInParis()),
    );
  });

  it("requires a name to save, then nothing is sent", async () => {
    const user = renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Enregistrer la séance" }),
    );

    expect(screen.getByText("Ce champ est obligatoire.")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText(/^Nom de la séance/),
    );
    expect(createFreeSessionMock).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/^Nom de la séance/),
      "Haut du corps",
    );
    expect(screen.queryByText("Ce champ est obligatoire.")).toBeNull();
  });

  it("changes the date through the picker (A2b)", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: /^Date/ }));

    expect(screen.getByText("Date de la séance")).toBeTruthy();
    expect(screen.getByText("Novembre 2026")).toBeTruthy();
    // "Séance le **jeudi 26 novembre**", the day in bold (A2b).
    expect(screen.getByText("jeudi 26 novembre")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(screen.getByText("Décembre 2026")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mois précédent" }));
    await user.click(
      screen.getByRole("button", { name: /^Samedi 28 novembre/ }),
    );
    expect(screen.getByText("samedi 28 novembre")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Valider la date" }));

    expect(screen.queryByText("Date de la séance")).toBeNull();
    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain(
      "Sam 28 nov.",
    );
    expect(loadDraft()?.draft.planned_date).toBe("2026-11-28");
  });
  // Handoff 2.1: the panel offers the 7 types, the Note is not one of them.
  it("shows the 7 types with their description, and closes the panel", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Ajouter un bloc" }));

    expect(screen.getByText("Type de bloc")).toBeTruthy();
    expect(
      screen.getByText("Exercices avec séries et temps de repos"),
    ).toBeTruthy();
    for (const name of [
      /^Classique/,
      /^Circuit/,
      /^AMRAP/,
      /^For Time/,
      /^Échauffement/,
      /^Étirements/,
      /^Défi/,
    ]) {
      const tile = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect({ name: String(name), disabled: tile.disabled }).toEqual({
        name: String(name),
        disabled: false,
      });
    }
    expect(screen.queryByRole("button", { name: /^Note/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByText("Type de bloc")).toBeNull();
    expect(screen.getByText("0 bloc")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Ajouter un bloc" }),
    );
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
    expect(screen.getByText("Bloc 1")).toBeTruthy();
    expect(screen.getByText(/Choisis-les dans le catalogue/)).toBeTruthy();
    // An empty block has no count and no dashed button: its one orange
    // button opens the catalog (handoff 2.2).
    expect(screen.queryByText("0 exercice")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Ajouter un exercice" }),
    ).toBeNull();

    await user.type(screen.getByLabelText(/^Intitulé/), "Mise en route");
    await user.click(
      screen.getByRole("button", { name: "Retour à la séance" }),
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Nouvelle séance",
    );
    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /^Échauffement · Mise en route/,
      }),
    ).toBeTruthy();

    await editBlock(user, /^Actions du bloc Échauffement/);
    expect(inputValue(/^Intitulé/)).toBe("Mise en route");
  });

  // RM-020: no new note can be created, but a session saved with one keeps
  // showing it and keeps its text editable.
  it("still edits the note of a block saved with a note", async () => {
    saveDraft({
      draft: {
        name: "Haut du corps",
        planned_date: "2026-11-26",
        planned_time: null,
        blocks: [
          {
            key: "b1",
            block_type: "note",
            name: null,
            instructions: "Penser à respirer.",
            planned_rounds: null,
            time_limit_seconds: null,
            exercises: [],
          },
        ],
      },
      openBlockKey: "b1",
    });
    const user = renderEditor("/seances/nouvelle");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Note");
    expect(screen.queryByText("Exercices")).toBeNull();
    expect(screen.getByText("18 / 2000 caractères")).toBeTruthy();

    await user.type(screen.getByLabelText("Note"), " Et à boire.");
    expect(screen.getByText("30 / 2000 caractères")).toBeTruthy();
  });

  // Handoff 3.1: the header of the card folds it, the "⋯" menu holds
  // everything else, and the menu closes with Escape (RM-064).
  it("folds a block card and closes its menu with Escape", async () => {
    saveDraft({
      draft: {
        name: "Haut du corps",
        planned_date: "2026-11-26",
        planned_time: null,
        blocks: [
          {
            key: "b1",
            block_type: "classic",
            name: "Force",
            instructions: null,
            planned_rounds: null,
            time_limit_seconds: null,
            exercises: [
              {
                key: "e1",
                exercise_id: 31,
                name: "Développé couché",
                meta: null,
                measure_codes: ["reps", "weight"],
                default_rest_seconds: 90,
                sets: [{ ...createEmptySet(), reps: 10, weight_kg: 50 }],
              },
            ],
          },
        ],
      },
      openBlockKey: null,
    });
    const user = renderEditor("/seances/nouvelle");

    const header = screen.getByRole("button", { name: /^Classique · Force/ });
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("10 rép. · 50 kg")).toBeTruthy();

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("10 rép. · 50 kg")).toBeNull();

    const menu = screen.getByRole("button", {
      name: "Actions du bloc Classique · Force",
    });
    await user.click(menu);
    expect(
      screen.getByRole("button", { name: "Modifier le bloc" }),
    ).toBeTruthy();
    // One block only: there is nowhere to move it.
    expect(screen.queryByRole("button", { name: "Monter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descendre" })).toBeNull();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", { name: "Modifier le bloc" }),
    ).toBeNull();
  });

  it("duplicates a block right after it, and removes one exercise", async () => {
    saveDraft({
      draft: {
        name: "Haut du corps",
        planned_date: "2026-11-26",
        planned_time: null,
        blocks: [
          {
            key: "b1",
            block_type: "classic",
            name: "Force",
            instructions: null,
            planned_rounds: null,
            time_limit_seconds: null,
            exercises: [
              {
                key: "e1",
                exercise_id: 31,
                name: "Développé couché",
                meta: null,
                measure_codes: ["reps", "weight"],
                default_rest_seconds: 90,
                sets: [{ ...createEmptySet(), reps: 10 }],
              },
            ],
          },
        ],
      },
      openBlockKey: null,
    });
    const user = renderEditor("/seances/nouvelle");

    await user.click(
      screen.getByRole("button", { name: "Actions du bloc Classique · Force" }),
    );
    await user.click(screen.getByRole("button", { name: "Dupliquer" }));

    expect(screen.getByText("2 blocs")).toBeTruthy();
    const cards = screen.getAllByRole("button", { name: /^Classique · Force/ });
    expect(cards).toHaveLength(2);
    expect(cards[1]?.textContent).toContain("Bloc 2 · Force · 1 exercice");

    // The copy is its own block: removing an exercise there leaves the
    // first one alone.
    const copyLines = screen.getByRole("list", {
      name: "Exercices du bloc 2",
    });
    await user.click(
      screen.getAllByRole("button", {
        name: "Retirer Développé couché",
      })[1] as HTMLElement,
    );
    expect(copyLines.textContent).toBe("");
    expect(screen.getByText("Exercice retiré")).toBeTruthy();
    expect(
      screen.getByRole("list", { name: "Exercices du bloc 1" }).textContent,
    ).toContain("Développé couché");
  });

  it("removes a block with a 5 second undo", async () => {
    const user = renderEditor();
    await addBlock(user, "Classique");
    await user.click(
      screen.getByRole("button", { name: "Retour à la séance" }),
    );
    expect(
      screen.getByRole("button", {
        name: /^Classique · Bloc 1/,
      }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Actions du bloc Classique · Bloc 1",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByText("0 bloc")).toBeTruthy();
    expect(screen.getByText("Bloc supprimé")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /^Classique · Bloc 1/,
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Bloc supprimé")).toBeNull();
  });

  it("makes the removal final once the toast is gone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = renderEditor();
    await addBlock(user, "Classique");
    await user.click(
      screen.getByRole("button", { name: "Retour à la séance" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Actions du bloc Classique · Bloc 1",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.getByText("Bloc supprimé")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5_100);
    });

    expect(screen.queryByText("Bloc supprimé")).toBeNull();
    expect(screen.getByText("0 bloc")).toBeTruthy();
  });

  it("goes to the catalog selection without asking, keeping the draft in the tab", async () => {
    const user = renderEditor();
    await user.type(
      screen.getByLabelText(/^Nom de la séance/),
      "Haut du corps",
    );
    await addBlock(user, "Classique");

    await user.click(
      screen.getByRole("button", { name: "Ajouter des exercices" }),
    );

    expect(screen.queryByText("Quitter sans enregistrer ?")).toBeNull();
    expect(await screen.findByText("Page sélection")).toBeTruthy();
    const stored = loadDraft();
    expect(stored?.draft.name).toBe("Haut du corps");
    expect(stored?.draft.blocks).toHaveLength(1);
    expect(stored?.openBlockKey).toBe(stored?.draft.blocks[0]?.key);
  });

  it("comes back from the selection with the exercises in the open block", async () => {
    saveDraft({
      draft: {
        name: "Haut du corps",
        planned_date: "2026-11-26",
        planned_time: null,
        blocks: [
          {
            key: "b1",
            block_type: "classic",
            name: "Force",
            instructions: null,
            planned_rounds: null,
            time_limit_seconds: null,
            exercises: [],
          },
        ],
      },
      openBlockKey: "b1",
    });
    savePendingExercises({ blockKey: "b1", exercises: [bench, pullUps] });
    const user = renderEditor("/seances/nouvelle");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Classique",
    );
    expect(screen.getByText("2 exercices")).toBeTruthy();
    const rows = screen.getByRole("list", { name: "Exercices du bloc" });
    expect(rows.textContent).toContain("Développé couché");
    expect(rows.textContent).toContain("Tractions");
    expect(screen.getAllByText("10 rép.")).toHaveLength(2);
    // Taken once: a reload must not add them again.
    expect(sessionStorage.getItem("session-editor:pending-exercises")).toBe(
      null,
    );

    // The numbered badge of each card is also its grip (US-16)
    expect(
      screen.getByRole("button", {
        name: "Déplacer Développé couché, exercice 1",
      }).textContent,
    ).toBe("1");

    // Back to the session: the card sums the block up, no more warning
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bloc" }),
    );
    expect(
      screen.getByRole("button", {
        name: /^Classique · Force/,
      }),
    ).toBeTruthy();
    // The card of the block lists its exercises when it is open (3.1)
    const lines = screen.getByRole("list", { name: "Exercices du bloc 1" });
    expect(lines.textContent).toMatch(/Développé couché.*Tractions/);
    expect(screen.queryByText(/n'a pas encore d'exercice/)).toBeNull();
  });

  it("starts a session with a Classic block when the catalog hands exercises over", () => {
    renderEditor({
      pathname: "/seances/nouvelle",
      state: { exercises: [bench] },
    });

    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /^Classique · Bloc 1/,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Développé couché")).toBeTruthy();
    expect(screen.queryByText(/n'a pas encore d'exercice/)).toBeNull();
  });

  it("leaves at once when nothing changed", async () => {
    const user = renderEditor();

    await user.click(screen.getByRole("button", { name: "Retour" }));

    await waitFor(() => {
      expect(screen.getByText("Page accueil")).toBeTruthy();
    });
  });

  it("asks before leaving a changed draft, can stay, and drops the draft on leaving", async () => {
    const user = renderEditor();
    await user.type(screen.getByLabelText(/^Nom de la séance/), "Jambes");
    expect(loadDraft()?.draft.name).toBe("Jambes");

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
    expect(loadDraft()).toBeNull();
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

// A block holding one exercise of each measure profile, open on screen (A6).
function saveBlockWithProfiles() {
  const set = {
    reps: null,
    weight_kg: null,
    reps_left: null,
    reps_right: null,
    weight_left_kg: null,
    weight_right_kg: null,
    duration_seconds: null,
    distance_meters: null,
    speed_kmh: null,
    resistance: null,
    incline_percent: null,
    calories: null,
    rest_after_seconds: null,
  };
  saveDraft({
    draft: {
      name: "Full body",
      planned_date: "2026-11-26",
      planned_time: null,
      blocks: [
        {
          key: "b1",
          block_type: "classic",
          name: null,
          instructions: null,
          planned_rounds: null,
          time_limit_seconds: null,
          exercises: [
            {
              key: "e1",
              exercise_id: 31,
              name: "Développé couché",
              meta: "Pectoraux · Barre",
              measure_codes: ["reps", "weight"],
              default_rest_seconds: 90,
              sets: [{ ...set, reps: 10 }],
            },
            {
              key: "e2",
              exercise_id: 50,
              name: "Anges au mur",
              meta: "Mobilité · Poids du corps",
              measure_codes: ["reps"],
              default_rest_seconds: 90,
              sets: [{ ...set, reps: 10 }],
            },
            {
              key: "e3",
              exercise_id: 60,
              name: "Gainage",
              meta: "Abdominaux · Poids du corps",
              measure_codes: ["duration"],
              default_rest_seconds: 90,
              sets: [{ ...set, duration_seconds: 60 }],
            },
            {
              key: "e4",
              exercise_id: 70,
              name: "Tapis de course",
              meta: "Cardio · Cardio",
              measure_codes: [
                "duration",
                "distance",
                "speed",
                "incline",
                "calories",
              ],
              default_rest_seconds: 90,
              sets: [{ ...set, duration_seconds: 600 }],
            },
            {
              key: "e5",
              exercise_id: 80,
              name: "Mon exercice sans mesure",
              meta: null,
              measure_codes: [],
              default_rest_seconds: 90,
              sets: [set],
            },
          ],
        },
      ],
    },
    openBlockKey: "b1",
  });
}

function field(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

describe("SessionEditorPage · planned sets (US-15)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveBlockWithProfiles();
  });

  it("configures a weighted exercise: reps, weight, duplicate, summary", async () => {
    const user = renderEditor("/seances/nouvelle");

    await user.click(screen.getByRole("button", { name: /^Développé couché/ }));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Développé couché",
    );
    expect(screen.getByText("Pectoraux · Barre")).toBeTruthy();
    expect(screen.getByText("Répétitions · Charge")).toBeTruthy();
    expect(screen.getByText("Série 1")).toBeTruthy();
    expect(field("Répétitions").value).toBe("10");
    expect(field("Charge (kg)").value).toBe("");
    expect(screen.getByText("1 min 30")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Augmenter Répétitions" }),
    );
    expect(field("Répétitions").value).toBe("11");
    await user.type(field("Charge (kg)"), "40");
    await user.click(
      screen.getByRole("button", { name: "Diminuer Repos par défaut" }),
    );
    expect(screen.getByText("1 min 15")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Dupliquer la dernière" }),
    );
    expect(screen.getByText("Série 2")).toBeTruthy();
    expect(field("Répétitions").value).toBe("11");
    expect(field("Charge (kg)").value).toBe("40");
    // The first set is folded and sums itself up
    expect(
      screen.getByRole("button", { name: /^Série 1/ }).textContent,
    ).toContain("11 rép. · 40 kg");

    await user.click(
      screen.getByRole("button", { name: "Valider l'exercice" }),
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Classique",
    );
    expect(
      screen.getByRole("button", { name: /^Développé couché/ }).textContent,
    ).toContain("2 × 11 rép. · 40 kg");
  });

  it("blocks « Valider » while a value is out of its limits", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Développé couché/ }));
    const validate = screen.getByRole("button", {
      name: "Valider l'exercice",
    }) as HTMLButtonElement;

    await user.clear(field("Répétitions"));
    await user.type(field("Répétitions"), "1001");
    expect(
      screen.getByText(/Entre un nombre entre 0 et 1\s000\./),
    ).toBeTruthy();
    expect(validate.disabled).toBe(true);

    await user.clear(field("Répétitions"));
    await user.type(field("Répétitions"), "8");
    expect(screen.queryByText(/Entre un nombre entre/)).toBeNull();
    expect(validate.disabled).toBe(false);

    await user.type(field("Charge (kg)"), "40,3");
    expect(screen.getByText("Entre une valeur par pas de 0,25.")).toBeTruthy();
    expect(validate.disabled).toBe(true);
  });

  it("offers an added weight on a bodyweight exercise", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Anges au mur/ }));

    expect(screen.getByText("Répétitions · Lest")).toBeTruthy();
    const toggle = screen.getByRole("switch", { name: "Ajouter un lest" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByLabelText("Lest (kg)")).toBeNull();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await user.type(field("Lest (kg)"), "5");
    await user.click(
      screen.getByRole("button", { name: "Valider l'exercice" }),
    );

    expect(
      screen.getByRole("button", { name: /^Anges au mur/ }).textContent,
    ).toContain("10 rép. · 5 kg lest");
  });

  it("handles durations in min:s, adds and removes a set, and a set's own rest", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Gainage/ }));

    expect(field("Durée (min:s)").value).toBe("1:00");
    expect(
      screen.getByText("Pendant la séance : minuteur ou chrono au choix."),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Augmenter Durée (min:s)" }),
    );
    expect(field("Durée (min:s)").value).toBe("1:15");

    await user.click(screen.getByRole("button", { name: "Ajouter une série" }));
    expect(screen.getByText("Série 2")).toBeTruthy();
    expect(field("Durée (min:s)").value).toBe("");

    // Its own rest
    await user.click(
      screen.getByRole("button", { name: "Options de la série 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Repos différent" }));
    expect(
      screen.getByRole("group", { name: "Repos de la série 2" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Augmenter Repos de la série 2" }),
    );
    expect(
      screen.getByRole("group", { name: "Repos de la série 2" }).textContent,
    ).toContain("15 s");

    // Remove it
    await user.click(
      screen.getByRole("button", { name: "Options de la série 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.queryByText("Série 2")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Options de la série 1" }),
    );
    expect(
      (screen.getByRole("button", { name: "Retirer" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("moves a set with « Monter » of the ⋯ menu (US-16)", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Développé couché/ }));

    await user.clear(field("Répétitions"));
    await user.type(field("Répétitions"), "11");
    await user.click(screen.getByRole("button", { name: "Ajouter une série" }));
    await user.type(field("Répétitions"), "5");

    // The first set cannot go up
    await user.click(
      screen.getByRole("button", { name: "Options de la série 1" }),
    );
    expect(
      (screen.getByRole("button", { name: "Monter" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Options de la série 1" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Options de la série 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Monter" }));

    // The moved set keeps its values and takes the first place
    expect(field("Répétitions").value).toBe("5");
    expect(
      screen.getByRole("button", { name: /^Série 2/ }).textContent,
    ).toContain("11 rép.");
  });

  it("calls the sets of a cardio exercise stages, shown in km", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Tapis de course/ }));

    expect(screen.getByText("Étape 1")).toBeTruthy();
    expect(field("Durée (min:s)").value).toBe("10:00");
    expect(
      screen.getByRole("button", { name: "Ajouter une étape" }),
    ).toBeTruthy();
    expect(screen.queryByText("Dupliquer la dernière")).toBeNull();

    await user.type(field("Distance (km)"), "2,5");
    await user.click(
      screen.getByRole("button", { name: "Augmenter Vitesse (km/h)" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Valider l'exercice" }),
    );

    expect(
      screen.getByRole("button", { name: /^Tapis de course/ }).textContent,
    ).toContain("10 min · 2,5 km · 0,5 km/h");
    expect(loadDraft()?.draft.blocks[0]?.exercises[3]?.sets[0]).toMatchObject({
      duration_seconds: 600,
      distance_meters: 2500,
      speed_kmh: 0.5,
    });
  });

  it("explains an exercise without any measure", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(
      screen.getByRole("button", { name: /^Mon exercice sans mesure/ }),
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Cet exercice n'a pas de mesure : tu pourras seulement le cocher comme fait.",
    );
    expect(screen.queryByText("Ajouter une série")).toBeNull();
    expect(
      screen.getByRole("group", { name: "Repos par défaut" }),
    ).toBeTruthy();
  });
});

describe("SessionEditorPage · saving (US-23)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    createFreeSessionMock.mockReset();
  });

  async function fillAndSave(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      screen.getByLabelText(/^Nom de la séance/),
      "Haut du corps",
    );
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la séance" }),
    );
  }

  it("sends the draft once, freezes the form meanwhile, then shows A9", async () => {
    let finish: (value: { appointment_id: number }) => void = () => {};
    createFreeSessionMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = renderEditor();

    await fillAndSave(user);
    // A second tap while saving changes nothing
    await user.click(screen.getByRole("button", { name: "Enregistrement…" }));

    expect(createFreeSessionMock).toHaveBeenCalledTimes(1);
    expect(createFreeSessionMock.mock.calls[0]?.[0]).toMatchObject({
      name: "Haut du corps",
      planned_date: "2026-11-26",
      blocks: [],
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Enregistrement…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    // The whole form is frozen by its fieldset
    expect(
      screen.getByLabelText(/^Nom de la séance/).closest("fieldset")?.disabled,
    ).toBe(true);

    act(() => finish({ appointment_id: 42 }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Séance enregistrée",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Haut du corps")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Séance enregistrée le jeudi 26 novembre.",
    );
    expect(screen.getByRole("link", { name: "Voir le planning" })).toBeTruthy();
    expect(loadDraft()).toBeNull();
  });

  it("keeps the draft and offers a retry when the server fails", async () => {
    createFreeSessionMock
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce({ appointment_id: 7 });
    const user = renderEditor();

    await fillAndSave(user);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible d'enregistrer la séance. Ton brouillon est conservé.",
    );
    expect(inputValue(/^Nom de la séance/)).toBe("Haut du corps");
    expect(loadDraft()?.draft.name).toBe("Haut du corps");

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Séance enregistrée",
      }),
    ).toBeTruthy();
    expect(createFreeSessionMock).toHaveBeenCalledTimes(2);
  });

  it("names the exercise the server refuses", async () => {
    saveDraft({
      draft: {
        name: "Dos",
        planned_date: "2026-11-26",
        planned_time: null,
        blocks: [
          {
            key: "b1",
            block_type: "classic",
            name: null,
            instructions: null,
            planned_rounds: null,
            time_limit_seconds: null,
            exercises: [
              {
                key: "e1",
                exercise_id: 99,
                name: "Mon tirage élastique",
                measure_codes: ["reps"],
                default_rest_seconds: 90,
                sets: [
                  {
                    reps: 10,
                    weight_kg: null,
                    reps_left: null,
                    reps_right: null,
                    weight_left_kg: null,
                    weight_right_kg: null,
                    duration_seconds: null,
                    distance_meters: null,
                    speed_kmh: null,
                    resistance: null,
                    incline_percent: null,
                    calories: null,
                    rest_after_seconds: null,
                  },
                ],
              },
            ],
          },
        ],
      },
      openBlockKey: null,
    });
    createFreeSessionMock.mockRejectedValue(
      new ApiError(
        422,
        "EXERCISE_NOT_AVAILABLE",
        "Cet exercice n'est plus disponible. Retire-le pour enregistrer.",
        "blocks.0.exercises.0",
      ),
    );
    const user = renderEditor("/seances/nouvelle");

    await user.click(
      screen.getByRole("button", { name: "Enregistrer la séance" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "« Mon tirage élastique » n'est plus disponible. Retire-le pour enregistrer.",
    );
    expect(
      screen.getByRole("button", {
        name: /^Classique · Bloc 1/,
      }),
    ).toBeTruthy();
  });
});
