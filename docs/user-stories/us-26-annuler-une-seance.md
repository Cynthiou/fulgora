# US-26 · Annuler une séance

EPIC 5 · Planning

**Taille :** S (2 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24
**Intégration future :** US-41 (comptée « annulée »)
**Branche :** `feat/us-26-cancel-appointment`
**Maquettes :** CAL-07, CAL-07b, CAL-07c
**Règles :** RM-035

## User story

En tant qu'utilisateur, je veux annuler une séance prévue afin de garder un planning juste.

## Pourquoi

Une séance qu'on sait qu'on ne fera pas ne doit pas finir « manquée ».

## Règles métier

- Seule une séance planifiée ou à confirmer, **non commencée**, s'annule.
- Elle passe en « Annulée », avec la date et l'heure d'annulation, et reste visible dans le jour et l'historique (RM-035).
- Une séance annulée ne compte pas dans la progression.
- Une séance commencée ne s'annule pas : on la termine ou on l'abandonne (CAL-07b).
- Ses notifications « À confirmer » éventuelles sont marquées lues.

## Critères d'acceptation

- CAL-07 : confirmation avec la date, « Annuler la séance » / « Garder la séance ».
- Après annulation, CAL-07c : « Annulée le 25 novembre à 21:12 », pas de « Démarrer ».
- Séance en cours (CAL-07b) : message et « Reprendre ».

## Éléments affichés

**CAL-07 :** « Jeudi 26 novembre · 07:00. La séance restera visible dans ton historique comme annulée. » · Annuler la séance · Garder la séance
**CAL-07b :** Séance commencée · « Elle ne peut plus être annulée. Termine-la ou abandonne-la depuis la séance : tes séries réalisées sont conservées. » · Reprendre
**CAL-07c :** « Prévue jeudi 26 novembre · 07:00 » · « Annulée le 25 novembre à 21:12 »

## États à gérer

### Envoi

Boutons désactivés.

## Réponses API attendues

- Annulée : `200`
- Commencée, effectuée, déjà annulée : `409`, code `APPOINTMENT_NOT_CANCELLABLE`
- D'un autre : `404`

## Hors périmètre

- Annuler toutes les séances d'un programme (US-21).

## Tâches techniques

- [x] BDD : `appointment.cancelled_at` + contrainte (migration 002, déjà en place)
- [x] Backend : `cancelAppointment(id, userId)`, un seul UPDATE conditionnel ; 0 ligne → relecture pour choisir 404 ou 409
- [x] Backend : `PATCH /api/appointments/:id/cancel` ; `markAppointmentNotificationsRead` attend les notifications (US-46)
- [x] Frontend : `CancelAppointmentDialog` (CAL-07), affichage CAL-07c, entrée du menu ⋯
- [x] Tests : back : annulation, `cancelled_at` rempli, commencée → 409, deux fois → 409, celle d'un autre → 404 ; client : les trois états ; E2E : annuler et garder

## Definition of Done

- [ ] Code relu et fusionné via pull request
