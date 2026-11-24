# Conventions de nommage

Règle de base : **le code est en anglais, ce que voit l'utilisateur est en français.**

## 1. Les langues

| Élément                                              | Langue   | Exemple                                     |
| ---------------------------------------------------- | -------- | ------------------------------------------- |
| Dossiers, fichiers, variables, fonctions             | Anglais  | `exerciseRepository.ts`, `readExercises`    |
| Tables, colonnes, valeurs de statut                  | Anglais  | `workout_session`, `status = 'in_progress'` |
| Clés JSON échangées entre client et serveur          | Anglais  | `{ "planned_date": "2026-11-23" }`          |
| Textes affichés, messages d'erreur montrés à l'écran | Français | « Démarrer la séance »                      |
| Commentaires dans le code                            | Anglais  | `// One function, one query.`               |
| Messages de commit                                   | Anglais  | `feat(exercise): add exercise list`         |
| Documentation (`docs/`)                              | Français | ce fichier                                  |

## 2. Une famille, un dossier

Chaque fonctionnalité porte **le même nom du serveur jusqu'à l'écran**, en kebab-case (mots en minuscules reliés par des tirets).

| Famille         | Serveur                     | Client                       |
| --------------- | --------------------------- | ---------------------------- |
| Utilisateur     | `server/src/modules/user/`  | `client/src/features/user/`  |
| Exercice        | `modules/exercise/`         | `features/exercise/`         |
| Séance modèle   | `modules/session-template/` | `features/session-template/` |
| Rendez-vous     | `modules/appointment/`      | `features/appointment/`      |
| Programme       | `modules/program/`          | `features/program/`          |
| Séance réalisée | `modules/workout-session/`  | `features/workout-session/`  |
| Historique      | `modules/history/`          | `features/history/`          |
| Notification    | `modules/notification/`     | `features/notification/`     |

## 3. Les fichiers

### Serveur : le routeur dit où, l'action dit comment, le repository dit quoi

| Fichier    | Rôle                                                          | Nom                     |
| ---------- | ------------------------------------------------------------- | ----------------------- |
| Routeur    | relie une adresse à une action                                | `exerciseRouter.ts`     |
| Actions    | vérifie la demande, applique les règles, choisit le code HTTP | `exerciseActions.ts`    |
| Repository | fait une requête SQL, rien d'autre                            | `exerciseRepository.ts` |
| Middleware | contrôle avant l'action (connexion, validation)               | `authenticate.ts`       |

### Client

| Fichier                     | Nom                 | Exemple                |
| --------------------------- | ------------------- | ---------------------- |
| Page                        | PascalCase + `Page` | `ExerciseListPage.tsx` |
| Composant                   | PascalCase          | `ExerciseCard.tsx`     |
| Hook                        | `use` + nom         | `useExercises.ts`      |
| Service (appels au serveur) | famille + `Service` | `exerciseService.ts`   |
| Contexte                    | nom + `Context`     | `AuthContext.tsx`      |
| Util                        | verbe + nom         | `formatWeight.ts`      |

### Partagé

Les types communs au client et au serveur vivent dans `shared/`, un fichier par famille : `shared/catalog.ts`, `shared/workout-session.ts`.

## 4. Les fonctions

- **Une fonction, une requête.** Si une lecture a besoin de trois requêtes, on écrit trois fonctions, et c'est l'action qui les appelle l'une après l'autre.
- **Le verbe dit ce que fait la fonction.** `read` fait un `SELECT`. Les autres verbes modifient la base : `create`, `update`, `start`, `complete`, `cancel`, `delete`.
- **Pluriel pour une liste, singulier pour un élément.** `readExercises` renvoie une liste, `readExercise` en renvoie un seul.
- **Le même ordre partout.** Dans le repository, les actions et le service, les fonctions suivent l'ordre de la vie d'un élément : créer, lire, modifier, démarrer, terminer, supprimer.
- **Les gestionnaires d'événements** commencent par `handle` : `handleStart`, `handleValidateSet`.
- **Les booléens** commencent par `is`, `has` ou `can` : `isArchived`, `hasValidatedSets`, `canStart`.

## 5. La base de données

- Tables au singulier, en snake_case : `exercise`, `workout_set`.
- Clé primaire : `id`. Clé étrangère : nom de la table + `_id` (`exercise_id`).
- Dates et horodatages : `_date`, `_time`, `_at` (`planned_date`, `validated_at`).
- Booléens : `is_` ou un participe (`is_archived`, `moved_manually`).
- Unité dans le nom quand il y en a une : `weight_kg`, `duration_seconds`.
- Contraintes : `uq_` (unique), `fk_` (clé étrangère), `ck_` (vérification), `ix_` (index).

## 6. Les routes de l'API

- Préfixe `/api`, nom de famille au pluriel, en kebab-case : `/api/exercises`, `/api/workout-sessions`.
- Une action précise devient un verbe à la fin : `POST /api/workout-sessions/:id/complete`.
- Les routes fixes avant les routes avec paramètre : `/current` est déclarée avant `/:id`, sinon Express prend « current » pour un identifiant.

## 7. Git

- Branche par US : `feat/us-01-exercise-list`, `fix/...`, `refactor/...`, `chore/...`.
- Messages au format `type(famille): ce qui change`, en anglais : `feat(exercise): add exercise detail page`.
- Types : `feat` (fonctionnalité), `fix` (correction), `refactor` (réorganisation sans changer le comportement), `chore` (outillage), `docs`, `test`, `style`.
