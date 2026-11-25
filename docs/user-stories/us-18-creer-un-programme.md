# US-18 · Créer un programme

EPIC 4 · Programmes

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-12 à US-15 (éditeur), US-48
**Intégration future :** US-19 (jours), US-22 (copie)
**Branche :** `feat/us-18-create-program`
**Maquettes :** PRO-02, PRO-02b, PRO-03v, PRO-03, PRO-03f, PRO-03e, PRO-04, PRO-06, CAL-01b
**Règles :** RM-025, RM-026, RM-071, RM-072, RM-075

## User story

En tant qu'utilisateur, je veux créer un programme avec une période et ses séances afin de suivre un cycle d'entraînement.

## Pourquoi

Un programme évite de planifier chaque séance à la main : on décrit une semaine type, l'appli remplit le Planning.

## Règles métier

- Étape 1 : nom obligatoire, description facultative, date de début et date de fin obligatoires (fin ≥ début, 52 semaines au plus), au moins un jour.
- Étape 2 : une séance vide est créée pour chaque jour coché (« Séance du lundi »…). Chaque séance se construit avec l'éditeur existant ; « Jour : Jeudi » remplace le champ Date.
- La semaine type est identique sur toute la période (RM-075).
- **Brouillon** : enregistrable à tout moment à partir de l'étape 2, même avec des séances vides ; il ne crée **aucun** rendez-vous ni notification ; conservé sans limite ; sans nom, il s'appelle « Programme sans nom » (RM-071).
- **Créer le programme** : possible seulement quand chaque séance a au moins un exercice (RM-072). Les rendez-vous sont alors générés sur toute la période.
- Statut après création : « À venir » si le début est dans le futur, « En cours » si c'est aujourd'hui ou avant.
- Un jour partagé avec un autre programme est signalé, jamais bloquant.
- Quitter pendant la création propose : Enregistrer le brouillon, Continuer, Supprimer et quitter.

## Critères d'acceptation

- Depuis le Planning, « + » → « Programme » ouvre PRO-02 avec la date de début pré-remplie.
- PRO-02 affiche la durée calculée (« 6 semaines ») et le résumé des jours (« Lundi · Jeudi · Samedi · 3 jours par semaine »).
- Erreurs PRO-02b : sous le champ ; « Suivant » ramène au premier champ en erreur.
- PRO-03v → PRO-03 → PRO-03f : le compteur « 2 / 4 séances prêtes » et « Créer le programme » qui s'active à 4 / 4.
- Chaque séance prête affiche ses exercices (« Squat à la barre · 4 × 8 rép. · 60 kg ») ; une séance vide affiche « À configurer · aucun exercice ».
- « Enregistrer le brouillon » → PRO-01b ; rien dans le Planning.
- « Créer le programme » → PRO-06 : « 24 séances ajoutées au Planning, du lundi 30 novembre au dimanche 10 janvier. »
- Les 24 rendez-vous existent en base avec la bonne date, l'heure et la version de leur séance.

## Éléments affichés

**PRO-02 :** Étape 1 / 3 · Informations et jours · Nom · Description (Ex. 3 séances par semaine, haut / bas du corps) · Début · Fin · Jours · Suivant
**PRO-03v :** « Une séance a été créée pour chaque jour choisi. Donne-lui un nom et ajoute ses exercices. » · « À configurer · touche pour ajouter blocs et exercices »
**PRO-03 / 03f :** Étape 2 / 3 · Séances · « 2 / 4 séances prêtes » · Enregistrer le brouillon · Créer le programme
**PRO-03e :** « « Hypertrophie 6 semaines » n'est pas encore créé. Enregistre-le en brouillon pour le reprendre plus tard : il n'apparaîtra pas dans le Planning. » · Enregistrer le brouillon · Continuer · Supprimer et quitter
**PRO-06 :** Programme créé · « 24 séances ajoutées au Planning, du lundi 30 novembre au dimanche 10 janvier. » · « Statut « À venir » jusqu'au 30 novembre. » · Voir le planning · Voir le programme

## États à gérer

### Enregistrement du brouillon / création en cours

Boutons désactivés.

### Erreur API

Message, saisie conservée.

### Séance « À configurer »

« Créer le programme » désactivé avec l'explication.

## Réponses API attendues

- Brouillon créé : `201` ; brouillon mis à jour : `200`
- Programme créé : `200` + `{ appointment_count, first_date, last_date }`
- Données invalides : `400`
- Séance sans exercice à la création : `422`, code `PROGRAM_SESSION_EMPTY`
- Programme qui n'est plus un brouillon : `409`

## Hors périmètre

- Plusieurs séances le même jour, modifier les jours, retirer une séance (US-19).
- Modifier un programme créé (US-20, US-21).

## Tâches techniques

- [x] Shared : `programInfoSchema` (nom, dates, jours 1 à 7, heure), `listProgramDates(start, end, weekdays)`, `countProgramWeeks`, `canActivateProgram`, `statusAfterCreation`
- [x] Backend : `createProgram` (statut `draft`), `updateProgramInfo`, `updateProgramStatus`
- [x] Backend : `createSchedule(programId, templateId, weekday, time)`, `deactivateSchedule`, `deleteProgramSchedules`
- [x] Backend : séances du brouillon créées avec les fonctions de l'US-23 ; un jour ajouté crée sa séance, un jour retiré sort de la semaine type (sa séance est gardée)
- [x] Backend : `createProgramAppointment(...)`, un rendez-vous à la fois dans la transaction ; l'insertion multiple viendra si le nombre pose un problème
- [x] Backend : `createDraft`, `updateDraft` et `activate` (`POST /api/programs/:id/activate`) dans `withTransaction`, avec verrou sur le programme ; la trace `program_change` attend l'US-20
- [x] Frontend : `NewProgramPage.tsx` (PRO-02), `ProgramSessionsPage.tsx` (PRO-03 et PRO-06), `ProgramDaySessionPage.tsx` qui réutilise l'éditeur en mode « jour », dialogue PRO-03e
- [ ] Frontend : `useProgramDraft` : **pas nécessaire**, le brouillon vit côté serveur dès l'étape 1
- [x] Tests : unitaires `listProgramDates`, `countProgramWeeks`, `computeProgramStatus`, `programInfoSchema` ; back : brouillon sans rendez-vous, nombre exact de rendez-vous, séance vide → 422, deuxième création → 409, programme d'un autre → 404
- [x] Tests : E2E parcours complet PRO-02 → PRO-06, avec axe à chaque écran

## Definition of Done

- [ ] Nombre de rendez-vous vérifié à la main sur un exemple
- [ ] Code relu et fusionné via pull request
