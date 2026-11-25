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

type CatalogItem = { id: number; name: string; measure_codes: string[] };

// A session planned today holding one exercise measured in time (US-49).
async function planDurationSession(page: Page, exerciseId: number) {
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
  return (await response.json()).appointment_id as number;
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
  await expect(page.getByRole("heading", { name: "Muscles" })).toBeVisible();
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
  await shoot(page, "cal-01-planning-mois");
  await page.getByRole("button", { name: "Ajouter une séance" }).click();
  await expect(page.getByRole("link", { name: /^Séance libre/ })).toBeVisible();
  await shoot(page, "cal-01b-bouton-ouvert");
  await page
    .getByRole("button", { name: "Fermer le menu d'ajout" })
    .first()
    .click();
  await page.getByRole("tab", { name: "Semaine" }).click();
  await expect(page.getByText("LUN", { exact: true })).toBeVisible();
  await shoot(page, "cal-02-planning-semaine");
  await page.getByRole("tab", { name: "Jour" }).click();
  await expect(page.getByText("Aujourd'hui", { exact: true })).toBeVisible();
  await shoot(page, "cal-03-planning-jour");

  // Suivi vide, Profil
  await page.getByRole("link", { name: "Suivi", exact: true }).click();
  await shoot(page, "sui-07-historique-vide");
  await page.getByRole("link", { name: /mon profil/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mon profil",
  );
  await shoot(page, "profil");

  // NOT-02v : la liste de notifications, vide pour un compte neuf (US-46)
  await page.goto("/");
  await page.getByRole("link", { name: "Notifications" }).click();
  await expect(page.getByText("Aucune notification")).toBeVisible();
  await shoot(page, "not-02-notifications");

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

  // CAL-05 : déplacer la séance (US-25)
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Déplacer/ }).click();
  await expect(page.getByText(/^Déplacer « /)).toBeVisible();
  await shoot(page, "cal-05-deplacer-une-seance");
  await page.getByRole("button", { name: "Annuler" }).click();

  // CAL-07 : la confirmation d'annulation, puis retour (US-26)
  await page.getByRole("button", { name: "Actions de la séance" }).click();
  await page.getByRole("button", { name: /Annuler le rendez-vous/ }).click();
  await expect(page.getByText(/^Annuler « /)).toBeVisible();
  await shoot(page, "cal-07-annuler-une-seance");
  await page.getByRole("button", { name: "Garder la séance" }).click();

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

  // B6 résumé, puis l'historique et son détail. La dernière série de la
  // séance ne déclenche pas de repos (US-30) : on revient aux exercices.
  await page.getByRole("button", { name: "Valider la série 2" }).click();
  await expect(page.getByText(/Séries réalisées/)).toBeVisible();
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

  // B5b et B5c : le minuteur d'un exercice en durée (US-49)
  const catalog = await page.request.get("/api/exercises?search=gainage");
  const plank = ((await catalog.json()).items as CatalogItem[]).find(
    (item) =>
      item.measure_codes.length === 1 && item.measure_codes[0] === "duration",
  );
  if (plank !== undefined) {
    const appointmentId = await planDurationSession(page, plank.id);
    await page.clock.install();
    await page.goto(`/seances/${appointmentId}`);
    await page.getByRole("button", { name: /Démarrer la séance/ }).click();
    await page
      .getByRole("list", { name: "Exercices du bloc" })
      .getByRole("link")
      .first()
      .click();
    await expect(page.getByText("Minuteur · prévu 1 min")).toBeVisible();
    await shoot(page, "b5b-minuteur-avant");
    await page.getByRole("button", { name: /Lancer le minuteur/ }).click();
    await page.clock.fastForward(53_000);
    await expect(page.getByText(/^Fin dans /)).toBeVisible();
    await shoot(page, "b5c-minuteur-en-cours");
  }

  // PRO-01v, PRO-02, PRO-03 et PRO-01 : les programmes (US-18)
  await page.goto("/programmes");
  await expect(page.getByText("Aucun programme")).toBeVisible();
  await shoot(page, "pro-01v-mes-programmes-vide");
  await page.getByRole("link", { name: /Créer mon premier programme/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nouveau programme",
  );
  await page.getByLabel(/^Nom du programme/).fill("Hypertrophie 6 semaines");
  await page.getByRole("button", { name: "lundi" }).click();
  await page.getByRole("button", { name: "jeudi" }).click();
  await shoot(page, "pro-02-nouveau-programme");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByText("Séances de la semaine")).toBeVisible();
  await shoot(page, "pro-03-seances-du-programme");
  await page.getByRole("link", { name: /^Enregistrer/ }).click();
  await expect(
    page.getByRole("link", { name: /Hypertrophie 6 semaines/ }),
  ).toBeVisible();
  await shoot(page, "pro-01-mes-programmes");
});
