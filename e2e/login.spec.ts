import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

function uniqueStamp() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Creates an account through the signup page, then drops its session cookie,
// so the login page can be tested with a real account.
async function createAccount(page: Page) {
  const stamp = uniqueStamp();
  const username = `e2e_${stamp}`;
  await page.goto("/inscription");
  await page.getByLabel(/^Pseudo/).fill(username);
  await page.getByLabel(/^Adresse e-mail/).fill(`${username}@exemple.fr`);
  await page.getByLabel(/^Mot de passe/).fill("secret-2026");
  await page.getByLabel(/J'accepte/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(
    page.getByRole("heading", { name: "Compte créé" }),
  ).toBeVisible();
  await page.context().clearCookies();
  return username;
}

test("logs in with the username and stays connected after a reload", async ({
  page,
}) => {
  const username = await createAccount(page);

  await page.goto("/connexion");
  await expectNoA11yViolation(page);
  await page.getByLabel(/^Pseudo ou adresse e-mail/).fill(username);
  await page.getByLabel(/^Mot de passe/).fill("secret-2026");
  await page.getByRole("button", { name: "Se connecter" }).click();

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
