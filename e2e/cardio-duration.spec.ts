import { expect, type Page, test } from "@playwright/test";
import { signUp } from "./helpers";

// One exercise of the catalog, chosen for the open block (A5).
async function pickFromCatalog(page: Page, name: string) {
  const search = page.getByRole("searchbox");
  await search.fill(name);
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await expect(cards.first()).toContainText(name);
  await cards.first().click();
  await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
}

// RM-083: a plain number is minutes in cardio, seconds everywhere else.
test("reads a plain duration in minutes in cardio, in seconds elsewhere", async ({
  page,
}) => {
  test.slow();
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Cardio et gainage");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await pickFromCatalog(page, "Tapis de course");
  await pickFromCatalog(page, "Gainage (planche)");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 2 sélectionnés" })
    .click();

  // Cardio: "30" means 30 minutes, and + adds one minute
  await page.getByRole("button", { name: /^Tapis de course/ }).click();
  const cardio = page.getByRole("textbox", { name: /^Durée/ });
  await expect(cardio).toHaveAttribute("placeholder", "ex. 30:00");
  await cardio.fill("30");
  await cardio.blur();
  await page.getByRole("button", { name: /^Augmenter Durée/ }).click();
  await expect(cardio).toHaveValue("31:00");
  // A written duration is never changed: 1:30 stays one minute and a half
  await cardio.fill("1:30");
  await page.getByRole("button", { name: /^Augmenter Durée/ }).click();
  await expect(cardio).toHaveValue("2:30");
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Tapis de course/ }),
  ).toContainText("2 min 30");

  // Plank: "30" still means 30 seconds, and + adds 15 seconds
  await page.getByRole("button", { name: /^Gainage \(planche\)/ }).click();
  const plank = page.getByRole("textbox", { name: /^Durée/ });
  await expect(plank).toHaveAttribute("placeholder", "ex. 0:45");
  await plank.fill("30");
  await plank.blur();
  await page.getByRole("button", { name: /^Augmenter Durée/ }).click();
  await expect(plank).toHaveValue("0:45");
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Gainage \(planche\)/ }),
  ).toContainText("45 s");
});
