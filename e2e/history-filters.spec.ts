import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function planSessionOn(page: Page, name: string, date: string) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: date,
      planned_time: "12:00",
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
  return (await response.json()).appointment_id as number;
}

// US-52: the history is filtered by status, and the filters live in the
// address, so the back button undoes them.
test("filters the history by status, and comes back", async ({ page }) => {
  // A long walk: sign-up, two sessions, three screens and two axe runs.
  test.slow();
  const twoDaysAgo = addDays(todayInParis(), -2);
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // Two past sessions: one missed, one still waiting for an answer. Both
  // are put in that state through a move to their own past day (US-25).
  const missedId = await planSessionOn(page, "Course", twoDaysAgo);
  const waitingId = await planSessionOn(
    page,
    "Réveil musculaire",
    addDays(todayInParis(), -1),
  );
  for (const id of [waitingId, missedId]) {
    await page.goto(`/seances/${id}`);
    await page.getByRole("button", { name: "Actions de la séance" }).click();
    await page.getByRole("button", { name: /Déplacer/ }).click();
    await page.getByLabel(/^Heure/).fill("18:00");
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Tu as fait cette séance ?")).toBeVisible();
  }
  await page.getByRole("button", { name: "Pas faite" }).click();
  await expect(page.getByText(/Séance marquée comme manquée/)).toBeVisible();

  // SUI-05: both lines
  await page.goto("/suivi/historique");
  await expect(page.getByText("Réveil musculaire")).toBeVisible();
  await expect(page.getByText("Course")).toBeVisible();

  // SUI-05f: the panel, then "Manquées"
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page.getByRole("heading", { name: "Filtrer" })).toBeVisible();
  await shoot(page, "sui-05f-filtres-ouverts");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Manquées" }).click();
  await page.getByRole("button", { name: /^Voir \d+ séance/ }).click();

  // SUI-05g: only the missed session, and the chip says so
  await expect(page.getByText("Réveil musculaire")).toHaveCount(0);
  await expect(page.getByText("Course")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Filtres actifs" }),
  ).toContainText("Manquées");
  expect(page.url()).toContain("statuses=missed");
  await shoot(page, "sui-05g-filtres-appliques");

  // SUI-05v: a week without any missed session
  await page.getByRole("button", { name: "Filtrer" }).click();
  await page.getByRole("button", { name: "Semaine" }).click();
  await page.getByRole("button", { name: /^Voir \d+ séance/ }).click();
  await page.getByRole("button", { name: "Période précédente" }).click();
  await expect(page.getByText("Aucune séance pour ces filtres")).toBeVisible();
  await shoot(page, "sui-05v-filtres-sans-resultat");
  await expectNoA11yViolation(page);

  // "Effacer les filtres" gives the whole history back
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page.getByText("Réveil musculaire")).toBeVisible();
  await expect(page.getByText("Course")).toBeVisible();
});
