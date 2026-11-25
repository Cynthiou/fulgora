# US-34 · Terminer une séance

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-29
**Intégration future :** US-36 (détail dans l'historique), US-37 (corriger), US-40 (records)
**Branche :** `feat/us-34-complete-workout`
**Maquettes :** B6
**Règles :** RM-046, RM-051

## User story

En tant qu'utilisateur, je veux terminer ma séance afin de voir mon résumé.

## Pourquoi

Le résumé, c'est la récompense : durée, séries faites, volume soulevé.

## Règles métier

- Terminer passe la séance en « terminée » (`completed`) et enregistre l'heure de fin.
- Des séries peuvent rester non faites ; elles n'ont pas de date de validation (RM-046).
- Le résumé est calculé à partir des résultats, rien n'est stocké en plus (RM-051) :
  - durée = fin − début ;
  - séries = validées / prévues ;
  - volume = somme de répétitions × charge des séries validées (un exercice sans charge compte 0).
- Le résumé de chaque exercice indique les séries faites / prévues et les valeurs réalisées.

## Critères d'acceptation

- « Terminer la séance » ouvre une confirmation qui indique le nombre de séries non faites.
- Après confirmation, le résumé B6 s'affiche : nom, date, « ✓ TERMINÉE », durée, « 17 / 18 séries », volume.
- Chaque exercice affiche « 3 / 3 · 10, 8, 10 rép. » ou, pour une série incomplète, « 2 / 3 · série 3 non faite ».
- « Retour au planning » ramène au Planning sur le jour de la séance.
- Une séance déjà terminée ne peut pas être terminée une 2ᵉ fois.
- Le même résumé s'affiche (avec « INACHEVÉE ») après un abandon (US-33).

## Éléments affichés

### Confirmation

**Titre :** Terminer la séance ?
**Message :** 1 série n'est pas faite. Elle restera non faite dans ton historique.
**Actions :** « Terminer » · « Continuer ma séance »

### Résumé (B6)

**Titre :** Résumé · Haut du corps · jeudi 26 novembre
**Étiquette :** ✓ TERMINÉE (ou INACHEVÉE)
**Chiffres :** 48 min · 17 / 18 séries · 3 240 kg volume
**Exercice :** Développé couché · 3 / 3 · 10, 8, 10 rép.
**Boutons :** Corriger les résultats (US-37, masqué en MVP) · Retour au planning

## États à gérer

### Terminaison en cours

Boutons désactivés.

### Erreur API

Message « Impossible de terminer la séance. Réessaie. » + « Réessayer » ; l'état réel est rechargé.

### Aucune série validée

Voir À PRÉCISER.

## Réponses API attendues

- Séance terminée : `200` + résumé
- Séance absente ou d'un autre : `404`
- Séance qui n'est pas en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`

## Décisions

- **D-10** : terminer sans aucune série validée est refusé (`422`, code `NO_VALIDATED_SET`, message « Aucune série n'est faite. Tu peux abandonner la séance. ») avec le bouton « Abandonner ».

## Hors périmètre

- Corriger les résultats (US-37).
- Détection et notification des records (US-40).

## Tâches techniques

- [ ] Backend : `workoutSessionRepository.completeWorkoutSession(id, userId)` : même forme que l'abandon avec `status = 'completed'`
- [ ] Backend : `workoutSessionActions.complete` : 0 ligne → 404 / 409 ; sinon relire l'arbre et renvoyer le résumé
- [ ] Backend : `POST /api/workout-sessions/:id/complete`
- [ ] Shared : `computeDurationSeconds(startedAt, endedAt)`, `computeTonnage(sets)`, `countValidatedSets`, `countPlannedSets`, `formatExerciseResult(sets, profile)` (« 3 / 3 · 10, 8, 10 rép. »)
- [ ] Frontend : `workoutSessionService.completeWorkoutSession(id)`
- [ ] Frontend : `components/CompleteWorkoutDialog.tsx`, `pages/WorkoutSummaryPage.tsx` (B6, sert aussi après un abandon)
- [ ] Routing : `/entrainement/:id/resume`
- [ ] Tests : unitaires : `computeTonnage` (séries non validées ignorées, sans charge, décimales 62,5), `computeDurationSeconds`, `formatExerciseResult`
- [ ] Tests : back : terminer avec des séries non faites → 200, leur `validated_at` reste vide ; 2ᵉ terminaison → 409 ; d'un autre → 404
- [ ] Tests : E2E : séance complète → résumé avec les bons chiffres ; axe sur B6

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Chiffres du résumé vérifiés à la main sur un exemple
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
