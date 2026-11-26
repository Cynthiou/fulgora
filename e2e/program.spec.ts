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
  const weekday = getWeekday(start);

  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // The "+" of the Planning offers the program (CAL-01b)
  await page.getByRole("link", { name: "Planning", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter une séance" }).click();
  await page.getByRole("link", { name: /^Programme/ }).click();

  // The program form (handoff v3): name, period, days and sessions on one
  // screen. The period starts tomorrow.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouveau programme",
  );
  await page.goto(`/programmes/nouveau?date=${start}`);
  await expect(page.getByText("0 par semaine")).toBeVisible();
  await page.getByLabel(/^Nom du programme/).fill("Hypertrophie");
  await page
    .getByRole("button", { name: new RegExp(`^${weekdayName(weekday)}$`) })
    .click();
  // One session per chosen day, none ready yet
  await expect(page.getByText("0 / 1 prêtes")).toBeVisible();
  await expect(page.getByText("Séance vide")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enregistrer le brouillon" }),
  ).toBeVisible();
  await expectNoA11yViolation(page);

  // The session of the day: the draft is saved, then the editor opens
  await page
    .getByRole("button", {
      name: new RegExp(`^${weekdayName(weekday)} : Séance vide`),
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${weekdayName(weekday)} · séance`,
  );
  await expect(page.getByText("chaque sem.")).toBeVisible();
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
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await page.getByRole("button", { name: "Valider" }).click();

  // Back on the program: the session is ready, the program can be created
  await expect(page.getByText("1 / 1 prêtes")).toBeVisible();
  await expect(page.getByText("Séance prête")).toBeVisible();
  await page.getByRole("button", { name: "Créer le programme" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hypertrophie",
  );

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

// US-19: a day can hold several sessions; removing one can be undone.
test("adds a second session on the same day, removes it and undoes", async ({
  page,
}) => {
  const today = todayInParis();
  const start = addDays(today, 1);
  const weekday = getWeekday(start);

  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await page.goto(`/programmes/nouveau?date=${start}`);
  await page.getByLabel(/^Nom du programme/).fill("Deux fois le même jour");
  await page
    .getByRole("button", { name: new RegExp(`^${weekdayName(weekday)}$`) })
    .click();
  // A tap on the session saves the draft; the list of its sessions (with
  // "Autre séance" and "Retirer") stays at /programmes/:id/seances.
  await page
    .getByRole("button", {
      name: new RegExp(`^${weekdayName(weekday)} : Séance vide`),
    })
    .click();
  await expect(page).toHaveURL(/\/programmes\/\d+\/seances\/\d+$/);
  const programId = /\/programmes\/(\d+)\//.exec(page.url())?.[1];
  await page.goto(`/programmes/${programId}/seances`);
  await expect(page.getByText("Étape 2 / 3 · Séances")).toBeVisible();

  // PRO-03a: the panel says what the day will hold and what it adds
  const dayName = weekdayName(weekday).toLocaleLowerCase("fr-FR");
  await page
    .getByRole("button", { name: `Autre séance le ${dayName}` })
    .click();
  await expect(page.getByText(/aura 2 séances/)).toBeVisible();
  await expect(page.getByText(/le total passe de \d+ à \d+/)).toBeVisible();
  await shoot(page, "pro-03a-autre-seance");
  await expectNoA11yViolation(page);
  await page.getByLabel(/^Nom de la séance/).fill("Gainage");
  await page.getByLabel(/^Heure/).fill("20:00");
  await page.getByRole("button", { name: "Ajouter la séance" }).click();

  await expect(page.getByText("Gainage")).toBeVisible();
  await expect(page.getByText("0 / 2 séances prêtes")).toBeVisible();

  // PRO-03b: unchecking a day says what it would remove
  await page.getByRole("link", { name: "Modifier les informations" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouveau programme",
  );
  await page
    .getByRole("button", { name: new RegExp(`^${weekdayName(weekday)}$`) })
    .click();
  await expect(
    page.getByText(/décoché : 2 séances seront retirées/),
  ).toBeVisible();
  await shoot(page, "pro-03b-retirer-un-jour");
  await expectNoA11yViolation(page);
  // Nothing is saved: the day comes back and the sessions are still there
  await page
    .getByRole("button", { name: new RegExp(`^${weekdayName(weekday)}$`) })
    .click();
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/\/programmes$/);
  await page.goto(`/programmes/${programId}/seances`);
  await expect(page.getByText("Étape 2 / 3 · Séances")).toBeVisible();
  await expect(page.getByText("Gainage")).toBeVisible();

  // PRO-03c then PRO-03d: the removal, then "Annuler"
  await page.getByRole("button", { name: "Retirer la séance Gainage" }).click();
  await expect(page.getByText("Séance « Gainage » retirée.")).toBeVisible();
  await shoot(page, "pro-03d-seance-retiree");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("Gainage")).toBeVisible();
  await expect(page.getByText("0 / 2 séances prêtes")).toBeVisible();
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
