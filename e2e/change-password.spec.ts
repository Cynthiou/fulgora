import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD, expectHomePage, logIn, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

const NEW_PASSWORD = "nouveau-2027";

async function fill(
  page: Page,
  current: string,
  next: string,
  confirm: string,
) {
  await page.getByLabel("Mot de passe actuel", { exact: true }).fill(current);
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(next);
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill(confirm);
}

// US-47: PRF-06, its errors (PRF-06e) and its confirmation (PRF-06s).
test("changes the password, then logs in with the new one", async ({
  page,
}) => {
  test.slow();
  const username = await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // PRF-01 leads to the account
  await page.goto("/profil");
  await page.getByRole("button", { name: /Paramètres du compte/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Paramètres du compte",
  );
  await expect(page.getByText(username, { exact: true })).toBeVisible();
  await expect(page.getByText("Créé le")).toBeVisible();
  const button = page.getByRole("button", { name: "Changer le mot de passe" });
  await expect(button).toBeDisabled();
  await shoot(page, "prf-06-parametres-du-compte");
  await expectNoA11yViolation(page);

  // PRF-06e: a wrong current password, and the three fields are emptied
  await fill(page, "pas-le-bon-1", NEW_PASSWORD, NEW_PASSWORD);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText("Mot de passe actuel incorrect.")).toBeVisible();
  await expect(
    page.getByLabel("Mot de passe actuel", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Nouveau mot de passe", { exact: true }),
  ).toHaveValue("");
  await shoot(page, "prf-06e-mot-de-passe-erreurs");
  await expectNoA11yViolation(page);

  // The rules and the confirmation are checked before the server
  await fill(page, E2E_PASSWORD, "court", "court");
  await button.click();
  await expect(
    page.getByText("Ne respecte pas les règles de l'inscription."),
  ).toBeVisible();
  await fill(page, E2E_PASSWORD, NEW_PASSWORD, "nouveau-2028");
  await button.click();
  await expect(
    page.getByText("Les deux mots de passe ne correspondent pas."),
  ).toBeVisible();

  // PRF-06s: it works, and the session stays open
  await fill(page, E2E_PASSWORD, NEW_PASSWORD, NEW_PASSWORD);
  await button.click();
  await expect(
    page.getByText("Mot de passe changé. La session en cours reste ouverte."),
  ).toBeVisible();
  await shoot(page, "prf-06s-mot-de-passe-change");
  await expectNoA11yViolation(page);
  await page.goto("/");
  await expectHomePage(page);

  // The old password does not open the session any more, the new one does
  await page.goto("/profil");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Se connecter" }),
  ).toBeVisible();
  await logIn(page, username);
  await expect(page.getByText(/Identifiants incorrects/)).toBeVisible();

  await page.getByLabel(/^Mot de passe/).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // The session opens again, on the page the logout came from
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mon profil",
  );
});
