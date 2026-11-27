import { expect, type Page, test } from "@playwright/test";
import type { PlannedSetValues } from "shared";
import { CAPTURE, signUp } from "./helpers";

// Screenshots of the eleven screens of the handoff des séries, at the size
// of its device (330 x 720), dark then light. Not part of the normal suite:
//   CAPTURE=1 npx playwright test e2e/captures-v3-series.spec.ts --project=mobile
// The files land in design/captures-v3/series/.
test.use({ viewport: { width: 330, height: 720 } });
test.skip(!CAPTURE, "Captures are taken on demand (CAPTURE=1).");

const DIRECTORY = "design/captures-v3/series";

async function shootSeries(page: Page, name: string) {
  for (const [theme, suffix] of [
    ["fulgora-dark", "sombre"],
    ["fulgora-light", "clair"],
  ] as const) {
    await page.evaluate((value) => {
      document.documentElement.setAttribute("data-theme", value);
    }, theme);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${DIRECTORY}/${name}-${suffix}.png` });
  }
}

type CatalogItem = {
  id: number;
  name: string;
  measure_codes: string[];
  is_bodyweight: boolean;
  allows_per_side: boolean;
  category_name: string | null;
  equipment_names: string | null;
};

// The first exercise of the catalog whose name holds the search.
async function findExercise(page: Page, search: string): Promise<CatalogItem> {
  const answer = await page.request.get(
    `/api/exercises?search=${encodeURIComponent(search)}`,
  );
  const [first] = (await answer.json()).items as CatalogItem[];
  expect(first, `aucun exercice pour « ${search} »`).toBeTruthy();
  return first as CatalogItem;
}

const emptySet: PlannedSetValues = {
  reps: null,
  reps_left: null,
  reps_right: null,
  weight_kg: null,
  weight_left_kg: null,
  weight_right_kg: null,
  duration_seconds: null,
  distance_meters: null,
  speed_kmh: null,
  resistance: null,
  incline_percent: null,
  calories: null,
  rest_after_seconds: null,
};

// Puts one exercise, with the sets given, in the draft of the editor and
// opens its screen. Building the draft in the tab keeps the captures
// short: the flow itself is covered by the other specs.
async function openExercise(
  page: Page,
  item: CatalogItem,
  sets: Partial<PlannedSetValues>[],
  options: { isPerSide?: boolean; rest?: number } = {},
) {
  const draft = {
    draft: {
      name: "Haut du corps",
      planned_date: "2026-11-27",
      planned_time: null,
      blocks: [
        {
          key: "b1",
          block_type: "classic",
          name: null,
          instructions: null,
          planned_rounds: null,
          time_limit_seconds: null,
          exercises: [
            {
              key: "e1",
              exercise_id: item.id,
              name: item.name,
              meta: [item.category_name, item.equipment_names]
                .filter((part) => part !== null)
                .join(" · "),
              measure_codes: item.measure_codes,
              is_bodyweight: item.is_bodyweight,
              allows_per_side: item.allows_per_side,
              is_per_side: options.isPerSide ?? false,
              default_rest_seconds: options.rest ?? 90,
              sets: sets.map((values) => ({ ...emptySet, ...values })),
            },
          ],
        },
      ],
    },
    openBlockKey: "b1",
  };

  await page.goto("/seances/nouvelle");
  await page.evaluate((value) => {
    sessionStorage.setItem("session-editor:draft", JSON.stringify(value));
  }, draft);
  await page.goto("/seances/nouvelle");
  // The name is matched as plain text: some of them hold parentheses
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("listitem")
    .first()
    .getByRole("button")
    .nth(1)
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: item.name }),
  ).toBeVisible();
}

test("captures the screens of the sets (handoff v3)", async ({ page }) => {
  test.setTimeout(300_000);
  await signUp(page);

  const bench = await findExercise(page, "Développé couché");
  const plank = await findExercise(page, "Gainage");
  const lunge = await findExercise(page, "Fentes avec haltères");
  const treadmill = await findExercise(page, "Tapis de course");

  // 01 a new exercise, nothing written yet
  await openExercise(page, bench, [{}]);
  await page.getByRole("button", { name: /^1 série/ }).click();
  await expect(page.getByText("Première fois sur cet exercice")).toBeVisible();
  await shootSeries(page, "01-nouvel-exercice-sans-historique");

  // 02 the quick setting: three sets of ten, the load still empty
  await page.getByRole("button", { name: "Augmenter séries" }).click();
  await page.getByRole("button", { name: "Augmenter séries" }).click();
  await page.getByRole("textbox", { name: "RÉPÉTITIONS" }).fill("10");
  await shootSeries(page, "02-reglage-rapide");

  // 03 typing the load by hand: the case takes the blue outline
  await page.getByRole("textbox", { name: "CHARGE" }).click();
  await page.getByRole("textbox", { name: "CHARGE" }).fill("60");
  await shootSeries(page, "03-saisie-a-la-main");

  // 04 the sets written, back on the list
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByRole("list", { name: "Séries" }).getByText("3 séries"),
  ).toBeVisible();
  await shootSeries(page, "04-series-remplies");

  // 05 an exercise measured in time
  await openExercise(page, plank, [{ duration_seconds: 45 }]);
  await page.getByRole("button", { name: /^1 série/ }).click();
  await shootSeries(page, "05-duree");

  // 06 a per-side exercise, the list alone
  await openExercise(page, lunge, [{ reps: 10, weight_kg: 12 }], {
    isPerSide: true,
  });
  await shootSeries(page, "06-par-cote-alterne");

  // 07 both sides alike
  await page.getByRole("button", { name: /^1 série/ }).click();
  await shootSeries(page, "07-gauche-egale-droite");

  // 08 the repetitions differ
  await page.getByRole("button", { name: "Rép.", exact: true }).click();
  await page.getByRole("textbox", { name: "RÉP. GAUCHE" }).fill("10");
  await page.getByRole("textbox", { name: "RÉP. DROITE" }).fill("8");
  await shootSeries(page, "08-repetitions-gauche-droite");

  // 09 the load differs, the repetitions do not
  await page.getByRole("button", { name: "Rép.", exact: true }).click();
  await page.getByRole("button", { name: "Charge", exact: true }).click();
  await page.getByRole("textbox", { name: "CHARGE GAUCHE" }).fill("8");
  await page.getByRole("textbox", { name: "CHARGE DROITE" }).fill("12");
  await shootSeries(page, "09-charge-gauche-droite");

  // 10 both differ: five cases, in the compact height
  await page.getByRole("button", { name: "Rép.", exact: true }).click();
  await shootSeries(page, "10-repetitions-et-charge-gauche-droite");

  // 11 a cardio machine
  await openExercise(
    page,
    treadmill,
    [{ duration_seconds: 600, speed_kmh: 9, incline_percent: 1 }],
    { rest: 60 },
  );
  await page.getByRole("button", { name: /^Étape 1/ }).click();
  await shootSeries(page, "11-cardio-machine");
});
