import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// One exercise of the catalog, chosen for the open block (A5).
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

// US-43: a Circuit, an AMRAP and a For Time block, with their settings.
test("adds a circuit and an AMRAP to a session", async ({ page }) => {
  test.slow();
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Cardio du jeudi");

  // A3: the timed types can be chosen
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await expect(page.getByRole("button", { name: /^Circuit/ })).toBeEnabled();
  await page.getByRole("button", { name: /^Circuit/ }).click();

  // C4: the circuit asks for its rounds before anything else
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Circuit");
  await expect(
    page.getByRole("heading", { name: "Réglages du bloc" }),
  ).toBeVisible();
  const save = page.getByRole("button", { name: "Enregistrer le bloc" });
  // An empty block says what is missing; its orange button opens the
  // catalog, so there is nothing to save yet (handoff 2.2)
  await expect(page.getByText("Règle le nombre de tours.")).toBeVisible();
  await expect(save).toHaveCount(0);
  await page.getByRole("textbox", { name: "Nombre de tours" }).fill("3");
  await expect(page.getByText("Règle le nombre de tours.")).toHaveCount(0);

  // Two exercises, with no objective yet
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await pickFromCatalog(page, "Tapis de course");
  await pickFromCatalog(page, "Rameur");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 2 sélectionnés" })
    .click();
  // Each exercise arrives with its default objective, kept for every round
  await expect(page.getByText("10 min")).toHaveCount(2);
  await expect(save).toBeEnabled();

  // One objective per round: no way to add a second set
  await page.getByRole("button", { name: /^Tapis de course/ }).click();
  await expect(
    page.getByRole("button", { name: "Ajouter une étape" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Un seul objectif, répété à chaque tour/),
  ).toBeVisible();

  // Emptied, the exercise is called out and the block cannot be saved (C4)
  await page.getByRole("textbox", { name: /^Durée/ }).fill("");
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await expect(page.getByText("objectif à régler")).toHaveCount(1);
  await expect(save).toBeDisabled();
  await expect(page.getByText("Un objectif est à régler.")).toBeVisible();
  await shoot(page, "c4-bloc-circuit");
  await expectNoA11yViolation(page);

  // Leaving the block is still possible: the session says what is missing
  await page.getByRole("button", { name: "Retour à la séance" }).click();
  await expect(
    page.getByRole("button", { name: /^Circuit · Bloc 1/ }),
  ).toHaveAccessibleName(/Un objectif est à régler\./);
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(
    page.getByText(/Circuit · Bloc 1 : un objectif est à régler\./),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Actions du bloc Circuit/ }).click();
  await page.getByRole("button", { name: "Modifier le bloc" }).click();

  // The objective comes back: a distance per round
  await page.getByRole("button", { name: /^Tapis de course/ }).click();
  await page.getByRole("textbox", { name: "Distance (km)" }).fill("0,4");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Valider l'exercice" }).click();

  // Everything is set: the block can be saved, and its card sums it up
  await expect(page.getByText("objectif à régler")).toHaveCount(0);
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByRole("button", { name: /^Circuit · Bloc 1/ }),
  ).toContainText("Bloc 1 · 3 tours · 2 exercices");

  // An AMRAP of 12 minutes, with no exercise yet
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^AMRAP/ }).click();
  await expect(page.getByText("Règle la durée de l'AMRAP.")).toBeVisible();
  await page.getByRole("textbox", { name: /^Durée/ }).fill("12:00");
  await expect(page.getByText("Règle la durée de l'AMRAP.")).toHaveCount(0);
  await page.getByRole("button", { name: "Retour à la séance" }).click();
  // The card of the block says its duration (US-43)
  await expect(
    page.getByRole("button", { name: /^AMRAP · Bloc 2/ }),
  ).toContainText("Bloc 2 · 12 min · 0 exercice");

  // The session is saved with its two timed blocks
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Séance enregistrée" }),
  ).toBeVisible();
  await expect(
    page.getByText("2 blocs · 2 exercices · Séance libre"),
  ).toBeVisible();

  // B1: the session shows its circuit, saved with its rounds
  await page.getByRole("link", { name: "Voir le planning" }).click();
  await page
    .getByRole("link", { name: /Cardio du jeudi/ })
    .first()
    .click();
  await expect(page.getByText("Circuit · Bloc 1")).toBeVisible();
});
