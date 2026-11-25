import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

// US-49: the app counts the time of an exercise measured in time. The clock
// of the browser is moved by the test, so a plank of one minute takes no
// time at all.

type CatalogItem = { id: number; name: string; measure_codes: string[] };

// The first catalog exercise measured in time only (a plank, for instance).
async function findDurationExercise(page: Page): Promise<CatalogItem> {
  const response = await page.request.get("/api/exercises?search=gainage");
  const items = (await response.json()).items as CatalogItem[];
  const found = items.find(
    (item) =>
      item.measure_codes.length === 1 && item.measure_codes[0] === "duration",
  );
  expect(found, "no exercise measured in time in the catalog").toBeDefined();
  return found as CatalogItem;
}

async function planPlank(page: Page, exerciseId: number) {
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Gainage",
      planned_date: todayInParis(),
      planned_time: null,
      blocks: [
        {
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: [
            {
              exercise_id: exerciseId,
              default_rest_seconds: 45,
              sets: [{ ...createEmptySet(), duration_seconds: 60 }],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

test("the timer of an exercise in time validates the set by itself", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const exercise = await findDurationExercise(page);
  await planPlank(page, exercise.id);

  // The clock is ours from here on
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();

  // B5b: the choice, the planned time and the start
  await expect(page.getByText("Minuteur · prévu 1 min")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chrono ↑" })).toBeVisible();
  await page.getByRole("button", { name: /Lancer le minuteur/ }).click();

  // B5c: the last ten seconds announce the beeps
  await page.clock.fastForward(53_000);
  await expect(
    page.getByText(/^Fin dans \d+ s · bip à 3, 2, 1$/),
  ).toBeVisible();

  // At zero the set is validated by itself, and the rest starts (US-30)
  await page.clock.fastForward(8_000);
  await expect(page.getByText("Repos")).toBeVisible();
});
