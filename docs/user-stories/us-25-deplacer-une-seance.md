# US-25 · Déplacer une séance

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24, US-27 (statuts et notifications)
**Intégration future :** US-20 (rendez-vous déplacés conservés)
**Branche :** `feat/us-25-move-appointment`
**Maquettes :** CAL-05, CAL-05b
**Règles :** RM-032, RM-052, RM-068, DT-24

## User story

En tant qu'utilisateur, je veux déplacer une séance à un autre jour afin de m'adapter à un imprévu.

## Pourquoi

Un rendez-vous tombe à l'eau : on décale la séance au lendemain, ou même à un jour passé si on l'a faite plus tôt.

## Règles métier

- Déplaçable si Planifiée, À confirmer ou Manquée, vers n'importe quelle date passée ou future ; jamais si Effectuée ou Annulée (pas de bouton) (RM-068).
- L'heure est facultative et modifiable.
- La date prévue d'origine est conservée et affichée ; l'indicateur « déplacée manuellement » est posé (RM-032).
- Le statut est recalculé selon la nouvelle date : aujourd'hui ou futur → Planifiée ; passé, 72 h non écoulées → À confirmer ; passé, 72 h écoulées → Manquée. Les 72 h partent de 00 h le lendemain de la nouvelle date.
- Les notifications « À confirmer » et « Manquée » devenues fausses sont supprimées, et les bonnes sont créées, dans la même transaction (DT-24). Le rendez-vous n'est jamais supprimé.
- Une séance déplacée à la main ne bouge plus quand la règle hebdomadaire change.

## Critères d'acceptation

- « Déplacer » ouvre CAL-05 : calendrier (date actuelle en pointillé), heure facultative, Confirmer, Annuler.
- Après confirmation, CAL-04 affiche le badge « Déplacée » et « Prévue le 21 nov. · déplacée au 24 nov. ».
- Exemple CAL-05b : « Dos » manquée le 21, déplacée au 24 (passé) → « À confirmer » jusqu'au 28 novembre à 00 h ; la notification « Manquée » du 21 disparaît, une « À confirmer » apparaît pour le 24.
- Le 21 est vide dans le mois et la semaine.
- Une séance effectuée ou annulée n'a pas de bouton « Déplacer ».

## Éléments affichés

**CAL-05 :** Déplacer la séance · calendrier · Heure (facultatif) · Confirmer · Annuler
**CAL-05b :** « Prévue le 21 nov. · déplacée au 24 nov. » · « La notification « Manquée » du 21 est supprimée ; une notification « À confirmer » est créée pour le 24. » · Je l'ai faite · Pas faite · Déplacer à nouveau

## États à gérer

### Envoi

Boutons désactivés.

### Séance démarrée entre-temps

Refus et rechargement.

## Réponses API attendues

- Déplacé : `200` + rendez-vous à jour
- Statut effectué ou annulé : `409`, code `APPOINTMENT_NOT_MOVABLE`
- Date hors plage (± 2 ans) : `400`
- Rendez-vous d'un autre : `404`

## Hors périmètre

- Changer le jour de toutes les semaines (US-20).

## Tâches techniques

- [x] Shared : `computeAppointmentStatus(plannedDate, today)` et `formatConfirmDeadline`, fonctions pures, réutilisées par l'US-27
- [x] Backend : `readAppointmentForUpdate`, `moveAppointment(id, date, time, status)` avec `COALESCE(initial_date, planned_date)`
- [ ] Backend : notifications à remplacer : **repoussé à l'US-46**, il n'y a pas encore de notifications
- [x] Backend : `PATCH /api/appointments/:id/move` dans `withTransaction`, avec verrou sur le rendez-vous
- [x] Frontend : `MoveAppointmentSheet.tsx` (CAL-05), ouvert par le menu ⋯, et la ligne « déplacée au » sur l'écran de la séance
- [x] Tests : unitaires `computeAppointmentStatus` ; back : `initial_date` gardée au 2ᵉ déplacement, statut recalculé, effectuée → 409, hors plage → 400, celle d'un autre → 404
- [x] Tests : E2E déplacement vers un jour futur et exemple CAL-05b (déplacée à hier, « À confirmer »)

## Definition of Done

- [x] Exemple CAL-05b reproduit en test d'intégration et en test de bout en bout (sans la partie notifications)
- [ ] Code relu et fusionné via pull request
