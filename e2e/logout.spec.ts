import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { logIn, signUp } from "./helpers";

test("logs out from the profile and cannot come back with the back button", async ({
  page,
}) => {
  await signUp(page);

  await page.goto("/profil");
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("button", { name: "Se déconnecter" }).click();

  await expect(
    page.getByRole("heading", { name: "Se connecter" }),
  ).toBeVisible();
  expect(page.url()).toContain("/connexion");
  const me = await page.request.get("/api/auth/me");
  expect(me.status()).toBe(401);

  // The private page was replaced in the history: back does not show it.
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Mon profil" })).toHaveCount(
    0,
  );
});

test("a private page asks to log in, then comes back to it", async ({
  page,
}) => {
  const username = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/profil");
  await expect(
    page.getByRole("heading", { name: "Se connecter" }),
  ).toBeVisible();

  await logIn(page, username);

  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();
  expect(page.url()).toContain("/profil");
});
