import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { formatLongDate, todayInParis } from "shared";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("a new user opens the session editor and is asked before leaving a draft", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouvelle séance",
  );
  await expect(page.getByText("0 bloc")).toBeVisible();
  await expectNoA11yViolation(page);

  // Nothing changed: back goes home at once.
  await page.getByRole("button", { name: "Retour" }).click();
  await expectHomePage(page);

  // A changed draft asks first.
  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page.getByText("Quitter sans enregistrer ?")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Continuer la séance" }).click();
  await expect(page.getByLabel(/^Nom de la séance/)).toHaveValue(
    "Haut du corps",
  );

  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Quitter" }).click();
  await expectHomePage(page);
});

test("adds a block through the type panel, names it, removes it and undoes", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  // The type panel: 8 types, 3 of them "Bientôt"
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await expect(page.getByText("Type de bloc")).toBeVisible();
  await expect(page.getByRole("button", { name: /^AMRAP/ })).toBeDisabled();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: /^Classique/ }).click();

  // The block screen
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classique");
  await expect(page.getByText("Bloc 1 · Haut du corps")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByLabel(/^Intitulé/).fill("Force");
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  // Back on the session: the card, then remove and undo
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText("Classique · Force")).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer le bloc Classique · Force" })
    .click();
  await expect(page.getByText("0 bloc")).toBeVisible();
  await expect(page.getByText("Bloc retiré")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("Classique · Force")).toBeVisible();
  await expect(page.getByText("1 bloc")).toBeVisible();
});

test("picks three exercises from the catalog for a block, in the touched order", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();

  // The catalog in selection mode for the block
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await expect(page.getByText("Sélection pour le bloc 1")).toBeVisible();
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  const names = [
    await cards.nth(2).locator("span.truncate").first().textContent(),
    await cards.nth(0).locator("span.truncate").first().textContent(),
    await cards.nth(1).locator("span.truncate").first().textContent(),
  ].map((name) => (name ?? "").replace(/, (non )?sélectionné.*$/, ""));
  await cards.nth(2).click();
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(2)).toContainText("1 sur 3");
  await expectNoA11yViolation(page);

  // A detour through a detail keeps the selection
  await page.getByRole("link", { name: `Fiche de ${names[0]}` }).click();
  await expect(
    page.getByRole("button", { name: "Déjà dans la sélection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour à la sélection" }).click();
  await expect(cards.nth(2)).toContainText("1 sur 3");

  await page
    .getByRole("button", { name: "Ajouter au bloc, 3 sélectionnés" })
    .click();

  // Back in the block (A6), same order, one pre-filled set each
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classique");
  await expect(page.getByText("3 exercices")).toBeVisible();
  const rows = page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(3);
  for (const [index, name] of names.entries()) {
    await expect(rows.nth(index)).toContainText(name);
    await expect(rows.nth(index)).toContainText(/^.*1 (série|étape)/);
  }
  await expectNoA11yViolation(page);

  // Back to the session: the warning is gone
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText(/n'a pas encore d'exercice/)).toHaveCount(0);
});

test("starts a session from the catalog with « Sélectionner » and « Ajouter à une séance »", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/catalogue");
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();

  await page.getByRole("button", { name: "Sélectionner" }).click();
  await expect(page.getByText("0 sélectionné")).toBeVisible();
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByText("2 sélectionnés")).toBeVisible();
  await expectNoA11yViolation(page);

  await page
    .getByRole("button", { name: "Ajouter à une séance, 2 sélectionnés" })
    .click();
  await expect(page.getByText("Ajouter 2 exercices")).toBeVisible();
  await expect(page.getByText("Nouvelle séance libre")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Continuer vers l'éditeur" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouvelle séance",
  );
  await expect(page.getByText("1 bloc")).toBeVisible();
  await expect(page.getByText("Classique · Bloc 1")).toBeVisible();
  await expect(page.getByText(/n'a pas encore d'exercice/)).toHaveCount(0);
});

// Picks one exercise by name in the catalog selection (search, first card).
async function pickFromCatalog(page: Page, name: string) {
  const search = page.getByRole("searchbox");
  await search.fill(name);
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await expect(cards.first()).toContainText(name);
  await cards.first().click();
  await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
}

test("configures the planned sets of one exercise of each profile", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Full body");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await expect(page.getByText("Sélection pour le bloc 1")).toBeVisible();

  await pickFromCatalog(page, "Développé poitrine à la machine");
  await pickFromCatalog(page, "Anges au mur");
  await pickFromCatalog(page, "Gainage (planche)");
  await pickFromCatalog(page, "Tapis de course");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 4 sélectionnés" })
    .click();
  await expect(page.getByText("4 exercices")).toBeVisible();

  // A7a: reps + weight
  await page
    .getByRole("button", { name: /^Développé poitrine à la machine/ })
    .click();
  await expect(page.getByText("Répétitions · Charge")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Répétitions" })).toHaveValue(
    "10",
  );
  await page.getByRole("textbox", { name: "Charge (kg)" }).fill("40");
  await page.getByRole("button", { name: "Dupliquer la dernière" }).click();
  await expect(page.getByText("Série 2")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Développé poitrine à la machine/ }),
  ).toContainText("2 séries · 10 rép. · 40 kg");

  // A7b: bodyweight with an added weight
  await page.getByRole("button", { name: /^Anges au mur/ }).click();
  await expect(page.getByText("Répétitions · Lest")).toBeVisible();
  await page.getByRole("switch", { name: "Ajouter un lest" }).click();
  await page.getByRole("textbox", { name: "Lest (kg)" }).fill("5");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Anges au mur/ }),
  ).toContainText("1 série · 10 rép. · 5 kg lest");

  // A7c: duration
  await page.getByRole("button", { name: /^Gainage \(planche\)/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Durée (min:s)" }),
  ).toHaveValue("1:00");
  await page.getByRole("button", { name: "Augmenter Durée (min:s)" }).click();
  await expect(
    page.getByRole("textbox", { name: "Durée (min:s)" }),
  ).toHaveValue("1:15");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Gainage \(planche\)/ }),
  ).toContainText("1 série · 1 min 15");

  // A7d: cardio stages, with a value out of range first
  await page.getByRole("button", { name: /^Tapis de course/ }).click();
  await expect(page.getByText("Étape 1")).toBeVisible();
  await page.getByRole("textbox", { name: "Vitesse (km/h)" }).fill("80");
  await expect(page.getByText(/Entre un nombre entre 0 et 60\./)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider l'exercice" }),
  ).toBeDisabled();
  await page.getByRole("textbox", { name: "Vitesse (km/h)" }).fill("9");
  await page.getByRole("button", { name: "+ Étape" }).click();
  await expect(page.getByText("Étape 2")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(
    page.getByRole("button", { name: /^Tapis de course/ }),
  ).toContainText("2 étapes");
});

test("plans a free session from the home page and finds it there (A1 to A9)", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // The main action of the home opens the editor on today (écran 03)
  await expectNoA11yViolation(page);
  await page.getByRole("link", { name: "Créer ma première séance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouvelle séance",
  );
  await expect(page.getByRole("button", { name: /^Date/ })).toContainText(
    formatLongDate(todayInParis()),
  );

  // The date picker opens and keeps today
  await page.getByRole("button", { name: /^Date/ }).click();
  await expect(page.getByText("Date de la séance")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Aujourd'hui", exact: true }).click();
  await page.getByRole("button", { name: "Valider la date" }).click();

  // Name, one block, one exercise
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await pickFromCatalog(page, "Développé poitrine à la machine");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 1 sélectionné" })
    .click();
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  // Save: A9
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Séance enregistrée" }),
  ).toBeVisible();
  await expect(page.getByText("Haut du corps")).toBeVisible();
  await expect(
    page.getByText("1 bloc · 1 exercice · Séance libre"),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    `Séance enregistrée le ${formatLongDate(todayInParis()).charAt(0).toLowerCase()}${formatLongDate(todayInParis()).slice(1)}.`,
  );
  await expectNoA11yViolation(page);

  // Back home: the session of the day is there
  await page.getByRole("link", { name: "Retour à l'accueil" }).click();
  await expectHomePage(page);
  // Screen 03-2: the card of the day takes the place of the empty state
  await expect(page.getByText("Haut du corps")).toBeVisible();
  await expect(page.getByText("Aucune séance prévue")).toHaveCount(0);
});

test("a body weight exercise follows the lest layout (A7b)", async ({
  page,
}) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Dos");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  // Tractions is done with the body weight, yet it measures reps and weight
  await pickFromCatalog(page, "Tractions");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 1 sélectionné" })
    .click();

  await page.getByRole("button", { name: /^Tractions/ }).click();

  await expect(page.getByText("Répétitions · Lest")).toBeVisible();
  const toggle = page.getByRole("switch", { name: "Ajouter un lest" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("textbox", { name: /^Charge/ })).toHaveCount(0);

  await toggle.click();
  await page.getByRole("textbox", { name: "Lest (kg)" }).fill("10");
  await page.getByRole("button", { name: "Valider l'exercice" }).click();

  await expect(page.getByRole("button", { name: /^Tractions/ })).toContainText(
    "1 série · 10 rép. · 10 kg lest",
  );
});
