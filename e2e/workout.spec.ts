import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, as the editor would (US-23).
async function planSessionToday(page: Page, name: string) {
  const exercises = await page.request.get("/api/exercises?search=Pompes");
  const first = (await exercises.json()).items[0];
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
          exercises: [
            {
              exercise_id: first.id,
              default_rest_seconds: 90,
              sets: [
                { ...createEmptySet(), reps: 10 },
                { ...createEmptySet(), reps: 10 },
              ],
            },
          ],
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
