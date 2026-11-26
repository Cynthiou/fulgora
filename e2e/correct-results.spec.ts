import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session of today with one exercise and one planned set of 10 reps.
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

// US-37: a wrong figure is fixed afterwards; the plan never moves.
test("corrects the result of a past session from its summary", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Réveil musculaire");
  await page.reload();

  // The session is done with 12 reps instead of 10
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: /^Modifier la série/ }).click();
  await page
    .getByRole("button", { name: "Augmenter Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("button", { name: "Augmenter Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 1" })
    .click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();
  await expect(page.getByText("12 rép.").first()).toBeVisible();

  // B6: "Corriger" opens the same screens, in correction mode
  await page.getByRole("link", { name: "Corriger les résultats" }).click();
  await expect(page.getByText("Correction", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Les objectifs prévus ne changent pas."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enregistrer les corrections" }),
  ).toBeDisabled();
  await shoot(page, "b2c-correction-de-la-seance");
  await expectNoA11yViolation(page);

  // The set goes back to 10 reps
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByText("Correction", { exact: true })).toBeVisible();
  // A set already done opens its sheet from its own line (B3b)
  await page.getByRole("button", { name: /Série 1 validée/ }).click();
  await expect(page.getByText("Ce que tu as réellement fait")).toBeVisible();
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 1" })
    .click();
  // No rest while correcting: the set shows its new value right away
  await expect(page.getByText("10 rép.").first()).toBeVisible();
  await expectNoA11yViolation(page);

  await page.getByRole("link", { name: "Retour aux exercices" }).click();
  await page
    .getByRole("button", { name: "Enregistrer les corrections" })
    .click();

  // Back on the summary, with the message and the corrected figure
  await expect(page.getByText("Résultats corrigés.")).toBeVisible();
  await expect(page.getByText("12 rép.")).toHaveCount(0);

  // SUI-06: the plan still says 10, and the result too
  await page.goto("/suivi");
  await page.getByRole("link", { name: /Réveil musculaire/ }).click();
  const row = page.getByRole("table").getByRole("row").nth(1);
  await expect(row).toContainText("10 rép.");
  await expect(row).toContainText("=");
});
