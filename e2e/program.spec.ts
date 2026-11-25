import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, getWeekday, todayInParis } from "shared";
import { expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// US-18: a program draws a typical week and fills the Planning over its
// whole period (RM-071, RM-072, RM-075).
test("creates a program, fills its sessions and plans the whole period", async ({
  page,
}) => {
  const today = todayInParis();
  // A week starting tomorrow, so the first session is in the future
  const start = addDays(today, 1);
  const end = addDays(today, 7);
  const weekday = getWeekday(start);

  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // The "+" of the Planning offers the program (CAL-01b)
  await page.getByRole("link", { name: "Planning", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter une séance" }).click();
  await page.getByRole("link", { name: /^Programme/ }).click();

  // PRO-02: step 1
  await expect(
    page.getByText("Étape 1 / 3 · Informations et jours"),
  ).toBeVisible();
  await page.getByLabel(/^Nom du programme/).fill("Hypertrophie");
  await page.getByLabel(/^Début/).fill(start);
  await page.getByLabel(/^Fin/).fill(end);
  await page
    .getByRole("button", { name: new RegExp(`^${weekdayName(weekday)}$`) })
    .click();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Suivant" }).click();

  // PRO-03v: one session per chosen day, none ready yet
  await expect(page.getByText("Étape 2 / 3 · Séances")).toBeVisible();
  await expect(page.getByText("0 / 1 séance prête")).toBeVisible();
  // A session without exercise says "À configurer" (PRO-03).
  await expect(page.getByText("À configurer").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Créer le programme" }),
  ).toBeDisabled();
  await expectNoA11yViolation(page);

  // The session of the day, built with the editor of the free sessions
  await page.getByRole("link", { name: /Séance du/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier la séance",
  );
  await expect(page.getByText("Ce jour vient du programme.")).toBeVisible();
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: /^Ajouter au bloc/ }).click();
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await page.getByRole("button", { name: "Vérifier les changements" }).click();
  await page.getByRole("button", { name: "Valider" }).click();

  // PRO-03f: the session is ready, the program can be created
  await expect(page.getByText("1 / 1 séance prête")).toBeVisible();
  await page.getByRole("button", { name: "Créer le programme" }).click();

  // PRO-06: the Planning is filled
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Programme créé",
  );
  await expect(page.getByText(/séances ajoutées au Planning/)).toBeVisible();
  await expectNoA11yViolation(page);

  // The session is really in the Planning, on its day
  await page.goto(`/planning?vue=jour&jour=${start}`);
  await expect(page.getByRole("link", { name: /Haut du corps/ })).toBeVisible();

  // PRO-01 then PRO-07c: the list, its filters, and the detail of a
  // program still to come (US-48)
  await page.goto("/programmes");
  await expect(page.getByRole("link", { name: /Hypertrophie/ })).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("tab", { name: "Terminés" }).click();
  await expect(page.getByText("Aucun programme dans cet état")).toBeVisible();
  await page.getByRole("tab", { name: "À venir" }).click();

  await page.getByRole("link", { name: /Hypertrophie/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hypertrophie",
  );
  await expect(page.getByText("À venir").first()).toBeVisible();
  await expect(page.getByText(/^Commence/)).toBeVisible();
  await expect(page.getByText(/Première séance/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Semaines" })).toBeVisible();
  await shoot(page, "pro-07c-programme-a-venir");
  await expectNoA11yViolation(page);

  // The ⋯ menu only announces what is not built yet (PRO-07b)
  await page.getByRole("button", { name: "Actions du programme" }).click();
  await expect(page.getByText("Modifier le programme")).toBeVisible();
  await shoot(page, "pro-07b-actions-du-programme");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Fermer" }).click();
});

// US-48: a program of somebody else is never shown.
test("a program that is not yours says it does not exist", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await page.goto("/programmes/999999");
  await expect(page.getByText("Programme introuvable")).toBeVisible();
  await page.getByRole("link", { name: "Voir mes programmes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mes programmes",
  );
});

// The button of a day is named by its full name (the three letters are
// hidden from the screen reader).
function weekdayName(weekday: number): string {
  return (
    ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][
      weekday - 1
    ] ?? ""
  );
}
