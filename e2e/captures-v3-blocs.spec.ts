import { expect, type Page, test } from "@playwright/test";
import { addDays, getWeekday, todayInParis } from "shared";
import { CAPTURE, signUp } from "./helpers";

// Screenshots of the screens of the handoff des blocs, at the size of its
// device (330 x 720), dark then light. Not part of the normal suite: run it
// on purpose with
//   CAPTURE=1 npx playwright test e2e/captures-v3-blocs.spec.ts --project=mobile
// The files land in design/captures-v3/blocs/, which Cynthia puts next to
// design/handoff-blocs/.
test.use({ viewport: { width: 330, height: 720 } });
test.skip(!CAPTURE, "Captures are taken on demand (CAPTURE=1).");

const DIRECTORY = "design/captures-v3/blocs";

// One screen in the two themes. The capture is the viewport alone, never
// the whole page: the handoff draws a phone of 330 x 720.
async function shootBlocks(page: Page, name: string) {
  for (const [theme, suffix] of [
    ["fulgora-dark", "sombre"],
    ["fulgora-light", "clair"],
  ] as const) {
    await page.evaluate((value) => {
      document.documentElement.setAttribute("data-theme", value);
    }, theme);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${DIRECTORY}/${name}-${suffix}.png` });
  }
}

const WEEKDAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

test("captures the screens of the blocks (handoff v3)", async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  // 2.1 the "Type de bloc" panel, over the session
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await expect(page.getByText("Type de bloc")).toBeVisible();
  await shootBlocks(page, "2-1-type-de-bloc");

  // 2.2 the empty block
  await page.getByRole("button", { name: /^Classique/ }).click();
  await expect(page.getByText(/Choisis-les dans le catalogue/)).toBeVisible();
  await shootBlocks(page, "2-2-bloc-vide");

  // 2.3 the catalog in selection, with nothing picked then one picked
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await expect(page.getByText("Sélection multiple")).toBeVisible();
  await shootBlocks(page, "2-3-catalogue-sans-selection");
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await cards.nth(0).click();
  await expect(page.getByText("1 sélectionné")).toBeVisible();
  await shootBlocks(page, "2-3-catalogue-un-selectionne");

  // Four exercises, as the handoff draws the filled block
  await cards.nth(1).click();
  await cards.nth(2).click();
  await cards.nth(3).click();
  await page.getByRole("button", { name: /^Ajouter au bloc/ }).click();

  // 3.2 the block with its exercises
  await expect(page.getByText("4 exercices")).toBeVisible();
  await shootBlocks(page, "3-2-bloc-avec-exercices");

  // 3.1 the free session with its block, its menu and its toast
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await expect(page.getByText("1 bloc")).toBeVisible();
  await shootBlocks(page, "3-1-seance-libre-avec-bloc");

  await page.getByRole("button", { name: /^Actions du bloc/ }).click();
  await expect(
    page.getByRole("button", { name: "Modifier le bloc" }),
  ).toBeVisible();
  await shootBlocks(page, "3-1-menu-du-bloc");

  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText("Bloc supprimé")).toBeVisible();
  await shootBlocks(page, "3-1-toast-bloc-supprime");
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("1 bloc")).toBeVisible();
});

test("captures the session of a day of a program (handoff 3.1)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const start = addDays(todayInParis(), 1);
  const dayName = WEEKDAY_NAMES[getWeekday(start)] ?? "Lundi";

  await signUp(page);
  await page.goto(`/programmes/nouveau?date=${start}`);
  await page.getByLabel(/^Nom du programme/).fill("Hypertrophie");
  await page.getByRole("button", { name: new RegExp(`^${dayName}$`) }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${dayName} : Séance vide`) })
    .click();

  await page.getByLabel(/^Nom de la séance/).fill("Bras");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Classique/ }).click();
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.getByRole("button", { name: /^Ajouter au bloc/ }).click();
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  await expect(page.getByText("1 bloc")).toBeVisible();
  await shootBlocks(page, "3-1-seance-de-programme-avec-bloc");
});
