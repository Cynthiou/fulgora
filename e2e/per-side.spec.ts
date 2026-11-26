import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// US-51: an exercise done left then right, with a different load on each
// side (D-02, RM-044).
test("prepares a per-side exercise and does it side by side", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // A7: a session with one exercise measured in reps and weight
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Bras");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  // An exercise the catalog allows side by side (RM-084)
  await page.getByRole("searchbox").fill("Fentes avec haltères");
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await expect(cards.first()).toContainText("Fentes avec haltères");
  await cards.first().click();
  await page.getByRole("button", { name: /^Ajouter au bloc/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("listitem")
    .first()
    .getByRole("button")
    .nth(1)
    .click();

  // A7e: "Chaque côté", then a load per side
  await page.getByRole("switch", { name: "Chaque côté" }).click();
  await expect(
    page.getByRole("textbox", { name: "Rép. / côté" }),
  ).toBeVisible();
  await page
    .getByRole("switch", { name: "Même charge des deux côtés" })
    .click();
  await page.getByRole("textbox", { name: "Charge gauche (kg)" }).fill("10");
  await page.getByRole("textbox", { name: "Charge droite (kg)" }).fill("6");
  await shoot(page, "a7e-chaque-cote");
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  // A6: the line of the exercise says the goal and the two loads (A7e)
  await expect(page.getByText(/rép\. \/ côté · G 10 · D 6 kg/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Séance enregistrée" }),
  ).toBeVisible();

  // B5g: the session, side by side
  await page.goto("/");
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();

  await expect(page.getByText("Gauche", { exact: true })).toBeVisible();
  await expect(page.getByText("Droite", { exact: true })).toBeVisible();
  await shoot(page, "b5g-cote-par-cote");
  await expectNoA11yViolation(page);

  // The left side alone: it is recorded, the set is not done yet
  await page.getByRole("button", { name: "Valider" }).first().click();
  await expect(
    page.getByRole("button", { name: "Modifier", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Valider" })).toHaveCount(1);

  // The right side: the set is done and the session moves on (RM-044)
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByText("Séries réalisées")).toBeVisible();
  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();

  // B6: the summary says both sides
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("✓ Terminée")).toBeVisible();
  await expect(
    page.getByText(/G 10 rép\. · 10 kg \/ D 10 rép\. · 6 kg/),
  ).toBeVisible();
  // 10 × 10 + 10 × 6
  await expect(page.getByText("160 kg")).toBeVisible();
  await expectNoA11yViolation(page);
});
