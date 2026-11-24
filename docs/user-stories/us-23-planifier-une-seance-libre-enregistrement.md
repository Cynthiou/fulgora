# US-23 · Planifier une séance libre (enregistrement)

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-12, US-13, US-14, US-15, T-05
**Intégration future :** US-24 (Planning), US-25 (déplacer), US-28 (démarrer)
**Branche :** `feat/us-23-free-session`
**Maquettes :** A1, A2, A2b, A9, CAL-01b
**Règles :** RM-015, RM-016, RM-018, RM-024, RM-027

## User story

En tant qu'utilisateur, je veux planifier ma séance à une date afin de m'entraîner sans programme.

## Pourquoi

Tout le monde ne suit pas un programme : on peut juste prévoir « Haut du corps jeudi ». C'est l'US qui enregistre tout le parcours.

## Règles métier

- Une séance libre a toujours une date ; l'heure est facultative (RM-015, RM-027).
- Une séance libre est un rendez-vous sans programme : `program_id` et `weekly_schedule_id` restent vides (RM-015).
- La date se choisit en premier, depuis le Planning ou l'Accueil ; elle reste modifiable (A2b).
- Une date passée est acceptée (séance déclarée après coup), jusqu'à 1 an en arrière ; au plus 2 ans en avant.
- Tout est enregistré en une seule fois, dans une transaction : séance, version 1, blocs, exercices, séries, rendez-vous. Si une étape échoue, rien n'est enregistré.
- Les positions (blocs, exercices, séries) sont calculées par le serveur à partir de l'ordre des listes : 1, 2, 3… Le client n'envoie jamais de position (RM-024).

## Critères d'acceptation

- Depuis le Planning ou l'Accueil, « + » puis « Séance libre » ouvre l'éditeur avec la date choisie.
- Toucher le champ Date ouvre « Date de la séance » ; « Valider la date » met à jour le champ (« Séance le samedi 28 novembre »).
- « Enregistrer la séance » enregistre tout et affiche A9 : « PRÉVUE », « 1 bloc · 6 exercices », « ✓ Séance enregistrée le jeudi 26 novembre. »
- Le retour mène au Planning (ou à l'Accueil) sur le jour choisi ; la séance y apparaît avec l'étiquette « Séance libre ».
- En cas d'échec, le brouillon est conservé et un message s'affiche ; rien n'est créé en base.
- Un exercice devenu indisponible bloque l'enregistrement avec son nom.
- Le bouton est désactivé pendant l'envoi (une seule séance créée même en cas de double appui).

## Éléments affichés

**Sélecteur de date :** Date de la séance · Aujourd'hui · Choisie · « Séance le samedi 28 novembre » · Valider la date · Fermer
**Confirmation (A9) :** PRÉVUE · Haut du corps · 1 bloc · 6 exercices · « ✓ Séance enregistrée le jeudi 26 novembre. »
**Erreur :** « Impossible d'enregistrer la séance. Ton brouillon est conservé. » + « Réessayer »
**Exercice indisponible :** « « Mon tirage élastique » n'est plus disponible. Retire-le pour enregistrer. »

## États à gérer

### Enregistrement en cours

Bouton « Enregistrement… » désactivé, éditeur en lecture seule.

### Erreur API

Message + « Réessayer », brouillon intact.

### Succès

Écran A9, puis retour au jour choisi.

## Réponses API attendues

- Séance enregistrée : `201` + `{ appointment_id }`
- Données invalides (date, nom, bornes, structure) : `400`, code `VALIDATION_ERROR`
- Exercice indisponible : `422`, code `EXERCISE_NOT_AVAILABLE`
- Mesure non prévue : `422`, code `MEASURE_NOT_ALLOWED`
- Pas connecté : `401` ; origine refusée : `403`

## Hors périmètre

- Séances d'un programme (US-18, US-19).
- Vue Planning complète (US-24).
- Déplacer ou annuler (US-25, US-26).

## Tâches techniques

- [ ] BDD : tables `session_template`, `session_version`, `template_block`, `template_block_exercise`, `planned_set`, `appointment`
- [ ] Shared : `freeSessionSchema` : `planned_date` (dans la plage), `planned_time` facultatif, `session: sessionDraftSchema`
- [ ] Backend : `sessionTemplateRepository` (toutes avec `db: Queryable`) : `createSessionTemplate` (`INSERT INTO session_template (owner_user_id, name) VALUES (?, ?)`), `createSessionVersion` (`… VALUES (?, 1)`), `createTemplateBlock`, `createTemplateBlockExercise`, `createPlannedSet`
- [ ] Backend : `appointmentRepository.createAppointment` : `INSERT INTO appointment (owner_user_id, session_version_id, planned_date, planned_time, status) VALUES (?, ?, ?, ?, 'planned')`
- [ ] Backend : `appointmentActions.createFree`, dans `withTransaction` : 1) `readAvailableExerciseIds` → 422 si un exercice manque ; 2) `readExerciseMeasureCodes` → 422 si une mesure n'est pas prévue ; 3) template, version 1 ; 4) pour chaque bloc, exercice, série : création avec position = index + 1 ; 5) rendez-vous ; 6) 201
- [ ] Backend : `POST /api/appointments` → `checkOrigin` → `authenticate` → `validate({ body: freeSessionSchema })` → action
- [ ] Backend : « aujourd'hui » pour la plage de dates calculé en `Europe/Paris` (`shared/dates.ts` : `todayInParis()`)
- [ ] Frontend : `appointmentService.createFreeSession(payload)`
- [ ] Frontend : `components/DatePickerSheet.tsx` (A2b), `pages/SessionSavedPage.tsx` (A9) ou état de succès dans l'éditeur
- [ ] Frontend : bouton « + » du Planning et de l'Accueil → choix « Séance libre » (« Programme » masqué en MVP)
- [ ] Tests : back : séance complète → toutes les lignes avec positions 1, 2, 3 ; séance vide acceptée ; exercice interdit au 3ᵉ bloc → **aucune ligne dans aucune des 6 tables** ; date hors plage → 400 ; double envoi → 2 séances (le client empêche le double envoi : tester le bouton désactivé côté front)
- [ ] Tests : front : bouton désactivé pendant l'envoi, brouillon conservé après erreur
- [ ] Tests : E2E : parcours A1 → A9 complet, la séance apparaît à l'Accueil le bon jour

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Transaction testée (aucune ligne orpheline après échec)
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
