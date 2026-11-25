import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, as the editor would (US-23).
async function planSessionToday(page: Page, name: string, exerciseCount = 1) {
  const exercises = await page.request.get("/api/exercises");
  const items = (await exercises.json()).items.slice(0, exerciseCount);
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: todayInParis(),
      planned_time: null,
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: items.map((item: { id: number }) => ({
            exercise_id: item.id,
            default_rest_seconds: 90,
            sets: [
              { ...createEmptySet(), reps: 10 },
              { ...createEmptySet(), reps: 10 },
            ],
          })),
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

test("starts the session of the day, survives a reload and resumes it from the home page", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Haut du corps");
  await page.reload();

  // B1
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Haut du corps" }),
  ).toBeVisible();
  await expect(page.getByText("Planifiée")).toBeVisible();
  await expect(page.getByText(/1 bloc · 1 exercice/)).toBeVisible();
  await expectNoA11yViolation(page);

  // Start: B2
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Haut du corps" }),
  ).toBeVisible();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();
  await expect(
    page.getByText(/^Durée de la séance ● \d+:\d{2}$/),
  ).toBeVisible();
  await expect(page.getByText("0 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText("2 séries · 10 rép.")).toBeVisible();
  await expectNoA11yViolation(page);

  // The chrono keeps counting after a reload (computed from the start time)
  await page.waitForTimeout(2000);
  await page.reload();
  const chrono = page.getByText(/^Durée de la séance ● \d+:\d{2}$/);
  await expect(chrono).toBeVisible();
  const text = (await chrono.textContent()) ?? "";
  const seconds = Number(text.split(":").at(-1));
  expect(seconds).toBeGreaterThanOrEqual(2);

  // Home: resume
  await page.goto("/");
  await expect(page.getByText("● En cours")).toBeVisible();
  await expect(
    page.getByText(/Commencée à \d{2}:\d{2} · 0 \/ 2 séries/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reprendre ma séance" }).click();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();

  // The appointment cannot start twice
  await page.goBack();
  await expectHomePage(page);
});

test("validates the sets of an exercise, one as planned and one changed, then moves on", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Pecs", 2);
  await page.reload();
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();

  // B2 -> B3
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await expect(
    page.getByText("Exercice 1 / 2 · repos 1 min 30 s"),
  ).toBeVisible();
  await expectNoA11yViolation(page);

  // Set 1 as planned: one tap, then the rest (B4)
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await expect(page.getByText("Repos · 1 min 30 s par défaut")).toBeVisible();
  await expect(page.getByText(/^Ensuite : série 2/)).toBeVisible();
  await page.getByRole("button", { name: "+ 15 s" }).click();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await expect(
    page.getByRole("button", { name: /Série 1 validée/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider la série 2" }),
  ).toBeVisible();

  // Set 2 changed through the sheet
  await page.getByRole("button", { name: /^Modifier la série/ }).click();
  await expect(page.getByText("Ce que tu as réellement fait")).toBeVisible();
  await expectNoA11yViolation(page);
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 2" })
    .click();

  // Two exercises in this session: the rest still comes (US-30)
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await expect(
    page.getByRole("button", { name: /Série 2 validée/ }),
  ).toBeVisible();
  await expect(page.getByText("9 rép.")).toBeVisible();

  // Next exercise, then back to B2 with the counters updated
  await page.getByRole("link", { name: /^Suivant :/ }).click();
  await expect(
    page.getByText("Exercice 2 / 2 · repos 1 min 30 s"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await expect(page.getByText("2 / 4", { exact: true })).toBeVisible();
  await expect(page.getByText("2 / 2 séries")).toBeVisible();
});

test("abandons the session after a set: unfinished, sets kept, nothing left in progress", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Dos");
  await page.reload();
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("link", { name: "Exercices", exact: true }).click();

  await page.getByRole("button", { name: "Abandonner" }).click();
  await expect(page.getByText("Abandonner cette séance ?")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Continuer ma séance" }).click();
  await expect(
    page.getByRole("button", { name: "Terminer la séance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abandonner" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abandonner" })
    .click();

  // The summary (B6), unfinished
  await expect(page.getByText("Inachevée")).toBeVisible();
  await expect(page.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 / 2 · 10 rép. · série 2 non faite"),
  ).toBeVisible();
  await expectNoA11yViolation(page);

  await page.goto("/");
  await expectHomePage(page);
  await expect(
    page.getByRole("link", { name: "Reprendre ma séance" }),
  ).toHaveCount(0);
});

test("finishes a session and shows the summary with the right figures", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Complète");
  await page.reload();
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();

  // Two sets: 10 reps as planned, then 8 reps
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("button", { name: /^Modifier la série/ }).click();
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 2" })
    .click();

  // Last set of the session: the exercises come back without a rest (US-30)
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await expect(page.getByText("Terminer la séance ?")).toBeVisible();
  await expect(
    page.getByText("Toutes les séries sont faites. Ton résumé t'attend."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();

  await expect(page.getByText("Terminée")).toBeVisible();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText("2 / 2 · 10, 8 rép.")).toBeVisible();
  await expect(page.getByText("0 kg")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("link", { name: "Retour au planning" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Planning");
});

test("a session already finished never offers to start again", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Pecs");
  await page.reload();

  // Start it and finish it
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();

  // Back home: the status and the summary, no "Démarrer"
  await page.goto("/");
  await expectHomePage(page);
  await expect(page.getByText("Effectuée")).toBeVisible();
  await expect(page.getByText(/1 \/ 2 séries/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Démarrer la séance/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Reprendre ma séance" }),
  ).toHaveCount(0);

  // The planning says the same, and the detail offers the summary
  await page.goto("/planning");
  // The day under the grid counts it as done (CAL-01)
  await expect(
    page.getByRole("heading", { name: /1 séance · 1 effectuée/ }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Voir le résumé" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pecs");
});

// US-32: the session grows while it runs. The plan never moves (RM-043).
test("adds a set and an exercise during the session, and removes the added set", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Haut du corps");
  await page.reload();

  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();

  // One more set on the first exercise (B3a)
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "+ Ajouter une série" }).click();
  await expect(page.getByText("Ajoutée").first()).toBeVisible();

  // The added set goes away; the planned ones have no trash (RM-048)
  const trashes = page.getByRole("button", { name: /^Retirer la série/ });
  await expect(trashes).toHaveCount(1);
  await trashes.first().click();
  await expect(trashes).toHaveCount(0);
  await expect(page.getByText("Ajoutée")).toHaveCount(0);

  // One more exercise, in a new block (B2)
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await page
    .getByRole("link", { name: "+ Ajouter un exercice ou un bloc" })
    .click();
  await expect(
    page.getByText("Sélection pour la séance en cours"),
  ).toBeVisible();
  await page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: /^Ajouter à la séance/ }).click();

  await expect(page.getByText("Où ajouter ces exercices ?")).toBeVisible();
  await page.getByRole("button", { name: /Dans un nouveau bloc/ }).click();

  // The new block is there, with its exercise and one empty set
  await expect(
    page.getByRole("heading", { name: /Classique · Bloc 2/ }),
  ).toBeVisible();
});
