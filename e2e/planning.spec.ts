import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session through the API, as the editor would (US-23).
async function planSession(page: Page, name: string, date: string) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: date,
      planned_time: "07:00",
      blocks: [
        {
          block_type: "classic",
          name: "Force",
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
}

test("walks the planning from the month to the week and to the day", async ({
  page,
}) => {
  const today = todayInParis();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSession(page, "Jambes", today);
  await planSession(page, "Mobilité", addDays(today, 2));

  await page.getByRole("link", { name: "Planning", exact: true }).click();

  // CAL-01: the month, its legend and the day under the grid
  await expect(
    page.getByRole("table", { name: /^Calendrier de/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Légende des statuts")).toBeVisible();
  await expect(page.getByRole("link", { name: /Jambes/ })).toBeVisible();
  await expectNoA11yViolation(page);

  // CAL-02: the week, one line per day
  await page.getByRole("tab", { name: "Semaine" }).click();
  await expect(page.getByText("LUN", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mobilité/ })).toBeVisible();
  await expectNoA11yViolation(page);

  // CAL-03: the day, with the next session to start
  await page.getByRole("tab", { name: "Jour" }).click();
  await expect(page.getByText("Aujourd'hui", { exact: true })).toBeVisible();
  await expect(page.getByText("À suivre")).toBeVisible();
  await expectNoA11yViolation(page);

  // The next day holds nothing: the empty state names the next session
  await page.getByRole("button", { name: "Jour suivant" }).click();
  await expect(page.getByText("Rien de prévu ce jour-là")).toBeVisible();
  await expect(page.getByText("Prochaine séance")).toBeVisible();
  await expect(page.getByRole("link", { name: /Mobilité/ })).toBeVisible();
  await expectNoA11yViolation(page);

  // Back to today, then start the session of the day
  await page.getByRole("button", { name: /Revenir à aujourd'hui/ }).click();
  await page.getByRole("button", { name: /Démarrer Jambes/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();
});

test("shows a session done in advance on its real day, with a reminder", async ({
  page,
}) => {
  const today = todayInParis();
  const inTwoDays = addDays(today, 2);
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSession(page, "Haut du corps", inTwoDays);

  // Done today, while planned in two days (RM-069, RM-070)
  await page.goto("/planning?vue=jour&jour=" + inTwoDays);
  await page.getByRole("link", { name: /Haut du corps/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();

  // Today: the session, with the day it was planned for
  await page.goto(`/planning?vue=jour&jour=${today}`);
  await expect(page.getByText(/prévue le/)).toBeVisible();

  // Its planned day: a greyed reminder, which does not count
  await page.goto(`/planning?vue=jour&jour=${inTwoDays}`);
  await expect(page.getByText(/Commencée le/)).toBeVisible();
  await expect(page.getByText("aucune séance")).toBeVisible();
});
