import { expect, type Page, test } from "@playwright/test";
import { createEmptySet, todayInParis } from "shared";
import { E2E_ORIGIN, expectHomePage, signUp } from "./helpers";

// Screenshots of every screen, light theme then dark, at the size of a phone.
// Not part of the normal suite: run it on purpose with
//   CAPTURE=1 npx playwright test e2e/captures.spec.ts --project=mobile
// The files land in design/captures/, which Cynthia compares with the
// wireframes of design/wireframes-png/.
const CAPTURE = process.env.CAPTURE === "1";
const DIRECTORY = "design/captures";

test.use({ viewport: { width: 390, height: 844 } });
test.skip(!CAPTURE, "Captures are taken on demand (CAPTURE=1).");

// One screen, in the two themes.
async function shoot(page: Page, name: string) {
  for (const [theme, suffix] of [
    ["fulgora-light", "clair"],
    ["fulgora-dark", "sombre"],
  ] as const) {
    await page.evaluate((value) => {
      document.documentElement.setAttribute("data-theme", value);
    }, theme);
    await page.waitForTimeout(120);
    await page.screenshot({
      path: `${DIRECTORY}/${name}-${suffix}.png`,
      fullPage: true,
    });
  }
}

// A session planned today, through the API, with one exercise and two sets.
async function planSessionToday(page: Page, name: string) {
  const exercises = await page.request.get("/api/exercises?search=Squat");
  const first = (await exercises.json()).items[0];
  const response = await page.request.post("/api/appointments", {
    headers: { Origin: E2E_ORIGIN },
    data: {
      name,
      planned_date: todayInParis(),
      planned_time: "18:30",
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
                { ...createEmptySet(), reps: 10, weight_kg: 40 },
                { ...createEmptySet(), reps: 8, weight_kg: 45 },
              ],
            },
          ],
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
}

test("captures the screens of the MVP", async ({ page }) => {
  test.setTimeout(300_000);

  // 01 Inscription
  await page.goto("/inscription");
  await shoot(page, "01-inscription");

  // 02 Connexion
  await page.goto("/connexion");
  await shoot(page, "02-connexion");

  // The account, then the home page with nothing planned
  await signUp(page);
  await shoot(page, "01-inscription-reussie");
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);
  await shoot(page, "03-accueil-vide");

  // 04 Catalogue, 05 Fiche exercice
  await page.getByRole("link", { name: "Catalogue", exact: true }).click();
  await expect(page.getByText(/^\d+ exercices$/)).toBeVisible();
  await shoot(page, "04-catalogue");
  await page.getByRole("searchbox").fill("squat");
  await expect(page.getByText(/résultats? pour/)).toBeVisible();
  await shoot(page, "04-catalogue-recherche");
  await page
    .getByRole("list", { name: "Exercices" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByText("Muscles sollicités")).toBeVisible();
  await shoot(page, "05-fiche-exercice");

  // A2 Nouvelle séance, A3 type de bloc, A4 bloc vide
  await page.goto("/seances/nouvelle");
  await shoot(page, "a2-nouvelle-seance");
  await page.getByLabel(/^Nom de la séance/).fill("Haut du corps");
  await page.getByRole("button", { name: /^Date/ }).click();
  await shoot(page, "a2b-choisir-la-date");
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Ajouter un bloc" }).click();
  await shoot(page, "a3-type-de-bloc");
  await page.getByRole("button", { name: /^Classique/ }).click();
  await shoot(page, "a4-bloc-vide");

  // A5 Catalogue en sélection, A6 bloc rempli, A7a configuration
  await page.getByRole("button", { name: "Ajouter des exercices" }).click();
  await expect(page.getByText("Sélection pour le bloc 1")).toBeVisible();
  await shoot(page, "a5-catalogue-selection");
  const cards = page
    .getByRole("list", { name: "Exercices" })
    .getByRole("button");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await shoot(page, "a5-catalogue-selection-2-choisis");
  await page
    .getByRole("button", { name: "Ajouter au bloc, 2 sélectionnés" })
    .click();
  await expect(page.getByText("2 exercices")).toBeVisible();
  await shoot(page, "a6-bloc-avec-exercices");
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByText("Préparation · Objectifs prévus")).toBeVisible();
  await shoot(page, "a7-configurer-les-series");
  await page.getByRole("button", { name: "Valider l'exercice" }).click();
  await page.getByRole("button", { name: "Enregistrer le bloc" }).click();
  await shoot(page, "a8-seance-prete");
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Séance enregistrée" }),
  ).toBeVisible();
  await shoot(page, "a9-seance-enregistree");

  // 03 Accueil avec une séance, Planning
  await page.goto("/");
  await expectHomePage(page);
  await shoot(page, "03-accueil-avec-seance");
  await page.getByRole("link", { name: "Planning", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Planning");
  await shoot(page, "planning");

  // Suivi vide, Profil
  await page.getByRole("link", { name: "Suivi", exact: true }).click();
  await shoot(page, "sui-07-historique-vide");
  await page.getByRole("link", { name: /mon profil/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mon profil",
  );
  await shoot(page, "profil");

  // B1 séance prévue, B2 séance en cours, B3 série, B4 repos
  await planSessionToday(page, "Jambes");
  await page.goto("/");
  await page.getByRole("link", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText("Planifiée")).toBeVisible();
  await shoot(page, "b1-seance-prevue");

  // CAL-04m le menu ⋯, CAL-06 l'éditeur, CAL-06b les changements (US-17)
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await expect(page.getByText("Blocs, exercices, séries")).toBeVisible();
  await shoot(page, "cal-04m-menu-seance");
  await page.getByRole("button", { name: /Modifier la séance/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier la séance",
  );
  await shoot(page, "cal-06-modifier-la-seance");
  await page.getByLabel(/^Nom de la séance/).fill("Bas du corps");
  await page.getByRole("button", { name: "Vérifier les changements" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vérifier les changements",
  );
  await shoot(page, "cal-06b-verifier-les-changements");
  await page.getByRole("button", { name: "Revenir" }).click();
  // Leaving a changed draft asks first (the name went back, the draft is
  // still seen as touched).
  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: "Quitter" }).click();
  await expect(page.getByText("Planifiée")).toBeVisible();

  await page.getByRole("button", { name: /Démarrer la séance/ }).click();
  await expect(page.getByText("En cours · séance libre")).toBeVisible();
  await shoot(page, "b2-seance-en-cours");
  await page
    .getByRole("list", { name: "Exercices du bloc" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByText(/^Exercice 1 \/ 1/)).toBeVisible();
  await shoot(page, "b3a-serie-en-cours");
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByText("Ce que tu as réellement fait")).toBeVisible();
  await shoot(page, "b3b-modifier-la-serie");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Valider la série 1" })
    .click();
  await expect(page.getByText(/^Repos ·/)).toBeVisible();
  await shoot(page, "b4-repos");
  await page.getByRole("button", { name: "Passer le repos" }).click();

  // B6 résumé, puis l'historique et son détail
  await page.getByRole("button", { name: "Valider la série 2" }).click();
  await page.getByRole("button", { name: "Passer le repos" }).click();
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText("Terminée")).toBeVisible();
  await shoot(page, "b6-resume-de-la-seance");
  await page.goto("/suivi");
  await expect(page.getByText(/^Semaine du /)).toBeVisible();
  await shoot(page, "sui-05-historique");
  await page
    .getByRole("link", { name: /Jambes.*Effectuée/ })
    .first()
    .click();
  await expect(page.getByRole("table")).toBeVisible();
  await shoot(page, "sui-06-detail-seance-passee");
});
