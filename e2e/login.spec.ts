import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { logIn, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("logs in with the username and stays connected after a reload", async ({
  page,
}) => {
  // A real account, then its session cookie is dropped.
  const username = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/connexion");
  await expectNoA11yViolation(page);
  await logIn(page, username);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Ton carnet d'entraînement",
  );

  // The cookie survives a reload: the server still knows who this is.
  await page.reload();
  const me = await page.request.get("/api/auth/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).username).toBe(username);

  // Already connected: the login page sends straight back home.
  await page.goto("/connexion");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Ton carnet d'entraînement",
  );
});

test("wrong credentials give one single message and keep the identifier", async ({
  page,
}) => {
  await page.goto("/connexion");
  await page.getByLabel(/^Pseudo ou adresse e-mail/).fill("nobody_at_all");
  await page.getByLabel(/^Mot de passe/).fill("wrong-2026");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Identifiants incorrects. Vérifie ta saisie et réessaie.",
  );
  await expect(page.getByLabel(/^Pseudo ou adresse e-mail/)).toHaveValue(
    "nobody_at_all",
  );
  await expect(page.getByLabel(/^Mot de passe/)).toHaveValue("");
  await expect(page.getByLabel(/^Mot de passe/)).toBeFocused();
  await expectNoA11yViolation(page);
});
