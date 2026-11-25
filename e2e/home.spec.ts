import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The home page is private: a visitor is sent to the login page.
test("a visitor opening the app sees the login page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Se connecter",
  );
});

test("an unknown address shows the not found page", async ({ page }) => {
  await page.goto("/nulle-part");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page introuvable",
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
