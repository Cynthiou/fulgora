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

test("picks three exercises from the catalog for a block, in the touched order", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();

  // The catalog in selection mode for the block
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await expect(page.getByText("Sélection pour le bloc 1")).toBeVisible();
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  const names = [
    await cards.nth(2).locator("span.truncate").textContent(),
    await cards.nth(0).locator("span.truncate").textContent(),
    await cards.nth(1).locator("span.truncate").textContent(),
  ].map((name) => (name ?? "").replace(/, (non )?sélectionné.*$/, ""));
  await cards.nth(2).click();
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(2)).toContainText("1 sur 3");
  await expectNoA11yViolation(page);

  // A detour through a detail keeps the selection
  await page.getByRole("link", { name: `Fiche de ${names[0]}` }).click();
  await expect(
    page.getByRole("button", { name: "Déjà dans la sélection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour à la sélection" }).click();
  await expect(cards.nth(2)).toContainText("1 sur 3");

  await page
    .getByRole("button", { name: "Ajouter au bloc, 3 sélectionnés" })
    .click();

  // Back in the block (A6), same order, one pre-filled set each
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classique");
  await expect(page.getByText("3 exercices")).toBeVisible();
  const rows = page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(3);
  for (const [index, name] of names.entries()) {
    await expect(rows.nth(index)).toContainText(name);
    await expect(rows.nth(index)).toContainText(/^.*1 (série|étape)/);
  }
  await expectNoA11yViolation(page);

  // Back to the session: the warning is gone
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText(/n'a pas encore d'exercice/)).toHaveCount(0);
});

test("starts a session from the catalog with « Sélectionner » and « Ajouter à une séance »", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/catalogue");
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();

  await page.getByRole("button", { name: "Sélectionner" }).click();
  await expect(page.getByText("0 sélectionné")).toBeVisible();
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByText("2 sélectionnés")).toBeVisible();
  await expectNoA11yViolation(page);

  await page
    .getByRole("button", { name: "Ajouter à une séance, 2 sélectionnés" })
    .click();
  await expect(page.getByText("Ajouter 2 exercices")).toBeVisible();
  await expect(page.getByText("Nouvelle séance libre")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Continuer vers l'éditeur" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouvelle séance",
  );
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText("Classique · Bloc 1")).toBeVisible();
  await expect(page.getByText(/n'a pas encore d'exercice/)).toHaveCount(0);
});
