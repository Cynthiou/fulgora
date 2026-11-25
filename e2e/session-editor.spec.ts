import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectHomePage, signUp } from "./helpers";

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
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Nothing changed: back goes home at once.
  await page.getByRole("button", { name: "Retour" }).click();
  await expectHomePage(page);

  // A changed draft asks first.
  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await expect(page.getByText("Classique · Bloc 1")).toBeVisible();

  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByText("Quitter sans enregistrer ?")).toBeVisible();
  const dialog = await new AxeBuilder({ page }).analyze();
  expect(dialog.violations).toEqual([]);
  await page.getByRole("button", { name: "Continuer la séance" }).click();
  await expect(page.getByLabel(/^Nom de la séance/)).toHaveValue(
    "Haut du corps",
  );

  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Quitter" }).click();
  await expectHomePage(page);
});
