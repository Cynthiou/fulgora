# US-36 · Voir le détail d'une séance passée

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 05
**Dépendance principale :** US-35
**Intégration future :** US-37 (« Corriger les résultats »), US-38 (déclarer faite)
**Branche :** `feat/us-36-history-detail`
**Maquettes :** SUI-06, SUI-06b
**Règles :** RM-047, RM-051, RM-058

## User story

En tant qu'utilisateur, je veux revoir une séance passée afin de comparer ce que j'avais prévu et ce que j'ai fait.

## Pourquoi

Voir l'écart entre le prévu et le réalisé, série par série, aide à ajuster les prochaines séances.

## Règles métier

- Séance faite ou inachevée : on affiche le prévu copié au démarrage et le réalisé, côte à côte (RM-047).
- Séance manquée, annulée ou à confirmer : on affiche seulement le prévu, celui de sa version d'origine (RM-058).
- Écart écrit avec ▲ ▼ = et la valeur (« ▲ 2,5 kg », « ▼ 1 rép. »), jamais seulement en couleur.
- « = » quand l'objectif est atteint pile.
- En tête : durée, tonnage (seulement s'il y a des charges) et objectifs atteints, calculés à partir des résultats (RM-051).
- Un objectif est atteint quand chaque valeur prévue est atteinte ou dépassée.

## Critères d'acceptation

- Le titre est le nom de la séance ; dessous : « Effectuée jeudi 19 novembre · 07:02 » et « Force 8 semaines · semaine 3 » (ou « Séance libre »).
- Les trois chiffres : « 52 min durée », « 1 760 kg tonnage », « 6 / 10 objectifs atteints ».
- Chaque exercice affiche « 2 / 4 objectifs » et un tableau : série, PRÉVU, RÉALISÉ, ÉCART.
- Une série non faite affiche « Non faite ».
- Une séance manquée affiche l'étiquette « • MANQUÉE », « Prévue samedi 21 novembre · sans heure · Cardio base », le bloc « Prévu » et la phrase « Aucun résultat : seul le prévu est affiché. »
- Une séance manquée n'affiche pas « Corriger les résultats ».
- Ouvrir l'adresse d'une séance d'un autre affiche « Séance introuvable ».

## Éléments affichés

### Séance effectuée (SUI-06)

**Ligne 1 :** Effectuée jeudi 19 novembre · 07:02
**Ligne 2 :** Force 8 semaines · semaine 3
**Chiffres :** 52 min · durée · 1 760 kg · tonnage · 6 / 10 · objectifs atteints
**Exercice :** Squat à la barre · 2 / 4 objectifs
**Tableau :** S1 · 8 × 60 kg · 8 × 60 kg · = ; S2 · 8 × 60 kg · 7 × 60 kg · ▼ 1 rép. ; S3 · 8 × 60 kg · 8 × 62,5 kg · ▲ 2,5 kg
**Bouton :** Corriger les résultats (US-37, masqué en MVP)

### Séance manquée (SUI-06b)

**Étiquette :** • MANQUÉE
**Ligne :** Prévue samedi 21 novembre · sans heure · Cardio base
**Bloc :** Prévu · Tapis de course · 30 min · 9 km/h · 1 %
**Phrase :** Aucun résultat : seul le prévu est affiché.

**Introuvable :** « Séance introuvable » + « Retour à l'historique »
**Erreur :** « Impossible de charger la séance. » + « Réessayer »

## États à gérer

### Chargement

Structure grise.

### Séance sans charge

Pas de tonnage affiché.

### Séance inachevée

Étiquette « INACHEVÉE », séries non faites affichées « Non faite ».

### Introuvable / Erreur

Messages ci-dessus.

## Réponses API attendues

- Détail : `200` + `{ kind: "done" | "planned_only", … }`
- Identifiant invalide : `400`
- Absent ou d'un autre : `404`

## Hors périmètre

- Corriger les résultats (US-37).
- Déclarer faite une séance manquée (US-38).
- Numéro de semaine du programme : affiché seulement quand les programmes existent (V1) ; en MVP, « Séance libre ».

## Tâches techniques

- [ ] Backend : `historyActions.read(appointmentId, userId)` : `readHistoryAppointment` (rendez-vous + séance + programme, filtré par `owner_user_id`) ; s'il y a une séance réalisée → fonctions `readWorkout…` de l'US-28 ; sinon → `readVersionBlocks`, `readVersionExercises`, `readVersionSets` (prévu de la version d'origine)
- [ ] Backend : `GET /api/history/:appointmentId` → `authenticate` → `validate({ params })` → action
- [ ] Shared : `getSetGap`, `isObjectiveReached`, `countReachedObjectives`, `computeTonnage`, `computeDurationSeconds` (déjà créés, réutilisés) ; `formatSetValues` (« 8 × 62,5 kg », « 1:10 »)
- [ ] Frontend : `historyService.readHistoryDetail(id)`, `hooks/useHistoryDetail.ts`
- [ ] Frontend : `pages/HistoryDetailPage.tsx` ; `components/SessionStats.tsx` ; `components/SetComparisonTable.tsx` (vrai `<table>` avec `<th scope="col">` PRÉVU, RÉALISÉ, ÉCART) ; `components/PlannedOnlyView.tsx` (SUI-06b)
- [ ] Routing : `/suivi/historique/:appointmentId`
- [ ] Tests : unitaires : `getSetGap` (répétitions, charge, durée, vide), `countReachedObjectives` (exemple SUI-06 : 6 / 10)
- [ ] Tests : back : séance faite (prévu + réalisé), séance manquée (prévu seul), séance d'un autre → 404
- [ ] Tests : E2E : de la liste au détail ; axe sur SUI-06 et SUI-06b

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement, chiffres de SUI-06 retrouvés sur les données d'exemple
- [ ] Tableau lisible au lecteur d'écran
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
