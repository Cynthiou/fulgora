import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Witness test. US-02 will point it to the login page once it exists.
test("the home page is displayed", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Ton carnet d'entraînement",
  );
});

test("the home page has no accessibility violation", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
