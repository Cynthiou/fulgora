import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A session of one AMRAP of 12 minutes and one circuit of 3 rounds.
async function planTimedSession(page: Page) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const block = (
    type: "amrap" | "circuit",
    rounds: number | null,
    limit: number | null,
  ) => ({
    block_type: type,
    name: null,
    instructions: null,
    planned_rounds: rounds,
    time_limit_seconds: limit,
    exercises: [
      {
        exercise_id: first.id,
        default_rest_seconds: null,
        sets: [{ ...createEmptySet(), reps: 10 }],
      },
    ],
  });
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Conditionnement",
      planned_date: todayInParis(),
      planned_time: null,
      blocks: [block("amrap", null, 12 * 60), block("circuit", 3, null)],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).appointment_id as number;
}

// US-31: a timed block is launched by hand, counts its rounds, and is
// saved as one total (RM-042, D-06).
test("runs the timer of an AMRAP and of a circuit", async ({ page }) => {
  test.slow();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const appointmentId = await planTimedSession(page);

  await page.goto(`/seances/${appointmentId}`);
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();

  // Nothing starts by itself: each block waits for "Lancer le bloc"
  const launch = page.getByRole("button", { name: "Lancer le bloc" });
  await expect(launch).toHaveCount(2);
  await shoot(page, "b2-blocs-chronometres");
  await expectNoA11yViolation(page);

  // The AMRAP counts down from its 12 minutes and counts the rounds
  await launch.first().click();
  await expect(page.getByText("AMRAP de 12 min")).toBeVisible();
  await expect(page.getByText("0 tours faits")).toBeVisible();
  const addRound = page.getByRole("button", { name: "1 tour" });
  await addRound.first().click();
  await addRound.first().click();
  await expect(page.getByText("2 tours faits")).toBeVisible();
  await page.getByRole("textbox", { name: "Répétitions en plus" }).fill("8");
  await shoot(page, "b2-amrap-en-cours");
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Terminer le bloc" }).click();
  await expect(page.getByText("AMRAP · 2 tours + 8 rép.")).toBeVisible();

  // The circuit counts its rounds against the plan
  await page.getByRole("button", { name: "Lancer le bloc" }).click();
  await expect(page.getByText("0 / 3 tours")).toBeVisible();
  const circuitRound = page.getByRole("button", { name: "1 tour" });
  await circuitRound.click();
  await circuitRound.click();
  await circuitRound.click();
  await expect(page.getByText("3 / 3 tours")).toBeVisible();
  await page.getByRole("button", { name: "Terminer le bloc" }).click();
  await expect(page.getByText("Circuit · 3 / 3 tours")).toBeVisible();

  // B6: the totals of the two blocks are in the summary
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  const results = page.getByRole("list", { name: "Blocs chronométrés" });
  await expect(results).toContainText("AMRAP · 2 tours + 8 rép.");
  await expect(results).toContainText("Circuit · 3 / 3 tours");
  await shoot(page, "b6-resume-blocs-chronometres");
  await expectNoA11yViolation(page);
});
