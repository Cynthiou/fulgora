import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, formatLongDate, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session on a day through the API, as the editor would (US-23).
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
  return (await response.json()).appointment_id as number;
}

test("moves a session to another day, keeping the day it was planned for", async ({
  page,
}) => {
  const today = todayInParis();
  const target = addDays(today, 3);
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await planSession(page, "Jambes", today);

  await page.goto(`/seances/${id}`);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();

  // CAL-05: the sheet, its calendar and the before / after box
  await expect(page.getByText("Déplacer « Jambes »")).toBeVisible();
  await expect(page.getByText("Statut après déplacement")).toBeVisible();
  await expectNoA11yViolation(page);

  await page
    .getByRole("button", { name: new RegExp(`^${formatLongDate(target)}`) })
    .click();
  await page.getByRole("button", { name: "Confirmer" }).click();

  // CAL-05b: where it came from, and where it went
  await expect(page.getByText(/déplacée au/)).toBeVisible();
  await expect(
    page.getByText(formatLongDate(target), { exact: false }).first(),
  ).toBeVisible();

  // The planning shows it on its new day, and no longer on the old one
  await page.goto(`/planning?vue=jour&jour=${target}`);
  await expect(page.getByRole("link", { name: /Jambes/ })).toBeVisible();
  await page.goto(`/planning?vue=jour&jour=${today}`);
  await expect(page.getByText("Rien de prévu aujourd'hui")).toBeVisible();
});

// The example of CAL-05b: a session moved to a day just past waits for a
// confirmation, it is not missed yet (RM-052, RM-068).
test("a session moved to yesterday waits for a confirmation", async ({
  page,
}) => {
  const today = todayInParis();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await planSession(page, "Dos", addDays(today, 2));

  await page.goto(`/seances/${id}`);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();
  await page
    .getByRole("button", {
      name: new RegExp(`^${formatLongDate(addDays(today, -1))}`),
    })
    .click();
  await expect(page.getByText("À confirmer jusqu'au")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer" }).click();

  // The badge of the session, which now waits for a confirmation
  await expect(page.getByText(/À confirmer/).first()).toBeVisible();
});
