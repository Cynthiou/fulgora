# US-21 · Raccourcir, abandonner ou supprimer un programme

EPIC 4 · Programmes

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-20
**Intégration future :** US-22
**Branche :** `feat/us-21-stop-program`
**Maquettes :** PRO-07b, PRO-07c2, PRO-07d, PRO-08 (fin avancée), PRO-11, PRO-11b, PRO-11c, PRO-13
**Règles :** RM-033, RM-034, RM-035, RM-073, DT-25

## User story

En tant qu'utilisateur, je veux raccourcir, abandonner ou supprimer un programme afin d'arrêter un cycle qui ne me convient plus.

## Pourquoi

Une blessure, un changement d'objectif : il faut pouvoir arrêter sans perdre ce qui a été fait.

## Règles métier

- **Raccourcir** (fin avancée dans PRO-08) : les rendez-vous planifiés après la nouvelle fin sont annulés, même déplacés à la main ; la liste est affichée avant confirmation (RM-033).
- **Abandonner** : proposé dès qu'au moins une séance du programme a été démarrée (même sans série validée) ; les rendez-vous à venir planifiés passent en « annulée » (y compris aujourd'hui s'il n'a pas commencé) ; le passé, les résultats et les manquées sont conservés ; statut « Abandonné » avec sa date.
- Abandon interdit si une séance du programme est en cours (RM-034).
- **Supprimer** : proposé seulement si aucune séance n'a jamais été démarrée ; supprime le programme, ses rendez-vous, ses règles, son historique de changements, ses notifications et les séances préparées qu'aucun autre programme ni rendez-vous n'utilise, dans une transaction (RM-073, DT-25).
- Le menu affiche « Abandonner » **ou** « Supprimer », jamais les deux.
- Un brouillon se supprime directement après confirmation.
- Les rendez-vous annulés restent dans l'historique (RM-035).

## Critères d'acceptation

- PRO-11 : « Abandonner « Force 8 semaines » ? », la liste des séances à venir qui seront annulées et « Tes 3 séances passées et leurs résultats sont conservés. » ; « Abandonner » → PRO-13 « ABANDONNÉ » ; « Garder le programme » → PRO-07.
- PRO-11b : avec une séance en cours, l'abandon est refusé avec « Reprendre ».
- PRO-11c : « Supprimer « Hypertrophie 6 semaines » ? Ses 24 séances prévues seront supprimées définitivement. » ; après suppression, plus rien dans le Planning.
- PRO-07d : une séance faite en avance fait disparaître « Supprimer » au profit d'« Abandonner ».
- Raccourcir : les rendez-vous au-delà de la nouvelle fin sont listés comme annulés avant de valider.

## Éléments affichés

**PRO-11 :** Abandonner « Force 8 semaines » ? · « Les 5 séances à venir (26 nov., 3, 10, 17 et 25 déc.) seront annulées. » · « Tes 3 séances passées et leurs résultats sont conservés. » · Abandonner · Garder le programme
**PRO-11b :** Abandon impossible · « La séance « Jambes » de ce programme est en cours depuis 07:04. » · « Termine-la ou abandonne-la d'abord. » · Reprendre
**PRO-11c :** Supprimer « Hypertrophie 6 semaines » ? · « Ses 24 séances prévues seront supprimées définitivement. » · Supprimer · Garder

## États à gérer

### Action en cours

Boutons désactivés.

### Erreur

Message, programme inchangé.

## Réponses API attendues

- Abandonné : `200` ; supprimé : `204`
- Séance en cours : `409`, code `PROGRAM_HAS_WORKOUT_IN_PROGRESS`
- Suppression alors qu'une séance a été démarrée : `409`, code `PROGRAM_HAS_STARTED_SESSIONS`
- Abandon alors qu'aucune séance n'a été démarrée : `409`, code `USE_DELETE_INSTEAD`

## Hors périmètre

- Réutiliser (US-22).

## Tâches techniques

- [ ] BDD : `appointment.cancelled_at` (migration 002)
- [ ] Backend : `countProgramStartedSessions(programId)`, `readProgramInProgressSession(programId)`
- [ ] Backend : `cancelFutureProgramAppointments(programId, today)` : `UPDATE appointment SET status = 'cancelled', cancelled_at = NOW(3) WHERE program_id = ? AND status = 'planned' AND planned_date >= ? AND id NOT IN (SELECT appointment_id FROM workout_session)`
- [ ] Backend : suppression DT-25 : `deleteProgramNotifications`, `deleteProgramAppointments`, `deleteProgramSchedules`, `deleteProgramChanges`, `deleteProgram`, puis séances orphelines (`planned_set` → `template_block_exercise` → `template_block` → `session_version` → `session_template`) ; vérification préalable « aucune séance réalisée » dans la même transaction
- [ ] Backend : `POST /api/programs/:id/abandon`, `DELETE /api/programs/:id`
- [ ] Frontend : `AbandonProgramDialog`, `DeleteProgramDialog`, `ProgramActionsMenu` (une seule des deux actions)
- [ ] Tests : back : abandon (passé intact, futur annulé, `cancelled_at` rempli) ; abandon avec séance en cours → 409 ; suppression sans séance démarrée → plus aucune ligne liée ; suppression avec séance démarrée → 409 ; une séance préparée partagée n'est pas supprimée
- [ ] Tests : E2E abandon et suppression

## Definition of Done

- [ ] Test « aucune ligne orpheline » après suppression
- [ ] Code relu et fusionné via pull request
