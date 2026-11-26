# US-51 · Exercices « chaque côté » (gauche / droite)

EPIC 3 · Séances modèles

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-15, US-29, US-49
**Intégration future :** US-39 (progression), US-50 (muscles)
**Branche :** `feat/us-51-per-side-exercises`
**Maquettes :** A7e, A7f, B5g, B5h, B6
**Règles :** RM-010, RM-022, RM-041, RM-044

## User story

En tant qu'utilisateur, je veux préparer et faire un exercice côté par côté afin de suivre chaque côté séparément, par exemple après une blessure.

## Pourquoi

Un curl à un bras, une fente, un gainage latéral se font gauche puis droite. Après une blessure ou avec un déséquilibre, la charge n'est pas la même des deux côtés.

## Ce qui change

Les écrans A7e, A7f, B5g et B5h, laissés de côté par les US-15, US-29 et US-49, sont développés ici. Le modèle de données reprend la maquette (décision par défaut D-02).

## Règles métier

- « Chaque côté » se règle par exercice dans la séance préparée (désactivé par défaut).
- L'objectif de répétitions (ou de durée) est **le même** des deux côtés.
- « Même charge des deux côtés » est activé par défaut (un seul champ Charge) ; désactivé, on règle une charge gauche et une charge droite.
- Pendant la séance, gauche et droite se saisissent séparément ; la série n'est validée que quand les deux côtés sont renseignés.
- Durée chaque côté : minuteur gauche, puis droite (US-49).
- Abandon entre les deux côtés : le côté fait est gardé, la série reste incomplète.
- Tonnage d'une série = (rép. gauche × charge gauche) + (rép. droite × charge droite).
- Pour les muscles (US-50), une série « chaque côté » compte comme **une** série.
- Les records se calculent côté par côté.

## Critères d'acceptation

- A7e : l'interrupteur « Chaque côté », « Même charge des deux côtés » et, s'il est désactivé, « Charge gauche (kg) » et « Charge droite (kg) » ; résumé « 15 rép. / côté · G 10 · D 6 kg ».
- A7f : « Durée / côté (min:s) » ; résumé « 30 s / côté ».
- B5g : GAUCHE et DROITE côte à côte, chacun avec ses valeurs ; « Modifier » ouvre les 4 champs ; la série se valide quand les deux sont renseignés.
- B5h : « SÉRIE 1 · CÔTÉ DROIT », « Gauche : 30 s ✓ », minuteur du côté en cours.
- B6 : « 3 / 3 · G 15 / D 13 … » ; une série incomplète affiche « série 3 incomplète : gauche 30 s, droite non faite ».
- Le détail de l'historique affiche les deux côtés.

## Éléments affichés

**A7e :** Chaque côté · « Gauche puis droite, même objectif pour chaque côté » · Même charge des deux côtés · « Désactive pour une charge par côté (blessure, déséquilibre) » · Rép. / côté · Charge gauche (kg) · Charge droite (kg)
**A7f :** Durée / côté (min:s) · « Pendant la séance : minuteur gauche, puis droite. Vaut aussi pour les étirements. »
**B5g :** GAUCHE · DROITE · « Série 2 · prévu 15 rép. / côté · G 10 · D 6 kg »
**B5h :** SÉRIE 1 · CÔTÉ DROIT · « Gauche : 30 s ✓ »

## États à gérer

### Un seul côté fait

Série « incomplète », côté fait enregistré.

### Abandon entre les deux côtés

Le côté fait reste ; la série compte comme non faite dans « séries réalisées ».

## Réponses API attendues

- Côté enregistré : `PUT /api/workout-sets/:id/sides/:side` → `200` (+ `is_validated` quand les deux côtés sont faits)
- Côté inconnu : `400` ; exercice qui n'est pas « chaque côté » : `422`

## Décisions

- **D-02 (US-51)** : modèle repris de la maquette : réglage par exercice dans la séance, même objectif de répétitions ou de durée, charge éventuellement différente par côté, résultats enregistrés côté par côté.

## Hors périmètre

- Objectif de répétitions différent par côté (non prévu par la maquette).

## Tâches techniques

- [x] BDD : migration 005 : `template_block_exercise.is_per_side BOOLEAN NOT NULL DEFAULT FALSE` ; `planned_set.weight_left_kg` et `weight_right_kg DECIMAL(9,3) NULL` ; mêmes colonnes copiées dans `workout_exercise.is_per_side`, `workout_set.weight_left_planned_kg`, `weight_right_planned_kg`
- [x] BDD : table `workout_set_side (workout_set_id, side ENUM('left','right'), reps_actual, weight_actual_kg, duration_actual_seconds, validated_at, PRIMARY KEY (workout_set_id, side))`, clé étrangère vers `workout_set` en `RESTRICT`
- [x] Shared : `sessionDraftSchema` : `is_per_side`, charges gauche / droite (seulement si `is_per_side`) ; `computeTonnage` et `formatSetSummary` gèrent les deux côtés
- [x] Backend : copie au démarrage (US-28) étendue aux nouvelles colonnes ; `upsertWorkoutSetSide` (`INSERT … ON DUPLICATE KEY UPDATE`) ; la série passe `validated_at` quand les deux côtés existent
- [x] Backend : suppression d'un compte (US-06) étendue à `workout_set_side` (fait avec l'US-06)
- [x] Frontend : `PerSideFields.tsx` (A7e, A7f), `PerSideSetEntry.tsx` (B5g), `PerSideDurationTimer.tsx` (B5h)
- [x] Tests : back : un côté → série non validée ; deux côtés → validée ; tonnage G / D ; abandon après le côté gauche ; unitaires `computeTonnage` côté par côté
- [x] Tests : E2E curl à charge différente G / D

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Code relu et fusionné via pull request
