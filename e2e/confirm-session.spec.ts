import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session planned on a past day, through the API (US-23).
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

// US-27: a session of two days ago waits for an answer; "Pas faite" marks it
// missed, and it can still be declared done later (RM-052, RM-067).
test("answers « Pas faite » on a session waiting for a confirmation", async ({
  page,
}) => {
  const twoDaysAgo = addDays(todayInParis(), -2);
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await planSessionOn(page, "Cardio léger", twoDaysAgo);

  // The scheduled task has not run yet: the session is still planned. The
  // move to "to confirm" is checked on the server side; here the session is
  // put in that state through a move to the same past day (US-25).
  await page.goto(`/seances/${id}`);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();
  await page.getByLabel(/^Heure/).fill("18:00");
  await page.getByRole("button", { name: "Confirmer" }).click();

  // CAL-08: the question, the deadline and the two answers
  await expect(page.getByText("Tu as fait cette séance ?")).toBeVisible();
  await expect(page.getByText(/^Sans réponse, elle passera/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Je l'ai faite" }),
  ).toBeDisabled();
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Pas faite" }).click();

  // CAL-08c: what the answer did; the question is gone, and the session
  // can still be done late (RM-069).
  await expect(page.getByText(/Séance marquée comme manquée/)).toBeVisible();
  await expect(page.getByText("Tu as fait cette séance ?")).toHaveCount(0);
  await expect(page.getByText("Manquée").first()).toBeVisible();
});
