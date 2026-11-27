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

// "Dernière fois" asks the server; here the exercise was never done.
vi.mock(
  "../../../../src/features/session-template/services/lastSetsService",
  () => ({ readLastSets: vi.fn(() => Promise.resolve([])) }),
);

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
              key: "e6",
              exercise_id: 90,
              name: "Fentes haltères",
              meta: "Jambes · Haltères",
              measure_codes: ["reps", "weight"],
              allows_per_side: true,
              default_rest_seconds: 90,
              sets: [{ ...set, reps: 10 }],
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

// The number written in one case of the sheet, read by its cyan label.
function caseValue(head: string): string {
  return (screen.getByLabelText(head) as HTMLInputElement).value;
}

describe("SessionEditorPage · les séries d'un exercice (handoff des séries)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveBlockWithProfiles();
  });

  // Opens the sheet of the only line of an exercise.
  async function openLine(
    user: ReturnType<typeof userEvent.setup>,
    name: RegExp,
  ) {
    await user.click(screen.getByRole("button", { name }));
    await user.click(
      screen.getAllByRole("button", { name: /^\d+ série/ })[0] as HTMLElement,
    );
  }

  it("writes the lines of a weighted exercise, and sums them up", async () => {
    const user = renderEditor("/seances/nouvelle");

    await user.click(screen.getByRole("button", { name: /^Développé couché/ }));

    // The list of the handoff: its title, its rest and its one line
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Développé couché",
    );
    expect(screen.getByText("Exercice 1 sur 6")).toBeTruthy();
    expect(screen.getByText("Repos entre séries")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Séries" }).textContent).toContain(
      "1 série",
    );

    await user.click(screen.getByRole("button", { name: /^1 série/ }));

    // The sheet: one case per measure, and nothing else
    expect(screen.getByLabelText("SÉRIES")).toBeTruthy();
    expect(screen.getByLabelText("RÉPÉTITIONS")).toBeTruthy();
    expect(screen.getByLabelText("CHARGE")).toBeTruthy();
    expect(screen.getByText("Première fois sur cet exercice")).toBeTruthy();
    // Nothing is saved while the load is empty
    expect(
      (screen.getByRole("button", { name: "Enregistrer" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await user.type(screen.getByLabelText("CHARGE"), "60");
    await user.click(screen.getByRole("button", { name: "Augmenter séries" }));
    await user.click(screen.getByRole("button", { name: "Augmenter séries" }));
    expect(caseValue("SÉRIES")).toBe("3");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByRole("list", { name: "Séries" }).textContent).toBe(
      "3 séries10 rép. · 60 kg",
    );
    expect(loadDraft()?.draft.blocks[0]?.exercises[0]?.sets).toHaveLength(3);
  });

  it("steps a load by 2,5 kg and a duration by 5 s", async () => {
    const user = renderEditor("/seances/nouvelle");
    await openLine(user, /^Développé couché/);

    await user.type(screen.getByLabelText("CHARGE"), "60");
    await user.click(screen.getByRole("button", { name: "Augmenter charge" }));
    expect(caseValue("CHARGE")).toBe("62,5");
    await user.click(screen.getByRole("button", { name: "Diminuer charge" }));
    await user.click(screen.getByRole("button", { name: "Diminuer charge" }));
    expect(caseValue("CHARGE")).toBe("57,5");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    // Back to the block, then the exercise measured in time
    await user.click(
      screen.getByRole("button", { name: "Valider l'exercice" }),
    );
    await openLine(user, /^Gainage/);
    expect(caseValue("DURÉE")).toBe("60");
    await user.click(screen.getByRole("button", { name: "Augmenter durée" }));
    expect(caseValue("DURÉE")).toBe("65");
  });

  it("saves a body weight exercise without any added weight", async () => {
    const user = renderEditor("/seances/nouvelle");
    await openLine(user, /^Anges au mur/);

    expect(screen.getByLabelText("LEST")).toBeTruthy();
    // The lest may stay empty: the goal is complete without it
    expect(
      (screen.getByRole("button", { name: "Enregistrer" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("10 rép.")).toBeTruthy();
  });

  it("counts the stages of a cardio machine in minutes", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Tapis de course/ }));

    expect(screen.getByText("Étapes")).toBeTruthy();
    expect(screen.getByText("Repos entre étapes")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Ajouter une étape/ }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Étape 1/ }));

    expect(screen.getByLabelText("NOMBRE DE TOURS")).toBeTruthy();
    // 600 seconds are stored, 10 minutes are read
    expect(caseValue("DURÉE")).toBe("10");
    expect(screen.getByLabelText("VITESSE")).toBeTruthy();
    expect(screen.getByLabelText("INCLINAISON")).toBeTruthy();
    // The distance and the calories wait behind "Modifier"
    expect(screen.queryByLabelText("DISTANCE")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Augmenter durée" }));
    await user.type(screen.getByLabelText("VITESSE"), "9");
    await user.type(screen.getByLabelText("INCLINAISON"), "1");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByText("11 min · 9 km/h · 1 %")).toBeTruthy();
    expect(loadDraft()?.draft.blocks[0]?.exercises[3]?.sets[0]).toMatchObject({
      duration_seconds: 660,
      speed_kmh: 9,
      incline_percent: 1,
    });
  });

  it("shows the distance and the calories of a cardio machine on « Modifier »", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Tapis de course/ }));

    await user.click(screen.getByRole("button", { name: "Modifier" }));
    await user.click(screen.getByRole("button", { name: /^Étape 1/ }));

    expect(screen.getByLabelText("DISTANCE")).toBeTruthy();
    expect(screen.getByLabelText("CALORIES")).toBeTruthy();
  });

  it("adds a line that copies the one before it, with one set", async () => {
    const user = renderEditor("/seances/nouvelle");
    await openLine(user, /^Développé couché/);
    await user.type(screen.getByLabelText("CHARGE"), "60");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await user.click(
      screen.getByRole("button", { name: /Ajouter une série différente/ }),
    );

    expect(caseValue("SÉRIES")).toBe("1");
    expect(caseValue("CHARGE")).toBe("60");
    expect(screen.getByText("Ligne 2")).toBeTruthy();

    // "Annuler" on a line that was never saved drops it
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("list", { name: "Séries" }).children).toHaveLength(
      1,
    );
  });

  it("asks the two sides apart on a per-side exercise", async () => {
    const user = renderEditor("/seances/nouvelle");
    await openLine(user, /^Fentes/);

    // "Chaque côté" is offered by the catalog (RM-084)
    await user.click(screen.getByRole("button", { name: "Côté par côté" }));
    expect(screen.getByLabelText("RÉPÉTITIONS PAR CÔTÉ")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Rép." }));
    expect(screen.getByLabelText("RÉP. GAUCHE")).toBeTruthy();
    expect(screen.getByLabelText("RÉP. DROITE")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Charge" }));
    expect(screen.getByLabelText("CHARGE GAUCHE")).toBeTruthy();
    expect(screen.getByLabelText("CHARGE DROITE")).toBeTruthy();
  });

  it("validates the exercise only once a line is written", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(
      screen.getByRole("button", { name: /^Mon exercice sans mesure/ }),
    );

    const validate = screen.getByRole("button", {
      name: "Valider l'exercice",
    }) as HTMLButtonElement;
    expect(validate.disabled).toBe(false);

    await user.click(validate);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Classique",
    );
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
