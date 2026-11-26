import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today with one block and two exercises (US-23), and
// gives back their names in the planned order.
async function planSessionToday(page: Page): Promise<string[]> {
  const exercises = await page.request.get("/api/exercises");
  const [first, second] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Haut du corps",
      planned_date: todayInParis(),
      planned_time: "07:00",
      blocks: [
        {
          block_type: "classic",
          name: "Force",
          instructions: null,
          exercises: [first, second].map((exercise) => ({
            exercise_id: exercise.id,
            default_rest_seconds: 90,
            sets: [{ ...createEmptySet(), reps: 10 }],
          })),
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return [first.name, second.name];
}

// US-16: the handle moves an exercise with the keyboard alone, the order
// that shows is the order that is saved.
test("moves an exercise with the keyboard and saves the new order", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const [first, second] = await planSessionToday(page);
  await page.reload();

  // The editor of the planned session (B1, then CAL-04m)
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  const url = page.url();
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Modifier la séance/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier la séance",
  );

  // The block (A6) and its two exercises, in the planned order
  await page.getByRole("button", { name: "Ouvrir le bloc Classique" }).click();
  const rows = page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("listitem");
  await expect(rows.nth(0)).toContainText(first);
  await expect(rows.nth(1)).toContainText(second);

  // Space takes the handle, the arrow moves, Space drops
  await page.getByRole("button", { name: `Déplacer ${first}` }).focus();
  await page.keyboard.press("Space");
  const liveRegion = page.locator('[id^="DndLiveRegion"]');
  // The list measures its rows just after the handle is taken, so the first
  // arrow can land too early: it is pressed again until the move is said.
  await expect(async () => {
    await page.keyboard.press("ArrowDown");
    await expect(liveRegion).toContainText(
      `${first} déplacé en position 2 sur 2.`,
      { timeout: 1_000 },
    );
  }).toPass();
  await page.keyboard.press("Space");

  await expect(rows.nth(0)).toContainText(second);
  await expect(rows.nth(1)).toContainText(first);
  await expectNoA11yViolation(page);

  // The saved session keeps that order
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await page.getByRole("button", { name: "Vérifier les changements" }).click();
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByText("Séance modifiée.")).toBeVisible();

  await page.goto(`${url}/modifier`);
  await page.getByRole("button", { name: "Ouvrir le bloc Classique" }).click();
  await expect(rows.nth(0)).toContainText(second);
  await expect(rows.nth(1)).toContainText(first);
});

// US-16: the "⋯" menu does the same move without dragging anything.
test("moves a block with « Monter » of the ⋯ menu", async ({ page }) => {
  await signUp(page);
  await page.goto("/seances/nouvelle");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");

  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Échauffement/ }).click();
  await page.getByLabel(/^Intitulé/).fill("Mise en route");
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Étirements/ }).click();
  await page.getByLabel(/^Intitulé/).fill("Consignes");
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  const blocks = page
    .getByRole("list", { name: "Blocs de la séance" })
    .getByRole("listitem");
  await expect(blocks.nth(0)).toContainText("Mise en route");
  await expect(blocks.nth(1)).toContainText("Consignes");

  await page
    .getByRole("button", { name: "Options du bloc Étirements · Consignes" })
    .click();
  await expect(page.getByRole("button", { name: "Descendre" })).toBeDisabled();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Monter" }).click();

  await expect(blocks.nth(0)).toContainText("Consignes");
  await expect(blocks.nth(1)).toContainText("Mise en route");
});
