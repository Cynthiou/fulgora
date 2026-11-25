import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Plans a session for today through the API, as the editor would (US-23).
async function planSessionToday(page: Page, name: string) {
  const exercises = await page.request.get("/api/exercises");
  const [first] = (await exercises.json()).items;
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: todayInParis(),
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

test("cancels a planned session, which stays visible as cancelled", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Jambes");
  await page.reload();

  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Annuler le rendez-vous/ }).click();

  // CAL-07: the confirmation
  await expect(page.getByText("Annuler « Jambes » ?")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Garder la séance" }).click();
  await expect(
    page.getByRole("button", { name: /Démarrer la séance/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Annuler le rendez-vous/ }).click();
  await page.getByRole("button", { name: "Annuler la séance" }).click();

  // CAL-07c: the session is kept, without any way to start it
  await expect(page.getByText(/^Annulée le /)).toBeVisible();
  await expect(page.getByText("Ce rendez-vous est annulé.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Démarrer la séance/ }),
  ).toHaveCount(0);
  await expectNoA11yViolation(page);

  // The planning shows it as cancelled too
  await page.goto("/planning?vue=jour");
  await expect(page.getByText("aucune séance")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Jambes/ })).toBeVisible();
});

test("a session already started cannot be cancelled", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Jambes");
  await page.reload();

  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  const url = page.url();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();

  await page.goto(url);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await expect(
    page.getByRole("button", { name: /Annuler le rendez-vous/ }),
  ).toBeDisabled();
});
