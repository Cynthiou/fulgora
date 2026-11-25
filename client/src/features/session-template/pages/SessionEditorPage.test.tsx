import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { formatLongDate, type SelectedExercise } from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/apiError";
import { createFreeSession } from "../../appointment/services/appointmentService";
import {
  loadDraft,
  saveDraft,
  savePendingExercises,
} from "../services/sessionDraftStorage";
import SessionEditorPage from "./SessionEditorPage";

vi.mock("../../appointment/services/appointmentService", () => ({
  createFreeSession: vi.fn(),
}));
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
      "Jeudi 26 novembre",
    );
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
    renderEditor("/seances/nouvelle?date=hier");

    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain(
      formatLongDate(new Date().toISOString().slice(0, 10)),
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
    expect(screen.getByText("Séance le jeudi 26 novembre")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(screen.getByText("Décembre 2026")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mois précédent" }));
    await user.click(
      screen.getByRole("button", { name: /^Samedi 28 novembre/ }),
    );
    expect(screen.getByText("Séance le samedi 28 novembre")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Valider la date" }));

    expect(screen.queryByText("Date de la séance")).toBeNull();
    expect(screen.getByRole("button", { name: /^Date/ }).textContent).toContain(
      "Samedi 28 novembre",
    );
    expect(loadDraft()?.draft.planned_date).toBe("2026-11-28");
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
    expect(screen.getByText("Bloc 1 · Haut du corps")).toBeTruthy();
    expect(screen.getByText("0 exercice")).toBeTruthy();
    expect(
      screen.getByText("Choisis tes exercices dans le catalogue."),
    ).toBeTruthy();

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
    expect(screen.getAllByText("1 série · 10 rép.")).toHaveLength(2);
    // Taken once: a reload must not add them again.
    expect(sessionStorage.getItem("session-editor:pending-exercises")).toBe(
      null,
    );

    // Remove, then undo
    await user.click(
      screen.getByRole("button", { name: "Retirer Développé couché" }),
    );
    expect(screen.getByText("1 exercice")).toBeTruthy();
    expect(screen.getByText("Exercice retiré")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("2 exercices")).toBeTruthy();
    expect(
      screen.getByRole("list", { name: "Exercices du bloc" }).textContent,
    ).toMatch(/Développé couché.*Tractions/);

    // Back to the session: the card sums the block up, no more warning
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bloc" }),
    );
    expect(screen.getByText("Classique · Force")).toBeTruthy();
    expect(screen.getByText("Développé couché · Tractions")).toBeTruthy();
    expect(screen.queryByText(/n'a pas encore d'exercice/)).toBeNull();
  });

  it("starts a session with a Classic block when the catalog hands exercises over", () => {
    renderEditor({
      pathname: "/seances/nouvelle",
      state: { exercises: [bench] },
    });

    expect(screen.getByText("1 bloc")).toBeTruthy();
    expect(screen.getByText("Classique · Bloc 1")).toBeTruthy();
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
    ).toContain("2 séries · 11 rép. · 40 kg");
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
    ).toContain("1 série · 10 rép. · 5 kg lest");
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

    await user.click(screen.getByRole("button", { name: "+ Série" }));
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

  it("calls the sets of a cardio exercise stages, shown in km", async () => {
    const user = renderEditor("/seances/nouvelle");
    await user.click(screen.getByRole("button", { name: /^Tapis de course/ }));

    expect(screen.getByText("Étape 1")).toBeTruthy();
    expect(field("Durée (min:s)").value).toBe("10:00");
    expect(screen.getByRole("button", { name: "+ Étape" })).toBeTruthy();
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
    ).toContain("1 étape · 10 min · 2,5 km · 0,5 km/h");
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
    expect(screen.queryByText("+ Série")).toBeNull();
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
    expect(screen.getByText("Classique · Bloc 1")).toBeTruthy();
  });
});
