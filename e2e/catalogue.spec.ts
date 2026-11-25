import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { signUp } from "./helpers";

// The cards of the exercise list (not the links of the tab bar).
function exerciseCards(page: Page) {
  return page.getByRole("list", { name: "Exercices" }).getByRole("link");
}

// The test database holds the shared catalog (seeded by the server tests).
test("the catalog loads 20 by 20 down to the last exercise", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/catalogue");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catalogue");
  const counter = page.getByText(/^\d+ exercices$/);
  await expect(counter).toBeVisible();
  const total = Number((await counter.textContent())?.split(" ")[0]);
  expect(total).toBeGreaterThan(20);

  const cards = exerciseCards(page);
  await expect(cards).toHaveCount(20);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Scroll to the bottom until everything is loaded.
  for (let round = 0; round < 15; round += 1) {
    const count = await cards.count();
    if (count >= total) {
      break;
    }
    await page.mouse.wheel(0, 20_000);
    await expect(cards).not.toHaveCount(count, { timeout: 10_000 });
  }

  await expect(cards).toHaveCount(total);
  await expect(page.getByText("Fin de la liste")).toBeVisible();
  await expect(page.getByRole("button", { name: "Charger plus" })).toHaveCount(
    0,
  );
});

test("search and filters live in the address and survive a detour", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/catalogue");
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();

  // Search: the counter and the bold term
  await page.getByRole("searchbox").fill("squat");
  await expect(page.getByText(/résultats? pour « squat »/)).toBeVisible();
  expect(page.url()).toContain("search=squat");
  await expect(
    page.locator("strong", { hasText: /squat/i }).first(),
  ).toBeVisible();

  // Filter: open the group grid and pick "Jambes"
  await page.getByRole("button", { name: /^Groupe/ }).click();
  await expect(page.getByRole("group", { name: "Groupe" })).toBeVisible();
  const grid = await new AxeBuilder({ page }).analyze();
  expect(grid.violations).toEqual([]);
  await page.getByRole("button", { name: /Jambes/ }).click();
  await expect(page.getByText(/pour « squat » · Jambes/)).toBeVisible();
  expect(page.url()).toContain("category_ids=");
  await expect(
    page.getByRole("button", { name: "Retirer le filtre Jambes" }),
  ).toBeVisible();

  // Detour through the detail of the first card, then back
  const firstCard = exerciseCards(page).first();
  // The first truncated line of a card is its name (04-1).
  const firstName = await firstCard
    .locator("span.truncate")
    .first()
    .textContent();
  await firstCard.click();
  await expect(
    page.getByRole("heading", { level: 1, name: firstName ?? "" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Muscles" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ajouter à une séance" }),
  ).toBeVisible();
  const detail = await new AxeBuilder({ page }).analyze();
  expect(detail.violations).toEqual([]);
  await page.getByRole("button", { name: "Retour au catalogue" }).click();

  expect(page.url()).toContain("search=squat");
  expect(page.url()).toContain("category_ids=");
  await expect(page.getByRole("searchbox")).toHaveValue("squat");
  await expect(page.getByText(/pour « squat » · Jambes/)).toBeVisible();
  await expect(
    exerciseCards(page).first().locator("span.truncate").first(),
  ).toHaveText(firstName ?? "");

  // No result
  await page.getByRole("searchbox").fill("squaat");
  await expect(
    page.getByText("Aucun exercice trouvé pour « squaat »"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();
});
