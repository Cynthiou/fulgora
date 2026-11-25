import { expect, type Page } from "@playwright/test";
import { formatLongDate, todayInParis } from "shared";

export const E2E_PASSWORD = "secret-2026";

function uniqueStamp() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Creates a fresh account through the signup page. The browser is then
// connected (the session cookie is set). Returns the username.
export async function signUp(page: Page): Promise<string> {
  const username = `e2e_${uniqueStamp()}`;
  await page.goto("/inscription");
  await page.getByLabel(/^Pseudo/).fill(username);
  await page.getByLabel(/^Adresse e-mail/).fill(`${username}@exemple.fr`);
  await page.getByLabel(/^Mot de passe/).fill(E2E_PASSWORD);
  await page.getByLabel(/J'accepte/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(
    page.getByRole("heading", { name: "Compte créé" }),
  ).toBeVisible();
  return username;
}

// Fills and sends the login form.
export async function logIn(page: Page, username: string) {
  await page.getByLabel(/^Pseudo ou adresse e-mail/).fill(username);
  await page.getByLabel(/^Mot de passe/).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

// The home page shows today's date as its title.
export async function expectHomePage(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    formatLongDate(todayInParis()),
  );
}
