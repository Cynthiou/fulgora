import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage } from "./helpers";

// Each run creates a new account in the test database (see playwright.config.ts).
function uniqueStamp() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("a visitor creates an account and lands on the home page", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await page.goto("/inscription");

  // State 1: empty form
  await expectNoA11yViolation(page);

  await page.getByLabel(/^Pseudo/).fill(`e2e_${stamp}`);
  await page.getByLabel(/^Adresse e-mail/).fill(`e2e_${stamp}@exemple.fr`);
  await page.getByLabel(/^Mot de passe/).fill("secret-2026");
  await page.getByLabel(/J'accepte/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // State 5: success, session open
  await expect(
    page.getByRole("heading", { name: "Compte créé" }),
  ).toBeVisible();
  await expect(
    page.getByText(`Bienvenue e2e_${stamp}. Ton compte est prêt.`),
  ).toBeVisible();
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
});

test("an empty form shows its errors without calling the server", async ({
  page,
}) => {
  await page.goto("/inscription");

  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // State 3: validation errors
  await expect(page.getByRole("alert")).toContainText(
    "4 champs à corriger. Le compte n'a pas été créé.",
  );
  await expect(page.getByLabel(/^Pseudo/)).toBeFocused();
  await expectNoA11yViolation(page);
});
