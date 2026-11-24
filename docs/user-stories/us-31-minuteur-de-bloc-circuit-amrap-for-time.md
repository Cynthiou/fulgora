# US-31 · Minuteur de bloc (Circuit, AMRAP, For Time)

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-43, US-49
**Intégration future :** US-36 (affichage des tours)
**Branche :** `feat/us-31-block-timer`
**Maquettes :** non maquetté pour l'exécution (voir À PRÉCISER)
**Règles :** RM-042

## User story

En tant qu'utilisateur, je veux un minuteur adapté aux blocs Circuit, AMRAP et For Time afin de suivre leur format.

## Pourquoi

Un AMRAP de 12 minutes se joue contre la montre : il faut le temps et le compte des tours.

## Règles métier

- Le minuteur de bloc ne démarre jamais tout seul avec la séance (RM-042) : bouton « Lancer le bloc ».
- AMRAP : décompte de la durée fixe ; on note les tours terminés et les répétitions en plus.
- For Time : chrono qui monte jusqu'à « Terminé » ; durée limite facultative.
- Circuit : compteur de tours prévu / fait.
- Résultats du bloc : `completed_rounds`, `extra_reps`, `actual_duration_seconds`.

## Critères d'acceptation

- Un bloc chronométré affiche « Lancer le bloc » ; le minuteur suit le type.
- « + 1 tour » incrémente les tours ; les répétitions en plus se saisissent à la fin.
- À la fin, le résultat du bloc est enregistré et visible dans le résumé.

## Éléments affichés

**Bloc :** AMRAP · 12 min · Lancer le bloc · « + 1 tour » · Terminer le bloc
**Résumé :** « AMRAP · 5 tours + 8 rép. » · « For Time · 14:32 » · « Circuit · 3 / 3 tours »

## États à gérer

### Bloc en cours
Les autres blocs restent accessibles.

## Réponses API attendues

- Résultat enregistré : `PUT /api/workout-blocks/:id` → `200`
- Séance pas en cours : `409`

## Décisions

- **D-06** : un simple total par bloc (tours terminés, répétitions en plus, durée).
- **D-15** : écrans d'exécution à faire maquetter en première tâche.

## Hors périmètre

- Saisie série par série dans un bloc chronométré.

## Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Backend : `updateWorkoutBlockResult(blockId, rounds, extraReps, duration)` (contexte vérifié comme pour une série, `touchWorkoutSession`)
- [ ] Frontend : `BlockTimer.tsx` selon le type ; réutilisation de `useCountdown` / `useStopwatch`
- [ ] Tests : back : résultat enregistré, séance terminée → 409 ; unitaires du compteur de tours

## Definition of Done
- [ ] Écrans maquettés et validés avant le développement
- [ ] Code relu et fusionné via pull request
