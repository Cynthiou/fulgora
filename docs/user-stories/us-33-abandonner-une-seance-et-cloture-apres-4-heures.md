# US-33 · Abandonner une séance (et clôture après 4 heures)

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-28, T-04 (colonne `auto_closed`)
**Intégration future :** US-35 (historique : « Inachevée »), US-37 (corriger les résultats)
**Branche :** `feat/us-33-abandon-workout`
**Maquettes :** B2 (bouton Abandonner), CAL-07d
**Règles :** RM-044, RM-045, RM-065, DT-18

## User story

En tant qu'utilisateur, je veux arrêter une séance avant la fin afin de ne pas la laisser ouverte, sans perdre ce que j'ai déjà fait.

## Pourquoi

On peut devoir partir de la salle avant la fin. Les séries faites sont du vrai travail : elles restent dans l'historique.

## Règles métier

- Abandonner passe la séance en « inachevée » (`unfinished`), définitivement ; les séries validées sont gardées (RM-045).
- Le rendez-vous reste « effectué » (`attended`).
- Une séance inachevée ne se reprend jamais ; ses résultats pourront être corrigés (US-37).
- Une séance sans aucune action pendant 4 heures est clôturée automatiquement de la même façon (RM-065) ; l'heure de fin enregistrée est celle de la dernière action.
- Une tâche du serveur vérifie toutes les 5 minutes ; elle ne clôture que les séances encore en cours (DT-18).
- Une séance clôturée automatiquement est marquée (`auto_closed`), pour afficher le bon message.

## Critères d'acceptation

- « Abandonner » dans B2 ouvre une confirmation.
- « Continuer ma séance » ferme la confirmation sans rien changer.
- « Abandonner » passe la séance en inachevée et mène au résumé (US-34) avec l'étiquette « INACHEVÉE ».
- Les séries validées sont intactes ; les autres restent sans valeur réalisée.
- Abandonner une séance déjà terminée est refusé.
- Après 4 h sans action, la séance est clôturée ; à la prochaine ouverture, le message de RM-065 s'affiche avec « Voir le résumé » (et « Corriger les résultats » quand l'US-37 sera faite).
- Une séance avec une action il y a 3 h 59 n'est pas clôturée.

## Éléments affichés

### Confirmation

**Titre :** Abandonner cette séance ?
**Message :** Tes séries faites seront gardées dans ton historique. Tu ne pourras pas reprendre cette séance.
**Actions :** « Abandonner » · « Continuer ma séance »

### Clôture automatique (RM-065)

**Message :** Cette séance a été clôturée après 4 heures sans activité. Tes résultats ont été conservés.
**Boutons :** Voir le résumé · Corriger les résultats (US-37)

**Erreur :** « Impossible d'abandonner la séance. Réessaie. » + « Réessayer »

## États à gérer

### Confirmation annulée

Aucune requête, la séance continue.

### Abandon en cours

Boutons désactivés.

### Erreur API

Message + « Réessayer » ; l'état réel est rechargé (déjà inachevée → résumé).

## Réponses API attendues

- Abandon réussi : `200` + résumé
- Séance absente ou d'un autre : `404`
- Séance qui n'est pas en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`

## Décisions

- **D-09** : un abandon sans aucune série validée applique RM-045 telle quelle : la séance devient « inachevée », sans résultat.

## Hors périmètre

- Corriger les résultats (US-37).
- Reprendre une séance inachevée (interdit par RM-045).

## Tâches techniques

- [x] BDD : `workout_session.auto_closed` (migration 004)
- [x] Backend : `workoutSessionRepository.abandonWorkoutSession(id, userId)` : `UPDATE workout_session SET status = 'unfinished', ended_at = NOW(3) WHERE id = ? AND owner_user_id = ? AND status = 'in_progress'`
- [x] Backend : action : 0 ligne modifiée → relire la séance → absente : 404, sinon 409
- [x] Backend : `closeInactiveWorkoutSessions()` : `UPDATE workout_session SET status = 'unfinished', ended_at = last_activity_at, auto_closed = TRUE WHERE status = 'in_progress' AND last_activity_at < NOW(3) - INTERVAL 4 HOUR`
- [x] Backend : `main.ts` : `setInterval(closeInactiveWorkoutSessions, 5 * 60 * 1000)`, jamais démarré pendant les tests ; erreurs loguées sans arrêter le serveur
- [x] Backend : `POST /api/workout-sessions/:id/abandon` → `checkOrigin` → `authenticate` → `validate({ params })` → action
- [x] Frontend : `workoutSessionService.abandonWorkoutSession(id)`
- [x] Frontend : `components/AbandonWorkoutDialog.tsx` ; `components/AutoClosedNotice.tsx`
- [x] Tests : back : abandon → `unfinished`, séries gardées, rendez-vous `attended` ; 2ᵉ abandon → 409 ; séance d'un autre → 404
- [x] Tests : back : `closeInactiveWorkoutSessions` avec une séance à 3 h 59 (non touchée) et une à 4 h 01 (clôturée, `ended_at = last_activity_at`, `auto_closed = TRUE`)
- [x] Tests : E2E : abandonner après 2 séries → résumé « INACHEVÉE »

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [x] Modale accessible (focus piégé, Échap = continuer)
- [ ] Code relu et fusionné via pull request
