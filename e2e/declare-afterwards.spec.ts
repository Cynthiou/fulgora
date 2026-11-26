import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session planned on a past day, with two sets (US-23).
async function planSessionOn(page: Page, name: string, date: string) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: date,
      planned_time: "12:00",
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: [
            {
              exercise_id: first.id,
              default_rest_seconds: 90,
              sets: [
                { ...createEmptySet(), reps: 10 },
                { ...createEmptySet(), reps: 10 },
              ],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).appointment_id as number;
}

// US-38: the session was done without the app. Everything is confirmed at
// once, and the history keeps it at its real date (RM-050, RM-058).
test("declares a past session done, after the fact", async ({ page }) => {
  const twoDaysAgo = addDays(todayInParis(), -2);
  const yesterday = addDays(todayInParis(), -1);
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await planSessionOn(page, "Cardio léger", twoDaysAgo);

  // The session is put in "waiting for an answer" through a move to the
  // same past day, as the scheduled task would (US-25, US-27).
  await page.goto(`/seances/${id}`);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();
  await page.getByLabel(/^Heure/).fill("18:00");
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Tu as fait cette séance ?")).toBeVisible();

  // CAL-08b
  await page.getByRole("button", { name: "Je l'ai faite" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Déclarer « Cardio léger »",
  );
  await expect(page.getByText("Après coup")).toBeVisible();
  await expect(page.getByText("Non renseigné")).toBeVisible();
  await expect(page.getByText(/2 séries prévues · à vérifier/)).toBeVisible();
  await shoot(page, "cal-08b-declarer-apres-coup");
  await expectNoA11yViolation(page);

  // One set confirmed by hand, from the exercise
  await page
    .getByRole("list", { name: "Exercices de la séance" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: /^Confirmer la série 1/ }).click();
  await expect(page.getByText("1 / 2 séries confirmées")).toBeVisible();
  await expect(page.getByText("À vérifier")).toBeVisible();
  await expectNoA11yViolation(page);

  // The real date, then everything at once
  await page.getByLabel("Date réelle").fill(yesterday);
  await page
    .getByRole("button", { name: "Tout s'est passé comme prévu" })
    .click();
  await expect(page.getByText("2 / 2 séries confirmées")).toBeVisible();
  await expect(page.getByText("Validé")).toBeVisible();

  await page.getByRole("button", { name: "Enregistrer" }).click();

  // B6: the summary of the session, said to be declared after the fact
  await expect(page.getByText("✓ Terminée")).toBeVisible();
  await expect(page.getByText("Déclarée après coup")).toBeVisible();
  await expectNoA11yViolation(page);

  // The history keeps it at its real date
  await page.goto("/suivi/historique");
  await expect(
    page.getByRole("link", { name: /Cardio léger.*Effectuée/ }),
  ).toBeVisible();
});
