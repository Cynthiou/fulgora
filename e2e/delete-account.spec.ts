import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import {
  E2E_ORIGIN,
  E2E_PASSWORD,
  expectHomePage,
  shoot,
  signUp,
} from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session planned today, so the account owns real data before it goes.
async function planSessionToday(page: Page) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Séance à effacer",
      planned_date: todayInParis(),
      planned_time: null,
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: [
            {
              exercise_id: first.id,
              default_rest_seconds: 90,
              sets: [{ ...createEmptySet(), reps: 10 }],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

// US-06: PRF-07, PRF-08, PRF-08e and PRF-08s, then the account is gone.
test("deletes the account for good", async ({ page }) => {
  test.slow();
  const username = await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page);

  // PRF-06 leads to the deletion
  await page.goto("/profil/compte");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();

  // PRF-07: what disappears, and nothing is done yet
  await expect(
    page.getByRole("heading", { level: 2, name: "Supprimer ton compte ?" }),
  ).toBeVisible();
  await expect(page.getByText("tes exercices personnels")).toBeVisible();
  await expect(
    page.getByText("Cette action ne peut pas être annulée."),
  ).toBeVisible();
  await shoot(page, "prf-07-supprimer-le-compte");
  await expectNoA11yViolation(page);

  // "Annuler" goes back to the settings, the account is still there
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Paramètres du compte",
  );

  // PRF-08: the password is asked again
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Confirme la suppression" }),
  ).toBeVisible();
  await expect(page.getByText(username)).toBeVisible();
  const remove = page.getByRole("button", { name: "Supprimer définitivement" });
  await expect(remove).toBeDisabled();
  await shoot(page, "prf-08-confirmer-la-suppression");
  await expectNoA11yViolation(page);

  // PRF-08e: a wrong password deletes nothing
  await page.getByLabel("Mot de passe", { exact: true }).fill("pas-le-bon-1");
  await remove.click();
  await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
  await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveValue(
    "",
  );
  await shoot(page, "prf-08e-suppression-echec");
  await expectNoA11yViolation(page);

  // PRF-08s: the real deletion
  await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
  await remove.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Compte supprimé",
  );
  await expect(page.getByText("Tes données ont été effacées.")).toBeVisible();
  await shoot(page, "prf-08s-compte-supprime");
  await expectNoA11yViolation(page);

  // Going back shows nothing of the account any more
  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: "Se connecter" }),
  ).toBeVisible();

  // The account cannot be used again
  await page.goto("/connexion");
  await page.getByLabel(/^Pseudo ou adresse e-mail/).fill(username);
  await page.getByLabel(/^Mot de passe/).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(/Identifiants incorrects/)).toBeVisible();
});
