import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("a new user lands on the home page and moves between the tabs with the keyboard", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();

  // Beginner home page
  await expectHomePage(page);
  await expect(page.getByText("Aucune séance prévue")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Créer ma première séance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Accueil", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expectNoA11yViolation(page);

  // Keyboard only: Tab moves along the tabs, Enter opens one.
  await page.getByRole("link", { name: "Accueil", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Planning", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Planning");
  await expect(
    page.getByRole("link", { name: "Planning", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Suivi", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suivi");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Catalogue", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catalogue");
  await expectNoA11yViolation(page);
});

test("the avatar opens the profile and the back arrow returns to the tab", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/planning");

  await page.getByRole("link", { name: /mon profil/i }).click();
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();

  await page.getByRole("link", { name: "Retour" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Planning");
});
