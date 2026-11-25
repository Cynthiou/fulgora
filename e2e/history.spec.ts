import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, with one exercise and one set.
async function planSessionToday(page: Page, name: string) {
  const exercises = await page.request.get("/api/exercises");
  const first = (await exercises.json()).items[0];
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
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  // The only set of the session: no rest, the exercises come back (US-30)
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();

  // SUI-05
  await page.goto("/suivi");
  await expect(page.getByText(/^Semaine du \d+ /)).toBeVisible();
  const row = page.getByRole("link", { name: /Réveil musculaire.*Effectuée/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Séance libre");
  await expect(page.getByRole("button", { name: "Charger plus" })).toHaveCount(
    0,
  );
  await expectNoA11yViolation(page);

  // SUI-06: from the list to the detail, planned against done
  await row.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Réveil musculaire" }),
  ).toBeVisible();
  await expect(page.getByText(/^Effectuée .* · \d{2}:\d{2}$/)).toBeVisible();
  await expect(page.getByText("1 / 1 objectifs")).toBeVisible();
  const table = page.getByRole("table");
  await expect(
    table.getByRole("columnheader", { name: "Prévu" }),
  ).toBeVisible();
  await expect(table.getByRole("row").nth(1)).toContainText("10 rép.");
  await expect(table.getByRole("row").nth(1)).toContainText("=");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Retour à l'historique" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suivi");
});
