# US-32 · Ajouter un exercice ou une série en cours de séance

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-29, US-14
**Intégration future :** US-37 (provenance des éléments ajoutés)
**Branche :** `feat/us-32-add-during-workout`
**Maquettes :** B2 (« Ajouter un exercice ou un bloc », « Ajouter une série »), B6 (« supplémentaires »), B5d (« Ajouter une étape »)
**Règles :** RM-043, RM-048

## User story

En tant qu'utilisateur, je veux ajouter un exercice ou une série pendant ma séance afin de m'adapter sur le moment.

## Pourquoi

Une machine prise, une bonne forme du jour : la séance réelle s'écarte du prévu.

## Règles métier

- On peut ajouter une série à un exercice, un exercice dans un bloc, ou un nouveau bloc.
- Le prévu n'est jamais modifié ni supprimé (RM-043).
- Un élément ajouté n'a pas de « prévu » ; il est marqué comme ajouté (provenance vide).
- Seuls les éléments ajoutés peuvent être supprimés, pendant la séance comme après (RM-048).
- Le résumé compte les séries « supplémentaires » à part.

## Critères d'acceptation

- « Ajouter une série » ajoute une série vide à l'exercice ouvert.
- « Ajouter un exercice ou un bloc » ouvre le catalogue en mode sélection, puis ajoute à la fin du bloc choisi ou dans un nouveau bloc.
- Un élément ajouté affiche « Ajouté » et peut être retiré ; un élément prévu n'a pas de « Retirer ».
- Le résumé B6 affiche « Séries prévues réalisées, non faites, supplémentaires ».

## Éléments affichés

**Boutons :** Ajouter une série · Ajouter une étape · Ajouter un exercice ou un bloc
**Étiquette :** Ajouté
**Résumé :** « 2 séries supplémentaires »

## États à gérer

### Ajout en cours
Bouton désactivé.

## Réponses API attendues

- Ajouté : `201`
- Retirer un élément prévu : `422`, code `PLANNED_ITEM_NOT_REMOVABLE`
- Séance pas en cours : `409`

## Hors périmètre

- Modifier le prévu (US-17).

## Tâches techniques
- [ ] BDD : provenance par les colonnes `source_*` à `NULL` (D-18)
- [ ] Backend : `createWorkoutSet`, `createWorkoutExercise`, `createWorkoutBlock` (positions = max + 1), `deleteAddedWorkoutSet` (seulement si `source_planned_set_id IS NULL`)
- [ ] Backend : `POST /api/workout-sessions/:id/blocks`, `POST /api/workout-blocks/:id/exercises`, `POST /api/workout-exercises/:id/sets`, `DELETE /api/workout-sets/:id`
- [ ] Frontend : boutons dans B2 et B3, réutilisation du mode sélection du catalogue
- [ ] Tests : back : ajout, suppression d'un ajouté, refus sur un prévu, séance terminée → 409

## Definition of Done
- [ ] Code relu et fusionné via pull request
