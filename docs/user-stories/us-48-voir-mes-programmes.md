# US-48 · Voir mes programmes

EPIC 4 · Programmes

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-18
**Intégration future :** US-20, US-21, US-22, US-41 (Résumé par programme)
**Branche :** `feat/us-48-program-list`
**Maquettes :** PRO-01, PRO-01b, PRO-01v, PRO-07, PRO-07b, PRO-07c, PRO-07d, PRO-13
**Règles :** RM-025, RM-026, RM-066, RM-071, RM-074

## User story

En tant qu'utilisateur, je veux voir la liste et le détail de mes programmes afin de savoir où j'en suis dans chaque cycle.

## Pourquoi

Un programme dure des semaines : on a besoin de voir l'avancement, la prochaine séance et ce qui a été fait ou manqué.

## Ce qui change

L'Accueil (US-44) affiche maintenant la section « Mes programmes » avec le programme en cours, et le Planning un lien « Mes programmes » en haut.

## Règles métier

- « Mes programmes » est une page, pas un onglet ; on y accède depuis l'Accueil et le Planning (RM-066).
- Statuts : Brouillon, À venir, En cours, Terminé, Abandonné (RM-026). Plusieurs programmes peuvent être en cours en même temps (RM-025).
- Un brouillon n'est jamais « À venir » ni « En cours » ; il est conservé sans limite et affiché en tête (RM-071).
- Les statuts changent seuls : « À venir » → « En cours » le jour du début à 00 h ; « En cours » → « Terminé » le lendemain de la date de fin à 00 h (RM-074). Le passage à « Terminé » crée une notification.
- Chaque séance garde son propre statut ; une semaine n'est jamais « manquée » en bloc.
- Le menu ⋯ ne propose que les actions possibles selon l'état (PRO-07b).

## Critères d'acceptation

- PRO-01 : la liste avec les filtres par statut ; chaque carte affiche nom, période, jours et heures, statut en texte.
- PRO-01b : un brouillon en tête, « 2 / 4 séances prêtes », « Reprendre » et « Supprimer ».
- PRO-01v : aucun programme → texte explicatif et « + Créer mon premier programme », sans filtres.
- PRO-07 (en cours) : période, jours, barre et pourcentage (« 6 / 12 séances passées · 3 faites »), séance du jour avec « Démarrer », « Ensuite » (3 prochaines), « Déjà passées » (3 dernières avec statut), « Voir l'historique ».
- PRO-07c (à venir) : « Première séance · lun 30 nov. 18:30 » et les semaines avec leur nombre de séances planifiées ; pas de « Démarrer ».
- PRO-07d : une séance faite en avance est comptée « 1 faite en avance » dans sa semaine.
- PRO-13 (terminé) : bilan (« 16 séances prévues · 88 % réalisées »), liste des séances avec statut, « Réutiliser » ; même écran pour « Abandonné », avec la date d'abandon.
- Un programme d'un autre utilisateur affiche « Programme introuvable ».

## Éléments affichés

**PRO-01v :** « Un programme planifie tes séances sur plusieurs semaines, automatiquement. » · « Choisis la période et tes jours » · « Les séances arrivent dans ton Planning » · + Créer mon premier programme
**PRO-01b :** « 4 programmes · 2 en cours · 1 brouillon » · Brouillon · « 30 nov. → 10 janv. · Lun · Jeu · Sam · 2 / 4 séances prêtes » · « Pas encore dans le Planning » · Reprendre · Supprimer
**PRO-07 :** « 6 / 12 séances passées · 3 faites » · Ensuite · Déjà passées · Voir l'historique · 6 séances
**PRO-07c :** « PREMIÈRE SÉANCE · LUN 30 NOV. 18:30 » · « 30 nov. → 6 déc. · 4 séances planifiées »
**PRO-13 :** ⚑ TERMINÉ (ou ABANDONNÉ) · « 16 séances prévues · 88 % réalisées » · Réutiliser

## États à gérer

### Chargement

Cartes grises.

### Erreur

« Impossible de charger tes programmes. » + « Réessayer ».

### Vide

PRO-01v.

### Introuvable

« Programme introuvable » + retour à la liste.

## Réponses API attendues

- `GET /api/programs?status=` : `200`
- `GET /api/programs/:id` : `200` ; absent ou d'un autre : `404`

## Hors périmètre

- Créer, modifier, abandonner, supprimer, réutiliser (US-18 à US-22).

## Tâches techniques

- [x] BDD : statuts de `program` avec `draft` (migration 003)
- [x] Backend : `programRepository.readPrograms(userId, status)` avec, par programme, le nombre de rendez-vous et de rendez-vous passés et faits (sous-requêtes `COUNT`)
- [x] Backend : `readProgram(id, userId)`, `readProgramSchedules(id)`, `readProgramAppointments(id)` (avec la séance réalisée liée)
- [x] Backend : `programActions.browse`, `programActions.read` ; `programRouter.ts` (`GET /api/programs`, `GET /api/programs/:id`)
- [x] Backend : tâche planifiée `updateProgramStatuses(today)` toutes les 5 min : `UPDATE program SET status = 'in_progress' WHERE status = 'programmed' AND start_date <= ?` ; `UPDATE program SET status = 'finished' WHERE status = 'in_progress' AND end_date < ?` ; création des notifications « Programme terminé » (`INSERT … SELECT` pour les programmes passés à `finished`, sans doublon), trace dans `program_change`
- [x] Shared : `computeProgramProgress(appointments, today)` (passées, faites, pourcentage), `groupAppointmentsByWeek`, `getAvailableProgramActions(program, hasStartedSession, hasInProgressSession)`
- [x] Frontend : `features/program/pages/ProgramListPage.tsx`, `ProgramDetailPage.tsx` ; composants `ProgramCard`, `ProgramProgress`, `ProgramWeekList`, `ProgramActionsMenu`
- [x] Frontend : section « Mes programmes » de l'Accueil, lien « Mes programmes » du Planning
- [x] Routing : `/programmes`, `/programmes/:id`
- [x] Tests : unitaires `computeProgramProgress`, `getAvailableProgramActions` (chaque état) ; back : liste filtrée, programme d'un autre → 404, `updateProgramStatuses` au jour du début et au lendemain de la fin, notification créée une seule fois
- [x] Tests : E2E liste → détail ; axe sur PRO-01, PRO-07, PRO-13

## Definition of Done

- [x] Critères d'acceptation vérifiés manuellement
- [x] Tâche planifiée testée sans attendre minuit (date passée en paramètre)
- [ ] Code relu et fusionné via pull request
