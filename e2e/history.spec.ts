import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, with one exercise and one set.
async function planSessionToday(page: Page, name: string) {
  const exercises = await page.request.get("/api/exercises");
  const first = (await exercises.json()).items[0];
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      name,
      planned_date: todayInParis(),
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
              sets: [{ ...createEmptySet(), reps: 10 }],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

test("the history is empty at first, then lists the finished session under its week", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // SUI-07
  await page.getByRole("link", { name: "Suivi", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suivi");
  await expect(page.getByText("Aucune séance passée")).toBeVisible();
  await expectNoA11yViolation(page);

  // A session done today
  await planSessionToday(page, "Réveil musculaire");
  await page.goto("/");
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page.getByRole("link", { name: /0 \/ 1 série/ }).click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("link", { name: "Retour aux exercices" }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();

  // SUI-05
  await page.goto("/suivi");
  await expect(page.getByText(/^Semaine du \d+ /)).toBeVisible();
  const row = page.getByRole("link", { name: /^Réveil musculaire, Effectuée/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Séance libre");
  await expect(page.getByRole("button", { name: "Charger plus" })).toHaveCount(
    0,
  );
  await expectNoA11yViolation(page);
});
