import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// US-46: the bell of the header leads to the notifications. A new account
// has none, so the list says what will land there (NOT-01b, NOT-02v).
// The notifications themselves are created by the scheduled task of US-27,
// which runs every five minutes: that part is covered by the server tests.
test("the bell leads to the notifications, empty for a new account", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  const bell = page.getByRole("link", { name: "Notifications" });
  await expect(bell).toBeVisible();
  await bell.click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Notifications",
  );
  await expect(page.getByText("Aucune notification")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tout marquer lu" }),
  ).toHaveCount(0);
  await expectNoA11yViolation(page);

  // Back where we came from
  await page.getByRole("button", { name: "Retour" }).click();
  await expectHomePage(page);
});
