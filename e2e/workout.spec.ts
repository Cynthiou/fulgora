import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, as the editor would (US-23).
async function planSessionToday(page: Page, name: string, exerciseCount = 1) {
  const exercises = await page.request.get("/api/exercises");
  const items = (await exercises.json()).items.slice(0, exerciseCount);
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      name,
      planned_date: todayInParis(),
      planned_time: null,
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: items.map((item: { id: number }) => ({
            exercise_id: item.id,
            default_rest_seconds: 90,
            sets: [
              { ...createEmptySet(), reps: 10 },
              { ...createEmptySet(), reps: 10 },
            ],
          })),
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

test("starts the session of the day, survives a reload and resumes it from the home page", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Haut du corps");
  await page.reload();

  // B1
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Haut du corps" }),
  ).toBeVisible();
  await expect(page.getByText("Planifiée")).toBeVisible();
  await expect(page.getByText(/1 bloc · 1 exercice/)).toBeVisible();
  await expectNoA11yViolation(page);

  // Start: B2
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Haut du corps" }),
  ).toBeVisible();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();
  await expect(
    page.getByText(/^Durée de la séance ● \d+:\d{2}$/),
  ).toBeVisible();
  await expect(page.getByText("0 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText("0 / 2 séries")).toBeVisible();
  await expectNoA11yViolation(page);

  // The chrono keeps counting after a reload (computed from the start time)
  await page.waitForTimeout(2000);
  await page.reload();
  const chrono = page.getByText(/^Durée de la séance ● \d+:\d{2}$/);
  await expect(chrono).toBeVisible();
  const text = (await chrono.textContent()) ?? "";
  const seconds = Number(text.split(":").at(-1));
  expect(seconds).toBeGreaterThanOrEqual(2);

  // Home: resume
  await page.goto("/");
  await expect(page.getByText("● En cours")).toBeVisible();
  await expect(
    page.getByText(/Commencée à \d{2}:\d{2} · 0 \/ 2 séries/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reprendre ma séance" }).click();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();

  // The appointment cannot start twice
  await page.goBack();
  await expectHomePage(page);
});

test("validates the sets of an exercise, one as planned and one changed, then moves on", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Pecs", 2);
  await page.reload();
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();

  // B2 -> B3
  await page
    .getByRole("link", { name: /0 \/ 2 séries/ })
    .first()
    .click();
  await expect(
    page.getByText("Exercice 1 / 2 · repos 1 min 30 s"),
  ).toBeVisible();
  await expectNoA11yViolation(page);

  // Set 1 as planned: one tap
  await page.getByRole("button", { name: "Valider la série 1" }).click();
  await expect(page.getByText("Série 1 validée")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider la série 2" }),
  ).toBeVisible();

  // Set 2 changed through the sheet
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByText("Ce que tu as réellement fait")).toBeVisible();
  await expectNoA11yViolation(page);
  await page
    .getByRole("button", { name: "Diminuer Répétitions · prévu 10" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 2" })
    .click();
  await expect(page.getByText("Série 2 validée")).toBeVisible();
  await expect(page.getByText("9 rép.")).toBeVisible();

  // Next exercise, then back to B2 with the counters updated
  await page.getByRole("link", { name: /^Suivant :/ }).click();
  await expect(
    page.getByText("Exercice 2 / 2 · repos 1 min 30 s"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await expect(page.getByText("2 / 4", { exact: true })).toBeVisible();
  await expect(page.getByText("2 / 2 séries")).toBeVisible();
});
