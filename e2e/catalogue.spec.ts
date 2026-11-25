import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

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

  const cards = page.getByRole("list").first().getByRole("link");
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
