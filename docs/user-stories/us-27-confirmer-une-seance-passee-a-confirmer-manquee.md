# US-27 · Confirmer une séance passée (À confirmer, Manquée)

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24, US-46
**Intégration future :** US-38 (déclarer faite), US-41 (comptage)
**Branche :** `feat/us-27-confirm-past-session`
**Maquettes :** CAL-03h, CAL-08, CAL-08c, NOT-03, NOT-03b, NOT-04
**Règles :** RM-052, RM-053, RM-054, RM-055, RM-056, RM-067, DT-16

## User story

En tant qu'utilisateur, je veux dire si j'ai fait une séance passée afin que mon historique soit juste.

## Pourquoi

On oublie souvent de lancer l'appli à la salle. Sans confirmation, l'historique serait faux.

## Ce qui change

L'historique (US-35) affiche maintenant des séances « À confirmer » et « Manquées » : en MVP, une séance passée non faite restait « planifiée ».

## Règles métier

- Une séance planifiée dont la date est passée devient « À confirmer » à 00 h le lendemain (fuseau de l'utilisateur), puis « Manquée » 72 h plus tard sans réponse, avec ou sans heure (RM-052).
- Une séance effectuée ne devient jamais manquée (RM-053).
- « Pas faite » la passe immédiatement en « Manquée », sans nouvelle notification « Manquée » (RM-067).
- On peut toujours la déclarer faite plus tard, sans limite (RM-054).
- Une notification « Séance à confirmer » est créée au passage en À confirmer, une « Séance manquée » au passage automatique en Manquée ; jamais en double (RM-055, RM-056, DT-16).
- Répondre (faite ou pas faite) marque la notification comme lue.

## Critères d'acceptation

- La tâche planifiée passe les bons rendez-vous en « À confirmer » et en « Manquée » (exemple : prévue le 24 → à confirmer le 25 à 00 h → manquée le 28 à 00 h).
- CAL-08 : « Prévue mardi 24 novembre · 12:00 · séance libre », « Sans réponse, elle passera « Manquée » le samedi 28 novembre à 00 h. », Je l'ai faite · Pas faite · Déplacer.
- « Pas faite » → CAL-08c / NOT-03b : « ✓ Séance marquée comme manquée. Tu pourras toujours la déclarer faite plus tard. »
- « Je l'ai faite » → déclaration après coup (US-38).
- Relancer la tâche ne crée aucun doublon.

## Éléments affichés

**CAL-08 :** « Tu pourras toujours la déclarer faite plus tard. » · « Sans réponse, elle passera « Manquée » le samedi 28 novembre à 00 h. » · Je l'ai faite · Pas faite · Déplacer
**NOT-03 :** À CONFIRMER · « Aucun résultat saisi pour cette séance. » · Je l'ai faite · saisir mes résultats · Pas faite
**NOT-03b :** × MANQUÉE · « ✓ Séance marquée comme manquée. » · « Tu pourras toujours la déclarer faite plus tard. » · Retour aux notifications
**NOT-04 :** « Tu l'as finalement faite ? Tu peux encore la déclarer, même après 72 h. » · Voir dans le Suivi ›

## États à gérer

### Envoi

Boutons désactivés.

### Déjà traitée ailleurs

Rechargement de l'état réel.

## Réponses API attendues

- « Pas faite » : `POST /api/appointments/:id/not-done` → `200`
- Statut incompatible (planifiée future, effectuée, annulée) : `409`

## Décisions

- **D-12** : les dates sont calculées dans le fuseau de l'utilisateur (`user.timezone`, `Europe/Paris` par défaut, migration 004).

## Hors périmètre

- Saisir les résultats après coup (US-38).
- Centre de notifications (US-46).

## Tâches techniques

- [x] Backend : tâche `updateAppointmentStatuses()` toutes les 5 min, fuseau par fuseau, les rendez-vous avec une séance réalisée exclus
- [ ] Backend : notifications : **repoussé à l'US-46**, la table n'existe pas encore
- [x] Backend : `markAppointmentNotDone(id, userId)` : `to_confirm` → `missed` ; la notification suivra l'US-46
- [x] Shared : `computeAppointmentStatus` (US-25) et `formatConfirmDeadline(plannedDate)` (« samedi 28 novembre à 00 h »)
- [x] Frontend : `ConfirmPastSession.tsx` (CAL-08) sur l'écran de la séance, message CAL-08c après la réponse
- [x] Tests : back : J+1 → à confirmer, J+4 → manquée, séance faite jamais touchée, deuxième passage sans effet, « Pas faite » → manquée, 409 et 404
- [x] Tests : unitaires `formatConfirmDeadline` et `computeAppointmentStatus`

## Definition of Done

- [x] Tâche planifiée testée sans attendre minuit (elle s'appelle directement dans les tests)
- [ ] Code relu et fusionné via pull request
