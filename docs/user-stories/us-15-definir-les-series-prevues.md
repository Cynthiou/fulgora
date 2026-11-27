# US-15 · Définir les séries prévues

EPIC 3 · Séances modèles

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-14, T-08
**Intégration future :** US-29 (saisie du réalisé), US-49 (minuteur)
**Branche :** `feat/us-15-planned-sets`
**Maquettes :** A6, A7a, A7b, A7c, A7d (A7e et A7f : US-51)
**Règles :** RM-010, RM-022, RM-023

> **Mise à jour du 27/11/2026 (handoff des séries).** L'écran des séries
> d'un exercice est refait d'après `design/handoff-series/`, qui fait foi
> quand il contredit cette fiche : on écrit des **lignes** (n séries qui
> portent les mêmes valeurs) dans une feuille de saisie, une case par
> mesure, avec − / + et le clavier natif. Les pas changent (charge 2,5 kg,
> charge d'un côté 1 kg, durée 5 s minimum 5 s, durée cardio en minutes).
> Un bloc chronométré (US-43) garde l'ancien écran.

## User story

En tant qu'utilisateur, je veux définir mes séries et leurs objectifs afin de savoir exactement quoi faire à la salle.

## Pourquoi

Les objectifs prévus servent deux fois : ils guident pendant la séance, puis ils permettent de comparer le prévu et le réalisé dans le Suivi.

## Règles métier

- Seules les mesures de l'exercice sont proposées (RM-010). Profils :
  - **répétitions + charge** : Répétitions, Charge (kg) ;
  - **poids du corps** : Répétitions, et un lest facultatif (« Ajouter un lest », désactivé par défaut) enregistré comme charge ;
  - **durée** : Durée (min:s) ;
  - **cardio** : des **étapes** (une étape = une série en base) avec Durée, Distance, Vitesse, Inclinaison, Calories selon la machine.
- Chaque objectif est facultatif : un champ vide = pas d'objectif (RM-022).
- Chaque exercice a un repos par défaut (1 min 30 au départ) ; une série peut avoir son propre repos, qui remplace celui de l'exercice (RM-023).
- 1 à 20 séries par exercice.
- Bornes : répétitions 0 à 1 000 ; charge 0 à 1 000 kg, par pas de 0,25 ; durée 0 à 24 h ; distance 0 à 1 000 km ; vitesse 0 à 60 km/h ; inclinaison 0 à 40 % ; résistance 0 à 100 ; calories 0 à 10 000 ; repos 0 à 10 min.
- Valeurs de la 1ʳᵉ série ajoutée : 10 rép. (répétitions), 1 min (durée), 1 étape de 10 min (cardio), charge vide.
- En base, tout est stocké en kg, mètres, secondes, km/h (DT-11) ; l'écran affiche km pour la distance.

## Critères d'acceptation

- Toucher un exercice du bloc ouvre sa configuration, titrée par son nom et « Groupe · Matériel ».
- L'écran affiche « PRÉPARATION · OBJECTIFS PRÉVUS » et « Mesures suivies : Répétitions · Charge ».
- « Repos par défaut » se règle en minutes et secondes.
- Chaque série a ses champs ; « + Série » ajoute une série vide, « Dupliquer la dernière » recopie la dernière.
- « ⋯ » sur une série permet « Repos différent » et « Retirer ».
- Poids du corps : « Ajouter un lest » active le champ « Lest (kg) » série par série.
- Cardio : les séries s'appellent « Étape 1, 2, 3 » ; « + Étape » en ajoute une.
- Une valeur hors bornes affiche un message sous le champ et bloque « Valider l'exercice ».
- La saisie numérique ouvre le clavier numérique (décimales acceptées pour la charge, la distance et la vitesse).
- « Valider l'exercice » revient au bloc avec le résumé à jour.
- Le serveur refuse une mesure qui n'appartient pas à l'exercice (exemple : une durée sur le développé couché).

## Éléments affichés

**En-tête :** PRÉPARATION · OBJECTIFS PRÉVUS · « Mesures suivies : Répétitions · Charge »
**Repos :** Repos par défaut · 1 min 30
**Série :** Série 1 · Répétitions · Charge (kg)
**Boutons :** + Série · Dupliquer la dernière · Valider l'exercice
**Lest :** Ajouter un lest · « Gilet, ceinture, disque : une charge en plus du poids du corps » · Lest (kg)
**Durée :** Durée (min:s) · « Pendant la séance : minuteur ou chrono au choix. »
**Cardio :** Étape 1 · Durée · Distance (km) · Vitesse (km/h) · Inclinaison (%) · + Étape
**Résumés :** « 1 série · 10 rép. · 40 kg » · « 3 séries · 8 rép. · 10 kg lest » · « 3 séries · 1 min » · « 3 étapes »

## États à gérer

### Valeur invalide

Message sous le champ (« Entre un nombre entre 0 et 1 000. »), bouton « Valider l'exercice » désactivé.

### Exercice sans mesure connue

Message « Cet exercice n'a pas de mesure : tu pourras seulement le cocher comme fait. »

## Réponses API attendues

Validation dans la route de l'US-23 :

- Valeur hors bornes ou de mauvais type : `400`
- Mesure non prévue pour l'exercice : `422`, code `MEASURE_NOT_ALLOWED`, avec le nom de l'exercice et la mesure

## Décisions

- **D-02** : les profils « chaque côté » (A7e, A7f) sont traités par l'US-51.

## Hors périmètre

- Profils « chaque côté » et « durée chaque côté » (US-51).
- Conversion lb / mi (US-05).
- Minuteur pendant la séance (US-49).

## Tâches techniques

- [x] BDD : `planned_set` : `reps`, `weight_kg`, `duration_seconds`, `distance_meters`, `speed_kmh`, `resistance`, `incline_percent`, `calories`, `rest_after_seconds` ; `template_block_exercise.default_rest_seconds`
- [x] Backend : `exerciseRepository.readExerciseMeasureCodes(ids)` (avec `query`) : `SELECT em.exercise_id, m.code FROM exercise_measure em JOIN measure m ON m.id = em.measure_id WHERE em.exercise_id IN (?)`
- [x] Shared : `getSetFields(measureCodes)` : liste des champs à afficher, utilisée par le client et par le serveur
- [x] Shared : `getMeasureProfile(measureCodes)` : `weighted`, `bodyweight`, `duration`, `cardio`
- [x] Shared : `formatSetSummary(sets, profile)` (« 3 séries · 8 rép. · 10 kg lest », « 3 étapes »)
- [x] Shared : `formatDuration(seconds)` (« 1 min 30 », « 45 s ») et `parseMinSec("1:30")`
- [x] Shared : bornes de `PlannedSetValues` dans `sessionDraftSchema` (charge : multiple de 0,25)
- [x] Frontend : `components/SetConfigurator.tsx` choisit `RepsWeightFields`, `BodyweightFields` (lest), `DurationFields`, `CardioStepFields` selon le profil
- [x] Frontend : `components/NumberField.tsx` (`inputMode="decimal"` ou `numeric`, message d'erreur lié par `aria-describedby`)
- [x] Frontend : `components/RestInput.tsx` (minutes + secondes)
- [x] Tests : unitaires : `getSetFields` et `getMeasureProfile` pour chaque profil ; `formatSetSummary` ; `parseMinSec`
- [ ] Tests : back (dans US-23) : durée sur un exercice à répétitions → 422 ; valeur négative → 400 ; charge 40,3 → 400
- [x] Tests : E2E : configurer un exercice de chaque profil ; axe sur A7a à A7d

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement pour les 4 profils
- [ ] Clavier numérique sur mobile vérifié
- [ ] Code relu et fusionné via pull request
