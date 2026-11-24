# US-29 · Valider une série

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-28
**Intégration future :** US-30 (repos lancé après validation), US-34 (résumé), US-37 (correction après coup), US-49 (minuteur)
**Branche :** `feat/us-29-validate-set`
**Maquettes :** B3a, B3b, B5a, B5f (B5g, B5h : US-51)
**Règles :** RM-024, RM-041, RM-044, RM-049, RM-065

## User story

En tant qu'utilisateur, je veux enregistrer ce que j'ai réellement fait sur chaque série afin de suivre ma performance.

## Pourquoi

C'est le cœur de l'appli à la salle : un appui quand on a fait comme prévu, quelques appuis quand on a fait autrement.

## Règles métier

- L'ordre est libre : on choisit l'exercice et la série (RM-024).
- Les valeurs prévues s'affichent en lecture seule ; seul le réalisé est saisi (RM-041).
- « Valider » sans modifier enregistre le prévu comme réalisé (fait comme prévu = 1 appui).
- « Modifier » ouvre le panneau « Ce que tu as réellement fait », avec − / + et le prévu à côté.
- Une série dont toutes les valeurs sont vides ou à 0 est refusée.
- Seules les mesures de l'exercice sont acceptées (RM-010).
- La série est enregistrée tout de suite (RM-044).
- Une série déjà validée peut être revalidée pendant la séance ; sa **première** date de validation est conservée (RM-049).
- Chaque validation met à jour l'heure de dernière activité de la séance (pour la clôture après 4 h, RM-065).
- On ne valide une série que dans une séance en cours.

## Critères d'acceptation

- Toucher un exercice dans B2 ouvre B3 : « Exercice 1 / 6 · repos 1 min 30 s ».
- Les séries validées affichent « ✓ Série 1 · 10 rép. · 40 kg ».
- La série en cours affiche les valeurs prévues en gros et « Valider la série 2 ».
- Les séries suivantes affichent « Série 3 · prévu 10 rép. · 40 kg » et « Faire ».
- « Valider la série 2 » enregistre la série et lance le repos (US-30).
- « Modifier » ouvre le panneau : Répétitions · prévu 10, Charge (kg) · prévu 40, avec − / + ; « Valider » enregistre et lance le repos ; « Annuler » ne change rien.
- Poids du corps : le lest prévu s'affiche comme une valeur (« 8 rép. · 10 kg lest »).
- Cardio : sans chrono en MVP, « Valider l'étape » ouvre le relevé de la machine pré-rempli avec le prévu (Durée, Distance, Vitesse moy., Inclinaison moy., Calories).
- « Suivant : Tractions › » passe à l'exercice suivant ; « ‹ Exercices » revient à B2.
- Le compteur « Séries réalisées » et « 1 / 3 séries » se mettent à jour tout de suite.
- En cas d'échec réseau, la série revient à son état précédent et un message s'affiche.

## Éléments affichés

**En-tête :** ‹ Exercices · Développé couché · Exercice 1 / 6 · repos 1 min 30 s
**Série validée :** ✓ Série 1 · 10 rép. · 40 kg
**Série en cours :** SÉRIE 2 · 10 rép. · 40 kg · bouton « Valider la série 2 » · lien « Modifier »
**Série à venir :** Série 3 · prévu 10 rép. · 40 kg · « Faire »
**Bas :** Suivant : Tractions ›

### Panneau « Modifier »
**Titre :** Ce que tu as réellement fait · Série 2
**Champs :** Répétitions · prévu 10 · Charge (kg) · prévu 40 (boutons − / +)
**Actions :** Valider · Annuler

### Relevé cardio
**Titre :** Étape 2 · Durée · Distance (km) · Vitesse moy. (km/h) · Inclinaison moy. (%) · Calories · « Valider l'étape 2 »

**Série vide :** « Indique au moins une valeur pour valider la série. »
**Erreur :** « La série n'a pas été enregistrée. Réessaie. »

## États à gérer

### Validation en cours
Bouton désactivé ; la série passe tout de suite en « validée » (affichage optimiste).

### Erreur API
Retour à l'état précédent + message + « Réessayer ».

### Séance clôturée entre-temps (4 h)
Message de RM-065 et retour au résumé.

## Réponses API attendues

- Série enregistrée : `200` + série à jour
- Valeurs invalides : `400`
- Série absente ou d'un autre : `404`
- Séance qui n'est plus en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`
- Mesure non prévue : `422`, code `MEASURE_NOT_ALLOWED`
- Série vide : `422`, code `EMPTY_SET`

## Décisions

- **D-02** : la saisie gauche / droite (B5g, B5h) est traitée par l'US-51.

## Hors périmètre

- Minuteur de durée et chrono cardio (US-49) : en MVP, la durée se saisit à la main.
- Ajouter une série ou un exercice (US-32).
- Corriger après la fin de la séance (US-37).

## Tâches techniques
- [ ] Backend : `workoutSessionRepository.readWorkoutSetContext(setId, userId)` : série + statut de la séance + `exercise_id` (jointures `workout_exercise` → `workout_block` → `workout_session`, `WHERE wset.id = ? AND ws.owner_user_id = ?`)
- [ ] Backend : `updateWorkoutSetActual(setId, values)` : met à jour les 8 colonnes `_actual` et `validated_at = COALESCE(validated_at, NOW(3))` ; **jamais** les colonnes `_planned`
- [ ] Backend : `touchWorkoutSession(id)` : `UPDATE workout_session SET last_activity_at = NOW(3) WHERE id = ?`
- [ ] Backend : `workoutSessionActions.validateSet` dans `withTransaction` : contexte → 404 / 409 → mesures autorisées (`readExerciseMeasureCodes`) → série non vide → mise à jour → `touch` → 200
- [ ] Backend : `PUT /api/workout-sets/:id` → `checkOrigin` → `authenticate` → `validate` → action
- [ ] Shared : `actualSetSchema` (mêmes bornes que le prévu) ; `isEmptySet(values)` ; `getSetGap(set)` (« ▲ 2,5 kg », « ▼ 1 rép. », « = ») ; `isObjectiveReached(set)`
- [ ] Frontend : `workoutSessionService.validateSet(id, values)`
- [ ] Frontend : `hooks/useValidateSet.ts` (affichage optimiste + retour arrière)
- [ ] Frontend : `pages/WorkoutExercisePage.tsx` (B3), `components/SetRow.tsx`, `components/ActualSetSheet.tsx` (panneau Modifier avec − / +), `components/CardioReadingSheet.tsx` (B5f)
- [ ] Frontend : `components/Stepper.tsx` (− / + avec pas adapté : 1 rép., 2,5 kg, 15 s ; libellés « Diminuer », « Augmenter »)
- [ ] Tests : unitaires : `isEmptySet`, `getSetGap`, `isObjectiveReached` (répétitions, charge, durée, valeurs vides)
- [ ] Tests : back : validation ; revalidation garde la 1ʳᵉ date ; série vide → 422 ; durée sur exercice à répétitions → 422 ; séance terminée → 409 ; série d'un autre → 404 ; `last_activity_at` avance ; colonnes `_planned` inchangées
- [ ] Tests : front : 1 appui = prévu enregistré ; Modifier → valeurs saisies ; retour arrière sur erreur
- [ ] Tests : E2E : valider 3 séries d'un exercice, puis passer au suivant ; axe sur B3 et le panneau

## Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Zones − / + d'au moins 44 px, utilisables d'une main
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
