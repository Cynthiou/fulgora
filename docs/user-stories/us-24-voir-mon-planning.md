# US-24 · Voir mon planning

EPIC 5 · Planning

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-23, US-28
**Intégration future :** US-25, US-26, US-27, US-17
**Branche :** `feat/us-24-planning`
**Maquettes :** CAL-01, CAL-01b, CAL-02, CAL-03, CAL-03u, CAL-03p, CAL-03e, CAL-03d, CAL-03h, CAL-04, CAL-04m, CAL-10a, CAL-10b, CAL-10c
**Règles :** RM-027, RM-028, RM-040, RM-064, RM-069, RM-070

## User story

En tant qu'utilisateur, je veux voir mes séances par mois, par semaine et par jour afin de savoir quand je m'entraîne.

## Pourquoi

Le Planning est la vue d'ensemble : ce qui est prévu, fait, manqué, déplacé.

## Ce qui change

En MVP, l'onglet Planning n'affichait qu'une liste simple. Il devient le vrai calendrier.

## Règles métier

- Vues Mois (CAL-01) et Semaine (CAL-02), et le détail d'un jour (CAL-03).
- Statuts : Planifiée, Effectuée, Inachevée, À confirmer, Manquée, Annulée ; « ↷ Déplacée » est un indicateur en plus du statut. Toujours symbole + mot (RM-064).
- Mois : 3 indicateurs par jour au plus, « +n » au-delà.
- Tri d'un jour : par heure, sans heure en dernier.
- Une séance faite un autre jour s'affiche à sa date réelle avec « Prévue le … », et en rappel grisé à sa date prévue, qui ne compte pas (RM-070).
- Une séance peut être démarrée avant ou après sa date (RM-069).
- Si une séance est en cours, « Démarrer » devient « Une séance est en cours » sur les autres (RM-040).
- Le bouton « + » propose « Séance libre » ou « Programme », avec la date du jour sélectionné.

## Critères d'acceptation

- CAL-01 : ‹ › change de mois, « Aujourd'hui » revient au jour courant, toucher un jour le sélectionne et affiche ses séances dessous.
- CAL-02 : ‹ › change de semaine ; chaque séance avec heure, nom, statut ; « sans heure » à la place de l'heure.
- CAL-03 : « Jeudi 26 novembre · 4 séances · 1 effectuée », la prochaine séance mise en avant avec « Démarrer ».
- CAL-03e / 03d : jour sans séance, aujourd'hui ou un autre jour, avec « Ajoute une séance libre ou démarre un programme. »
- CAL-03h : séances à confirmer avec « Touche une séance pour dire si tu l'as faite. »
- CAL-04 : détail d'une séance prévue (programme, semaine, exercices) et ses actions ; menu ⋯ (CAL-04m) : Modifier la préparation, Déplacer, Annuler le rendez-vous.
- CAL-10a/b/c : une séance faite le 17 et prévue le 19 apparaît le 17 (« Prévue le 19 novembre ») et en rappel grisé le 19 ; le 19 compte 2 séances, pas 3.
- Un rendez-vous d'un autre utilisateur n'apparaît jamais.

## Éléments affichés

**Légende :** Planifiée · Effectuée · Inachevée · À confirmer · × Manquée · / Annulée · ↷ Déplacée · Rappel · faite un autre jour (non comptée)
**CAL-01b :** Séance libre · Programme
**CAL-03 :** « Jeudi 26 novembre · 4 séances · 1 effectuée » · « La prochaine séance prévue. Les autres se démarrent depuis leur détail. »
**CAL-03e :** « Ajoute une séance libre ou démarre un programme. »
**CAL-03h :** « Touche une séance pour dire si tu l'as faite. »
**CAL-04 :** « Programme Force 8 semaines · semaine 4 » · Démarrer · Modifier la préparation · Déplacer · Annuler le rendez-vous
**CAL-10a :** « Effectuée · Séance libre · Prévue le 19 novembre »

## États à gérer

### Chargement

Grille grise, navigation utilisable.

### Erreur

« Impossible de charger ton planning. » + « Réessayer ».

### Séance en cours

« Une séance est en cours » à la place de « Démarrer ».

## Réponses API attendues

- `GET /api/appointments?from=&to=` (62 jours max) : `200` ; plage invalide : `400`

## Hors périmètre

- Vue Jour séparée (le détail du jour CAL-03 la remplace).
- Déplacer, annuler, confirmer (US-25 à US-27).

## Tâches techniques

- [x] Backend : `readAppointmentsBetween` élargi : rendez-vous **prévus** dans la plage **ou réalisés** dans la plage ; le numéro de semaine de programme attend l'US-18
- [x] Shared : `getAppointmentDisplayDate`, `buildDayEntries` (séances du jour + rappels grisés), `listMonthWeeks` (semaines du lundi au dimanche), `buildMonthCell` ; `getProgramWeekNumber` attend l'US-18
- [x] Frontend : `PlanningPage.tsx` (Jour / Semaine / Mois), `MonthGrid.tsx`, `WeekList.tsx`, `DayView.tsx`, `AppointmentRow.tsx`, `StatusDot.tsx`, `PlanningLegend.tsx`, `CreateChoiceSheet.tsx` (CAL-01b) ; CAL-04 et son menu ⋯ sont l'écran B1 fait à l'US-17
- [x] Frontend : grille du mois accessible (un vrai tableau, flèches du clavier, jour sélectionné annoncé)
- [x] Tests : unitaires `buildDayEntries` (rappel non compté), `buildMonthCell`, `getAppointmentDisplayDate` ; back : séance réalisée dans la plage mais prévue en dehors
- [x] Tests : E2E navigation mois / semaine / jour, axe sur les trois, et le cas de la séance faite en avance

## Definition of Done

- [x] Exemple CAL-10 vérifié par un test de bout en bout (séance faite deux jours avant sa date)
- [ ] Code relu et fusionné via pull request
