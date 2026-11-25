# US-28 · Démarrer une séance

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-23, T-05
**Intégration future :** US-29, US-30, US-33, US-34, US-44 (Reprendre ma séance)
**Branche :** `feat/us-28-start-workout`
**Maquettes :** B1, B2, écran 03 (séance démarrée)
**Règles :** RM-018, RM-038, RM-039, RM-040, RM-041, RM-044, RM-069, DT-15

## User story

En tant qu'utilisateur, je veux démarrer une séance prévue afin de noter ce que je fais réellement à la salle.

## Pourquoi

Démarrer, c'est passer du prévu au réalisé. Le prévu est copié et figé pour que l'historique reste juste, même si la séance est modifiée plus tard.

## Règles métier

- On peut démarrer une séance planifiée, à confirmer ou manquée, n'importe quel jour, avant ou après sa date prévue (RM-069) ; elle n'est pas déplacée.
- Une séance effectuée ou annulée ne se démarre pas.
- Une séance sans exercice ne se démarre pas (RM-018) : le bouton devient « Ajouter des exercices ».
- Une seule séance en cours par utilisateur (RM-040) : protégé par le serveur **et** par l'index unique de la base, même si deux demandes arrivent en même temps (DT-15).
- Un rendez-vous a au plus une séance réalisée (RM-038).
- Au démarrage, les blocs, exercices et séries prévus sont copiés ; les valeurs prévues copiées ne changent plus jamais (RM-041).
- Démarrer enregistre l'heure réelle de début et passe le rendez-vous en « effectuée » (`attended`) (RM-039).
- Les valeurs réalisées restent vides tant qu'une série n'est pas validée.
- Une séance en cours se reprend plus tard, au point d'arrêt (RM-044), dans la limite de 4 heures sans activité (RM-065).

## Critères d'acceptation

- Le détail d'une séance prévue (B1) affiche « PRÉVUE », la date, « 1 bloc · 6 exercices », les blocs et la liste des exercices, et « ▶ Démarrer la séance ».
- Un appui crée la séance réalisée, copie le prévu et ouvre la liste des exercices (B2).
- B2 affiche « En cours · séance libre » (ou le nom du programme), le chrono de séance « ● 12:40 », « Séries réalisées 0 / 18 », chaque exercice avec « 0 / 3 séries » et son résumé.
- Le chrono se calcule à partir de l'heure de début enregistrée : il reste juste après un rechargement ou une mise en veille.
- À l'Accueil, une séance en cours affiche « Reprendre ma séance », qui ramène à B2.
- Tenter de démarrer une 2ᵉ séance affiche le refus et propose de reprendre celle en cours.
- Deux appuis rapides ne créent qu'une seule séance réalisée.
- Modifier le prévu après le démarrage ne change pas les valeurs copiées.

## Éléments affichés

### Séance prévue (B1)

**Étiquette :** PRÉVUE · **Texte :** Jeudi 26 novembre · 1 bloc · 6 exercices
**Bloc :** Classique · Force · « Développé couché · Tractions · Gainage · Tapis · Curl · Gainage latéral »
**Bouton :** ▶ Démarrer la séance (ou « Ajouter des exercices » si la séance est vide)

### Séance en cours (B2)

**En-tête :** En cours · séance libre · ● 12:40
**Compteur :** Séries réalisées · 3 / 18
**Ligne :** Développé couché · 1 / 3 séries · 3 séries · 10 rép. · 40 kg
**Boutons :** Abandonner · Terminer la séance

### Refus, séance déjà en cours

**Titre :** Une séance est déjà en cours
**Message :** Termine ou abandonne « Jambes » avant d'en démarrer une autre.
**Actions :** « Reprendre « Jambes » » · « Fermer »

### Erreur

« Impossible de démarrer la séance. » + « Réessayer »

## États à gérer

### Séance sans exercice

Bouton « Ajouter des exercices » à la place de « Démarrer ».

### Démarrage en cours

Bouton désactivé (pas de double démarrage).

### Séance déjà en cours

Refus explicite + accès direct à la séance en cours.

### Erreur API

Message + « Réessayer » ; l'état réel est rechargé (si la séance a quand même démarré, on l'ouvre).

### Chargement de B2

Structure grise, chrono masqué tant que l'heure de début n'est pas connue.

## Réponses API attendues

- Séance démarrée : `201` + `{ id }`
- Identifiant invalide : `400`
- Rendez-vous absent ou d'un autre utilisateur : `404`
- Rendez-vous effectué ou annulé : `409`, code `APPOINTMENT_NOT_STARTABLE`
- Une autre séance en cours : `409`, code `WORKOUT_ALREADY_IN_PROGRESS`, avec l'identifiant de la séance en cours
- Séance sans exercice : `422`, code `SESSION_WITHOUT_EXERCISE`
- `GET /api/workout-sessions/current` : `200` + séance ou `null`
- `GET /api/workout-sessions/:id` : `200` + arbre complet ; d'un autre : `404`

## Décisions

- **D-08** : le compteur « Séries réalisées » compte les étapes cardio comme des séries (une étape = une série en base).

## Hors périmètre

- Saisir une série (US-29), minuteur de repos (US-30), abandonner (US-33), terminer (US-34).
- Ajouter un exercice ou une série pendant la séance (US-32) : boutons masqués en MVP.
- Clôture automatique après 4 h (US-33).

## Tâches techniques

- [x] BDD : `workout_session`, `workout_block`, `workout_exercise`, `workout_set` ; index unique `uq_one_active_workout_per_user`
- [x] Backend : `appointmentRepository.readAppointmentForUpdate(id, userId)` : `SELECT id, status, session_version_id FROM appointment WHERE id = ? AND owner_user_id = ? FOR UPDATE`
- [x] Backend : `sessionTemplateRepository.countVersionExercises(versionId)` (jointure `template_block_exercise` → `template_block`)
- [x] Backend : `workoutSessionRepository.createWorkoutSession` : `INSERT … (appointment_id, owner_user_id, status, started_at, last_activity_at) VALUES (?, ?, 'in_progress', NOW(3), NOW(3))`
- [x] Backend : `copyTemplateBlocks(workoutSessionId, versionId)`, `copyTemplateExercises(workoutSessionId)`, `copyPlannedSets(workoutSessionId)` : trois `INSERT … SELECT` (colonnes `_planned` remplies, `_actual` vides)
- [x] Backend : `appointmentRepository.updateAppointmentStatus(id, status)`
- [x] Backend : `workoutSessionActions.start`, dans `withTransaction` : verrou → statut → nombre d'exercices → création (lire `ER_DUP_ENTRY` sur `uq_one_active_workout_per_user` → 409 avec l'identifiant de la séance en cours) → copie → `attended` → 201
- [x] Backend : `readCurrentWorkoutSession(userId)`, `readWorkoutSession(id, userId)`, `readWorkoutBlocks(id)`, `readWorkoutExercises(id)` (avec nom, groupe et mesures de l'exercice), `readWorkoutSets(id)` ; `workoutSessionActions.read` assemble l'arbre
- [x] Backend : routes : `POST /api/workout-sessions` ; `GET /api/workout-sessions/current` **déclarée avant** `GET /api/workout-sessions/:id`
- [x] Shared : `shared/workout-session.ts` : types `WorkoutSessionTree`, `WorkoutSetRow` ; `countValidatedSets`, `countPlannedSets`
- [x] Frontend : `workoutSessionService` : `startWorkoutSession(appointmentId)`, `readCurrentWorkoutSession()`, `readWorkoutSession(id)`
- [x] Frontend : `hooks/useWorkoutSession(id)`, `hooks/useSessionChrono(startedAt)` (calcul à partir de l'heure de début, pas d'un compteur)
- [x] Frontend : `pages/PlannedSessionPage.tsx` (B1), `pages/WorkoutPage.tsx` (B2), `components/WorkoutExerciseRow.tsx`, `components/AlreadyInProgressDialog.tsx`
- [x] Routing : `/seances/:appointmentId` (B1), `/entrainement/:id` (B2, plein écran)
- [x] Tests : back : copie identique au prévu ; 2ᵉ démarrage → 409 ; **deux démarrages simultanés** (`Promise.all`) → un seul 201 ; séance vide → 422 ; rendez-vous d'un autre → 404 ; rendez-vous annulé → 409 ; modifier ensuite une `planned_set` ne change pas `workout_set.*_planned`
- [x] Tests : unitaires : `useSessionChrono` avec faux minuteurs
- [x] Tests : E2E : démarrer depuis l'Accueil, recharger, « Reprendre ma séance » ; axe sur B1 et B2

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [x] Test de concurrence vert
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
