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

test("changes a planned session through the ⋯ menu, after seeing the changes", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Jambes");
  await page.reload();

  // B1, then the menu of CAL-04m
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await expect(page.getByText("Blocs, exercices, séries")).toBeVisible();
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: /Modifier la séance/ }).click();

  // The editor opens on the saved session; its date does not change here
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier la séance",
  );
  await expect(page.getByLabel(/^Nom de la séance/)).toHaveValue("Jambes");
  await expect(
    page.getByText("Pour changer la date ou l'heure : « Déplacer »."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vérifier les changements" }),
  ).toBeDisabled();
  await expectNoA11yViolation(page);

  // A new name and a second block
  await page.getByLabel(/^Nom de la séance/).fill("Bas du corps");
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await page.getByRole("button", { name: /^Note/ }).click();
  await page.getByLabel(/^Intitulé/).fill("Consignes");
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();

  // CAL-06b: the changes, then the validation
  await page.getByRole("button", { name: "Vérifier les changements" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vérifier les changements",
  );
  await expect(
    page.getByText("Nom : « Jambes » → « Bas du corps »"),
  ).toBeVisible();
  await expect(page.getByText("Note · Consignes")).toBeVisible();
  // The count sits on the right of the title (CAL-06b).
  await expect(page.getByText("Séances concernées")).toBeVisible();
  await expectNoA11yViolation(page);

  await page.getByRole("button", { name: "Valider" }).click();

  // Back on B1: the new content, and the message
  await expect(page.getByText("Séance modifiée.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Bas du corps" }),
  ).toBeVisible();
  await expect(page.getByText("Note · Consignes")).toBeVisible();
  await expect(page.getByText(/2 blocs · 1 exercice/)).toBeVisible();
});

test("a session already started cannot be changed anymore", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await planSessionToday(page, "Jambes");
  await page.reload();

  // Start it, then come back to its detail
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  const url = page.url();
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();

  await page.goto(url);
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await expect(
    page.getByRole("button", { name: /Modifier la séance/ }),
  ).toBeDisabled();

  // Straight to the editor: it says no as well
  await page.goto(`${url}/modifier`);
  await expect(page.getByText("Cette séance ne se modifie plus")).toBeVisible();
});
