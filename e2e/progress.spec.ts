import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session of one exercise, planned on a day, then done with one set.
async function doSessionOn(page: Page, date: string, reps: number) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const created = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: `Séance du ${date}`,
      planned_date: date,
      planned_time: null,
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: [
            {
              exercise_id: first.id,
              default_rest_seconds: 90,
              sets: [{ ...createEmptySet(), reps }],
            },
          ],
        },
      ],
    },
  });
  expect(created.status()).toBe(201);
  return {
    appointmentId: (await created.json()).appointment_id as number,
    exerciseId: first.id as number,
  };
}

// US-39: the progress of an exercise, from the catalog or from the Suivi.
test("follows the progress of an exercise over two sessions", async ({
  page,
}) => {
  test.slow();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // Two sessions done today: the second one with more repetitions
  const first = await doSessionOn(page, todayInParis(), 10);
  await page.reload();
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();

  // SUI-08: the exercise is in the list of the Suivi
  await page.goto("/suivi/exercices");
  await expect(
    page.getByRole("heading", { level: 1, name: "Progression par exercice" }),
  ).toBeVisible();
  const row = page.getByRole("link", { name: /Dernière fois le/ }).first();
  await expect(row).toBeVisible();
  await shoot(page, "sui-08-exercices-realises");
  await expectNoA11yViolation(page);

  // SUI-10b: one session only, no curve yet
  await row.click();
  await expect(page.getByText("Une seule séance pour l'instant")).toBeVisible();
  await expect(
    page.getByText("La courbe apparaîtra dès la 2ᵉ séance."),
  ).toBeVisible();
  await shoot(page, "sui-10b-une-seule-seance");
  await expectNoA11yViolation(page);

  // The same exercise, declared done two days ago with more repetitions
  // (US-38): the progress needs two different days.
  const second = await doSessionOn(page, addDays(todayInParis(), -2), 12);
  expect(second.exerciseId).toBe(first.exerciseId);
  await page.goto(`/seances/${second.appointmentId}`);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();
  await page.getByLabel(/^Heure/).fill("18:00");
  await page.getByRole("button", { name: "Confirmer" }).click();
  await page.getByRole("button", { name: "Je l'ai faite" }).click();
  await page.getByLabel("Date réelle").fill(addDays(todayInParis(), -2));
  await page
    .getByRole("button", { name: "Tout s'est passé comme prévu" })
    .click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("✓ Terminée")).toBeVisible();

  // SUI-10: two sessions, the curve and its table of values
  await page.goto(`/suivi/exercices/${first.exerciseId}`);
  await expect(
    page.getByText(/De \d+ rép\. à \d+ rép\. en 2 séances/),
  ).toBeVisible();
  await page.getByRole("group").getByText("Voir les valeurs").click();
  await expect(page.getByRole("table")).toContainText("12 rép.");
  await shoot(page, "sui-10-progression-repetitions");
  await expectNoA11yViolation(page);

  // The catalog opens the same screen (US-39)
  await page.goto(`/catalogue/${first.exerciseId}`);
  await page.getByRole("link", { name: "Ma progression" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    "Catalogue",
  );
  await expect(page.getByRole("list", { name: "Records" })).toBeVisible();
});

// US-40: beating a maximum writes a notification that opens the progress.
test("writes a record notification at the end of a session", async ({
  page,
}) => {
  test.slow();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // Two sessions of the same exercise: the second one does more
  for (const reps of [8, 12]) {
    const session = await doSessionOn(page, todayInParis(), reps);
    await page.goto(`/seances/${session.appointmentId}`);
    await page.getByRole("button", { name: /Démarrer la séance/ }).click();
    await page
      .getByRole("list", { name: "Exercices du bloc" })
      .getByRole("link")
      .first()
      .click();
    await page.getByRole("button", { name: "Valider la série 1" }).click();
    await page.getByRole("button", { name: "Terminer la séance" }).click();
    await page.getByRole("button", { name: "Terminer", exact: true }).click();
    await expect(page.getByText("Terminée")).toBeVisible();
  }

  // NOT-06: the record of the second session
  await page.goto("/notifications");
  const record = page.getByRole("link", { name: /répétitions max/ });
  await expect(record).toBeVisible();
  await shoot(page, "not-06-record-personnel");
  await expectNoA11yViolation(page);

  // It opens the progress of the exercise, with its banner
  await record.click();
  await expect(page.getByText(/^Nouveau record ·/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Records" })).toContainText(
    "12 rép.",
  );
});

// US-41: the summary of the week and of the month (SUI-01, SUI-02, SUI-04).
test("shows the summary of the week, then of the month", async ({ page }) => {
  test.slow();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // SUI-04: nothing yet
  await page.goto("/suivi");
  await expect(
    page.getByText("Ton suivi commencera après ta première séance"),
  ).toBeVisible();
  await shoot(page, "sui-04-suivi-vide");
  await expectNoA11yViolation(page);

  // One session done today
  const session = await doSessionOn(page, todayInParis(), 10);
  await page.goto(`/seances/${session.appointmentId}`);
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();

  // SUI-01: the week
  await page.goto("/suivi");
  await expect(page.getByRole("heading", { name: "Régularité" })).toBeVisible();
  await expect(page.getByText("1 prévue")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Travail" })).toBeVisible();
  await expect(
    page.getByText("Le tonnage n'apparaît qu'avec des charges."),
  ).toBeVisible();
  await shoot(page, "sui-01-resume-semaine");
  await expectNoA11yViolation(page);

  // SUI-02: the month, with its comparison
  await page.getByRole("button", { name: "Mois" }).click();
  await expect(page.getByText(/Comparé à la même durée du mois/)).toBeVisible();
  await shoot(page, "sui-02-resume-mois");
  await expectNoA11yViolation(page);

  // The arrows change the period, and the address keeps it
  await page.getByRole("button", { name: "Période précédente" }).click();
  expect(page.url()).toContain("periode=month");
  await expect(page.getByRole("heading", { name: "Régularité" })).toHaveCount(
    0,
  );
});
