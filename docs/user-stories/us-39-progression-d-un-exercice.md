# US-39 · Progression d'un exercice

EPIC 8 · Progression

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-34, US-35
**Intégration future :** US-40 (records), US-09 (lien « Ma progression »)
**Branche :** `feat/us-39-exercise-progress`
**Maquettes :** SUI-08, SUI-09, SUI-10, SUI-10b, SUI-11
**Règles :** RM-051, RM-079, RM-081

## User story

En tant qu'utilisateur, je veux voir l'évolution de chaque exercice afin de constater mes progrès.

## Pourquoi

« Est-ce que je progresse au squat ? » est la question qu'on se pose le plus.

## Ce qui change

L'onglet « Exercices » du Suivi apparaît ; la fiche exercice affiche le lien « Ma progression ».

## Règles métier

- Calculée à partir des séries réellement faites (RM-051).
- La liste montre les exercices déjà réalisés, classés par dernière fois, avec une recherche.
- La mesure suivie dépend de l'exercice : charge max ou 1RM estimée (avec charge), répétitions max (poids du corps), durée max (maintien), distance, durée ou vitesse (cardio) ; seules les mesures saisies sont proposées.
- 1RM estimée : formule d'Epley, `charge × (1 + répétitions / 30)`, seulement sur les séries de 10 répétitions ou moins, toujours affichée « (estimation) » (RM-079).
- La courbe apparaît à partir de 2 séances ; une séance manquée n'est pas un point ; une séance inachevée est un point en pointillé (RM-081).
- Avec un lest saisi, la charge s'ajoute comme pour un exercice avec charge.

## Critères d'acceptation

- SUI-08 : recherche, chaque exercice avec son meilleur résultat et « Dernière fois le 19 nov. ».
- SUI-09 : boutons « Charge max » / « 1RM estimée » qui changent la courbe ; légende « De 50 kg à 62,5 kg en 2 séances » ; blocs de records ; « Dernières séances » qui ouvrent SUI-06.
- SUI-10 : « Répétitions max » ; pas de tonnage ni de 1RM.
- SUI-10b : une seule séance → « Une seule séance pour l'instant », « La courbe apparaîtra dès la 2ᵉ séance. »
- SUI-11 : Distance / Durée / Vitesse ; point pointillé pour la Course inachevée du 7.
- La courbe est aussi lisible sans graphique (tableau des points ou résumé texte pour les lecteurs d'écran).

## Éléments affichés

**SUI-09 :** Charge max · 1RM estimée · « De 50 kg à 62,5 kg en 2 séances » · Charge max 62,5 kg × 8 · 1RM estimée 79 kg (estimation) · Meilleur volume sur une série 8 × 62,5 = 500 kg · Meilleur volume sur une séance 1 760 kg · Plus de répétitions 8 rép. · Séances 2 · Dernières séances
**SUI-10b :** « Une seule séance pour l'instant » · « La courbe apparaîtra dès la 2ᵉ séance. »
**Note 1RM :** « 1RM estimée (formule d'Epley) à partir des séries de 10 répétitions ou moins. »

## États à gérer

### Aucun exercice réalisé

« Tes exercices apparaîtront ici après ta première séance. »

### Chargement / Erreur

Comme les autres écrans du Suivi.

## Réponses API attendues

- `GET /api/progress/exercises?search=` : `200`
- `GET /api/progress/exercises/:id` : `200` ; exercice jamais fait : `200` avec liste vide ; exercice d'un autre : `404`

## Hors périmètre

- Records dans le Résumé et notifications (US-40).

## Tâches techniques

- [x] Backend : `progressRepository.readDoneExercises(userId, search)` (dernière date, groupé par exercice) ; `readExerciseSets(userId, exerciseId)` : séries validées des séances `completed` / `unfinished`, avec date réelle et statut de séance
- [x] Shared : `estimateOneRepMax(weight, reps)` (Epley, `null` au-delà de 10 rép.), `buildProgressSeries(sets, metric)` (un point par séance, `isPartial` si inachevée), `computeExerciseRecords(sets, profile)`, `getAvailableMetrics(sets)`
- [x] Outillage : courbe dessinée à la main en SVG (pas de bibliothèque) avec son équivalent texte
- [x] Frontend : `ExerciseProgressListPage.tsx` (SUI-08), `ExerciseProgressPage.tsx` (SUI-09 à SUI-11), `ProgressChart.tsx`, `RecordGrid.tsx`
- [x] Tests : unitaires Epley (62,5 × 8 = 79,2), séries > 10 rép. ignorées, série unique, point inachevé ; back : séances d'un autre exclues
- [x] Tests : E2E fiche → « Ma progression »

## Definition of Done

- [x] Chiffres de SUI-09 retrouvés sur les données d'exemple
- [x] Graphique doublé d'un équivalent texte
- [ ] Code relu et fusionné via pull request
