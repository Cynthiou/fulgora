# US-46 · Consulter mes notifications

EPIC 9 · Socle

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-27, US-48, US-40
**Intégration future :** aucune
**Branche :** `feat/us-46-notifications`
**Maquettes :** NOT-01, NOT-01b, NOT-02, NOT-02v, NOT-03, NOT-04, NOT-05, NOT-06, NOT-07, NOT-07e, NOT-08
**Règles :** RM-055, RM-056, RM-057, RM-062, DT-16

## User story

En tant qu'utilisateur, je veux voir mes notifications afin de ne rien manquer.

## Pourquoi

Les séances à confirmer, les programmes terminés et les records doivent arriver jusqu'à l'utilisateur.

## Ce qui change

L'en-tête des 4 onglets affiche l'accès aux notifications (cloche ou pastille, voir À PRÉCISER).

## Règles métier

- Quatre types : séance à confirmer, séance manquée, programme terminé, record personnel (RM-055).
- Une seule notification par rendez-vous et par type (RM-056, DT-16).
- Classées de la plus récente à la plus ancienne, groupées « Cette semaine » / « Plus anciennes ».
- Non lue : bandeau, fond, titre en gras **et** la mention « ● NON LUE » (pas seulement la couleur).
- Toucher une notification ouvre l'élément lié et la marque lue.
- « Tout marquer lu » retire le compteur ; absent quand la liste est vide.
- Une séance manquée corrigée après coup marque sa notification lue (RM-057).
- Les sons et vibrations de minuteur ne sont jamais des notifications (RM-062).

## Critères d'acceptation

- NOT-01 : le compteur des non lues (« 9+ » au-delà de 9) ; lu « Notifications, 3 non lues » ; zone de 44 px.
- NOT-01b : sans non lue, pas de pastille.
- NOT-02 : la liste et « Réglages des alertes › » (NOT-08 / PRF-04).
- NOT-02v : « Aucune notification » et son texte.
- NOT-03 / NOT-04 : liens vers la séance (US-27, US-38) ; NOT-05 vers le résumé du programme ; NOT-06 vers la progression.
- NOT-07 : après consultation, la pastille passe de 3 à 2.
- NOT-07e : élément supprimé → « Cette séance n'est plus disponible » ; erreur réseau → « Impossible d'ouvrir. Réessaie. », notification toujours non lue.

## Éléments affichés

**NOT-02 :** Tout marquer lu · CETTE SEMAINE · PLUS ANCIENNES · « Séance à confirmer · 25 nov. · Dos · mar. 24 nov. As-tu fait cette séance ? » · « Séance manquée · Course · sam. 21 nov. · Cardio base. » · « Record personnel · Squat à la barre · 62,5 kg × 8 (charge max). » · « Programme terminé · Remise en forme · 7 sept. → 1er nov. » · Réglages des alertes ›
**NOT-02v :** Aucune notification · « Tu seras prévenu ici des séances à confirmer ou manquées, des programmes terminés et de tes records. »
**NOT-07e :** « Cette séance n'est plus disponible »

## États à gérer

### Chargement / Erreur

Comme les autres listes.

### Élément supprimé

NOT-07e.

## Réponses API attendues

- `GET /api/notifications` : `200` + `{ items, unread_count }`
- `GET /api/notifications/unread-count` : `200`
- `PATCH /api/notifications/:id/read` : `200` ; d'un autre : `404`
- `PATCH /api/notifications/read-all` : `204`

## Décisions

- **D-01** : cloche dans l'en-tête des 4 onglets, à gauche de l'avatar (NOT-01).
- **D-05** : « Tout marquer lu » est gardé.

## Hors périmètre

- Notifications push du téléphone (hors minuteur).
- Création des notifications (US-27, US-40, US-48).

## Tâches techniques

- [x] Backend : `readNotifications`, `countUnreadNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `markAppointmentNotificationsRead`, `createAppointmentNotifications` ; `notificationRouter.ts`
- [x] Backend : `/read-all` et `/unread-count` déclarées avant `/:id`
- [x] Frontend : `NotificationBell.tsx` (en-tête des 4 onglets), `NotificationsPage.tsx`, `NotificationRow.tsx`, `useUnreadCount` (rafraîchi à chaque changement de page)
- [x] Frontend : la notification d'un rendez-vous mène à la séance ; programmes et records attendent leurs écrans (US-48, US-40)
- [x] Tests : back : liste triée, celles d'un autre invisibles, lecture, tout lu, pas de doublon ; front : compteur « 9+ », mention « NON LUE », groupes
- [x] Tests : E2E cloche → liste vide → retour, avec axe ; la création passe par la tâche planifiée, couverte côté serveur

## Definition of Done

- [ ] Code relu et fusionné via pull request
