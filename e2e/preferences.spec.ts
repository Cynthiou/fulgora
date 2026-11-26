import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// A squat planned today, 8 reps at 60 kg: the figure of the mockups.
async function planSquatToday(page: Page) {
  const exercises = await page.request.get("/api/exercises?search=Squat");
  const first = (await exercises.json()).items[0];
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name: "Jambes",
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
              sets: [{ ...createEmptySet(), reps: 8, weight_kg: 60 }],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return {
    appointmentId: (await response.json()).appointment_id as number,
    exerciseId: first.id as number,
  };
}

// US-05: the units, the home indicator and the alerts of the timers.
test("reads the loads in pounds once the unit is changed", async ({ page }) => {
  test.slow();
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  const squat = await planSquatToday(page);

  // PRF-01: the row of the preferences now opens the screen
  await page.goto("/profil");
  await page.getByRole("button", { name: /Affichage/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Affichage");
  await expect(page.getByRole("radio", { name: "kg" })).toBeChecked();
  await expect(page.getByText("4 × 8 · 60 kg")).toBeVisible();
  await shoot(page, "prf-03-preferences-affichage");
  await expectNoA11yViolation(page);

  // PRF-03: the pound, saved at once, and the preview that follows
  await page.getByRole("radio", { name: "lb" }).click();
  await expect(page.getByText("4 × 8 · 132,3 lb")).toBeVisible();
  await page.getByRole("radio", { name: "mi" }).click();
  await expect(page.getByText("3,2 mi")).toBeVisible();
  await page.getByRole("radio", { name: "Aucun" }).click();
  await expect(page.getByText("Aucun indicateur")).toBeVisible();

  // Nothing was asked to be saved, and a reload keeps everything
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole("radio", { name: "lb" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "mi" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Aucun" })).toBeChecked();
  await shoot(page, "prf-03-preferences-livres");

  // The row of the profile says what is chosen
  await page.goto("/profil");
  await expect(page.getByText("lb · mi · Aucun")).toBeVisible();

  // B3b: the set sheet asks for pounds, and shows the plan in pounds
  await page.goto(`/seances/${squat.appointmentId}`);
  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await page.getByRole("button", { name: /Modifier la série 1/ }).click();
  const load = page.getByRole("textbox", { name: /^Charge \(lb\)/ });
  await expect(load).toHaveValue("132,277");
  // The plan is written in pounds next to the field; + adds 5 lb and lands
  // on a value the field accepts (a half pound)
  await expect(page.getByText(/Charge \(lb\) · prévu 132,28/)).toBeVisible();
  await page.getByRole("button", { name: /^Augmenter Charge \(lb\)/ }).click();
  await expect(load).toHaveValue("137,5");
  await shoot(page, "b3b-saisie-en-livres");
  await expectNoA11yViolation(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Valider la série/ })
    .click();
  // The only set of the session: the app goes back to B2, 1 / 1 done
  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();

  // The session is finished, so the result counts for the progress (US-39)
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();

  // SUI-09: the progress of the exercise is read in pounds too
  await page.goto(`/suivi/exercices/${squat.exerciseId}`);
  await expect(page.getByRole("list", { name: "Records" })).toContainText("lb");
  await expect(page.getByRole("list", { name: "Records" })).not.toContainText(
    " kg",
  );
});

// PRF-04 and NOT-08: the alerts of the timers, three switches (RM-062).
test("switches the sounds of the timers off", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await page.goto("/profil");
  await page.getByRole("button", { name: /Sons et minuteurs/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sons et minuteurs",
  );
  const sound = page.getByRole("switch", { name: /Sons/ });
  await expect(sound).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/Selon ton téléphone\./)).toBeVisible();
  await shoot(page, "prf-04-sons-et-minuteurs");
  await expectNoA11yViolation(page);

  await sound.click();
  await expect(sound).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(page.getByRole("switch", { name: /Sons/ })).toHaveAttribute(
    "aria-checked",
    "false",
  );

  // The profile sums it up
  await page.goto("/profil");
  await expect(page.getByText("Vibrations", { exact: true })).toBeVisible();

  // NOT-08: the same screen from the notifications, with the bell sentence
  await page.goto("/notifications");
  await page.getByRole("link", { name: /Réglages des alertes/ }).click();
  await expect(
    page.getByText(/Ces réglages ne concernent que les minuteurs/),
  ).toBeVisible();
  await expect(page.getByText(/Selon ton téléphone\./)).toHaveCount(0);
  await shoot(page, "not-08-reglages-des-alertes");
  await expectNoA11yViolation(page);
});
