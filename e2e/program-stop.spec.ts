import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A program of two weeks, every day, already in the Planning: its first
// session is today, so it can be started.
async function runningProgram(page: Page): Promise<number> {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const start = todayInParis();

  const created = await page.request.post("/api/programs", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Force 8 semaines",
      description: null,
      start_date: start,
      end_date: addDays(start, 13),
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      planned_time: "07:00",
    },
  });
  expect(created.status()).toBe(201);
  const draft = await created.json();

  for (const session of draft.sessions) {
    const written = await page.request.put(
      `/api/programs/${draft.id}/sessions/${session.schedule_id}`,
      {
        headers: { Origin: E2E_ORIGIN },
        data: {
          scope: "this",
          session: {
            name: "Jambes",
            planned_date: start,
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
        },
      },
    );
    expect(written.status()).toBe(200);
  }

  const activated = await page.request.post(
    `/api/programs/${draft.id}/activate`,
    { headers: { Origin: E2E_ORIGIN } },
  );
  expect(activated.status()).toBe(200);
  return draft.id;
}

// US-21: a program nobody has started is thrown away whole (PRO-11c).
test("deletes a program nobody has started", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await runningProgram(page);

  await page.goto(`/programmes/${id}`);
  await page.getByRole("button", { name: "Actions du programme" }).click();
  await expect(page.getByText("Abandonner le programme")).toHaveCount(0);
  await page.getByRole("button", { name: /Supprimer le programme/ }).click();

  await expect(
    page.getByText("Supprimer « Force 8 semaines » ?"),
  ).toBeVisible();
  await expect(
    page.getByText(/Les 14 séances prévues seront retirées du Planning/),
  ).toBeVisible();
  await shoot(page, "pro-11c-confirmer-la-suppression");
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Supprimer le programme" }).click();

  await expect(page.getByText("Programme supprimé.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mes programmes",
  );
  // Nothing left in the Planning
  await page.goto(`/planning?vue=jour&jour=${todayInParis()}`);
  await expect(page.getByText("Jambes")).toHaveCount(0);
});

// US-21: once a session has been started, the program is given up and its
// past is kept (PRO-11, RM-035).
test("gives up a program already started and keeps the past", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const id = await runningProgram(page);
  await page.reload();

  // The session of today, started then finished
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();

  // With a session in progress, the abandon says no (PRO-11b)
  await page.goto(`/programmes/${id}`);
  await page.getByRole("button", { name: "Actions du programme" }).click();
  await page.getByRole("button", { name: /Abandonner le programme/ }).click();
  await expect(page.getByText("Abandon impossible")).toBeVisible();
  await expect(page.getByText(/est en cours depuis/)).toBeVisible();
  await shoot(page, "pro-11b-abandon-impossible");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Fermer" }).click();

  // The session ends (given up here, no set done), and the abandon of the
  // program becomes possible: it was started, which is enough (US-21).
  await page.goto("/");
  await page.getByRole("link", { name: "Reprendre ma séance" }).click();
  await page.getByRole("button", { name: "Abandonner" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abandonner" })
    .click();
  await expect(page.getByText("Inachevée")).toBeVisible();

  await page.goto(`/programmes/${id}`);
  await page.getByRole("button", { name: "Actions du programme" }).click();
  await page.getByRole("button", { name: /Abandonner le programme/ }).click();

  await expect(
    page.getByText("Abandonner « Force 8 semaines » ?"),
  ).toBeVisible();
  await expect(
    page.getByText(/séances à venir .* seront annulées/),
  ).toBeVisible();
  await expect(
    page.getByText(/séance passée et ses résultats sont conservés/),
  ).toBeVisible();
  await shoot(page, "pro-11-abandonner-le-programme");
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Abandonner le programme" }).click();

  await expect(page.getByText("Programme abandonné.")).toBeVisible();
  await expect(page.getByText("Abandonné").first()).toBeVisible();
});
