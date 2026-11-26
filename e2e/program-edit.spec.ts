import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis, weekdayIndex } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The next Saturday after today, so every session of the program is still
// to come whatever the day the test runs (weekdayIndex: Monday = 0).
function nextSaturday(): string {
  const today = todayInParis();
  return addDays(today, 5 - weekdayIndex(today) || 7);
}

// A program of three Saturdays at 10:00, already in the Planning, built
// through the API: the screen under test is PRO-08, not the creation.
async function runningProgram(page: Page): Promise<{
  id: number;
  saturdays: string[];
}> {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const start = nextSaturday();
  // The period ends on a Sunday, so moving the session to Sunday keeps
  // the three weeks of the program.
  const end = addDays(start, 15);

  const created = await page.request.post("/api/programs", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Cardio base",
      description: null,
      start_date: start,
      end_date: end,
      weekdays: [6],
      planned_time: "10:00",
    },
  });
  expect(created.status()).toBe(201);
  const draft = await created.json();
  const schedule = draft.sessions[0];

  const written = await page.request.put(
    `/api/programs/${draft.id}/sessions/${schedule.schedule_id}`,
    {
      headers: { Origin: E2E_ORIGIN },
      data: {
        scope: "this",
        session: {
          name: "Course",
          planned_date: start,
          planned_time: "10:00",
          blocks: [
            {
              block_type: "classic",
              name: "Sortie",
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
      },
    },
  );
  expect(written.status()).toBe(200);

  const activated = await page.request.post(
    `/api/programs/${draft.id}/activate`,
    { headers: { Origin: E2E_ORIGIN } },
  );
  expect(activated.status()).toBe(200);

  return {
    id: draft.id,
    saturdays: [start, addDays(start, 7), addDays(start, 14)],
  };
}

// US-20: the Saturday session moves to Sunday. The preview says what will
// happen, then the Planning shows the new dates (RM-031).
test("moves a program session from Saturday to Sunday", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const { id, saturdays } = await runningProgram(page);

  // PRO-07, then the ⋯ (PRO-07b)
  await page.goto(`/programmes/${id}`);
  await page.getByRole("button", { name: "Actions du programme" }).click();
  await page.getByRole("button", { name: /Modifier le programme/ }).click();

  // PRO-08
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier le programme",
  );
  await expect(page.getByText("Rendez-vous concernés · 0")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enregistrer" }),
  ).toBeDisabled();
  await expectNoA11yViolation(page);

  await page.getByLabel("Jour").selectOption("7");

  await expect(page.getByText("Avant : samedi")).toBeVisible();
  await expect(page.getByText("Rendez-vous concernés · 3")).toBeVisible();
  const lines = page.getByText(/· 10:00$/);
  await expect(lines).toHaveCount(3);
  await shoot(page, "pro-08-modifier-le-programme");
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Back on PRO-07 with the message, and the Planning follows
  await expect(page.getByText("Programme modifié.")).toBeVisible();
  await page.goto(
    `/planning?vue=jour&jour=${addDays(saturdays[0] as string, 1)}`,
  );
  await expect(page.getByText("Course").first()).toBeVisible();

  // The old Saturday holds nothing any more
  await page.goto(`/planning?vue=jour&jour=${saturdays[0]}`);
  await expect(page.getByText("Course")).toHaveCount(0);
});
