import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("a new user opens the session editor and is asked before leaving a draft", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouvelle séance",
  );
  await expect(page.getByText("0 bloc")).toBeVisible();
  await expectNoA11yViolation(page);

  // Nothing changed: back goes home at once.
  await page.getByRole("button", { name: "Retour" }).click();
  await expectHomePage(page);

  // A changed draft asks first.
  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByText("Quitter sans enregistrer ?")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Continuer la séance" }).click();
  await expect(page.getByLabel(/^Nom de la séance/)).toHaveValue(
    "Haut du corps",
  );

  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Quitter" }).click();
  await expectHomePage(page);
});

test("adds a block through the type panel, names it, removes it and undoes", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  // The type panel: 8 types, 3 of them "Bientôt"
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await expect(page.getByText("Type de bloc")).toBeVisible();
  await expect(page.getByRole("button", { name: /^AMRAP/ })).toBeDisabled();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: /^Classique/ }).click();

  // The block screen
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classique");
  await expect(page.getByText("Bloc 1 · Haut du corps")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByLabel(/^Intitulé/).fill("Force");
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  // Back on the session: the card, then remove and undo
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText("Classique · Force")).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer le bloc Classique · Force" })
    .click();
  await expect(page.getByText("0 bloc")).toBeVisible();
  await expect(page.getByText("Bloc retiré")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("Classique · Force")).toBeVisible();
  await expect(page.getByText("1 bloc")).toBeVisible();
});
