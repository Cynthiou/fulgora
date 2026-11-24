# Backlog Fulgora

Version finale du 24 novembre 2026 · 60 cartes : 8 tâches de socle (T-01 à T-08) et 52 user stories.

## Comment utiliser ce backlog

- **Une carte = une branche = une pull request vers `dev`.** On prend les cartes dans l'ordre des sprints, et dans l'ordre de la liste à l'intérieur d'un sprint.
- **Chaque carte est autonome** : pour développer une US, Claude Code lit la carte, `docs/business-rules.md`, `docs/naming-conventions.md` et `server/database/schema.sql`.
- **Ordre des couches dans une US** : BDD → Shared → Backend (repository, actions, router) → tests back → Service → Hooks → Composants → Page → Routing → tests front → E2E.
- **Rien hors périmètre** : ce qui n'est pas dans la carte n'est pas codé ; un manque se signale, il ne s'invente pas.
- **Fini** = la checklist « Tâches techniques » cochée, la « Definition of Done » de la carte et la Definition of Done commune (en bas) vérifiées.
- **Git** : commits `feat(famille): …` en anglais, sous l'identité de Cynthia, sans aucune mention de Claude (ni Co-Authored-By, ni lien de session).
- **Les décisions** D-01 à D-19 ont été prises par défaut pour terminer le backlog. Chacune peut être changée : il suffit de modifier la carte concernée avant son sprint.

## Règles techniques communes

1. **Une fonction de repository = une requête SQL**, toujours paramétrée (`?`), toujours filtrée par l'utilisateur connecté pour une donnée privée.
2. **Le repository ne contient aucune règle métier** : l'action décide, le repository exécute.
3. **Une donnée dérivée n'est jamais stockée** (tonnage, durée, écarts, records, 1RM) : elle est calculée par une fonction pure de `shared/`, testée à part.
4. **Codes HTTP** : 400 données invalides · 401 pas connecté · 403 origine refusée · 404 absent ou appartenant à un autre · 409 conflit d'état · 422 règle métier refusée · 429 trop d'essais.
5. **Format d'erreur unique** : `{ "error": { "code": "…", "message": "…", "field": "…" } }`, message en français affichable tel quel.
6. **Écriture dans plusieurs tables** : toujours dans `withTransaction` ; `SELECT … FOR UPDATE` quand on lit pour décider d'une écriture.
7. **Dates** : « aujourd'hui » est calculé par le serveur dans le fuseau de l'utilisateur et passé en paramètre SQL, jamais `CURRENT_DATE`.
8. **Pièges mysql2** : `LIMIT ?` / `OFFSET ?` avec `execute` → chaînes (`String(n)`) ; tableau dans `IN (?)` → `query`.
9. **Routes fixes avant les routes avec paramètre** (`/current` avant `/:id`).
10. **Accessibilité** : jamais d'information portée par la couleur seule, focus visible, zones de 44 px, libellés explicites, `aria-live` pour les messages.
11. **Paquets** : toujours `npm install --ignore-scripts`. Fichiers `.env` jamais lus ni affichés.

## Décisions prises pour terminer le backlog

| Code | Question | Décision | Cartes |
|---|---|---|---|
| D-01 | Q-01 Notifications | Cloche dans l'en-tête des 4 onglets, à gauche de l'avatar | US-44, US-46 |
| D-02 | Q-02 Gauche / droite | Modèle de la maquette : réglage par exercice, même objectif de répétitions ou de durée, charge éventuellement différente par côté, résultats côté par côté. Nouvelle US-51 | US-15, US-29, US-49, US-51 |
| D-03 | Q-03 Changer le type d'un bloc | Objectifs compatibles gardés, les autres vidés ; Note interdite tant que le bloc a des exercices ; en MVP, seulement sur un bloc vide | US-13, US-17 |
| D-04 | Q-04 Indicateurs d'accueil | Séances faites cette semaine · Temps d'entraînement de la semaine · Aucun | US-05, US-42 |
| D-05 | Q-05 Propositions du Profil | Les 5 propositions des maquettes sont adoptées | US-03, US-06, US-46, US-47 |
| D-06 | O-02 Blocs chronométrés | Un total par bloc (tours, répétitions en plus, durée) | US-43, US-31 |
| D-07 | Q-07 Filtres de l'historique | En V1, nouvelle US-52 | US-35, US-52 |
| D-08 | Compteur de séries | Une étape cardio compte comme une série | US-28 |
| D-09 | Abandon sans série | RM-045 telle quelle : « inachevée » sans résultat | US-33 |
| D-10 | Terminer sans série | Refusé (`422`), « Abandonner » proposé | US-34 |
| D-11 | Migration 004 | `user.terms_accepted_at`, `user.timezone`, `workout_session.auto_closed`, `workout_session.declared_afterwards` | T-04 |
| D-12 | O-04 Fuseau horaire | Fuseau de l'utilisateur, `Europe/Paris` par défaut | US-27, T-04 |
| D-13 | Connexion | JWT dans un cookie `httpOnly`, limite de révocation documentée | T-06 |
| D-14 | Cartes musculaires manquantes | Muscles affichés en texte en attendant les dessins | T-08 |
| D-15 | Écrans non maquettés | Première tâche de la carte : maquetter et faire valider | US-10, US-11, US-31 |
| D-16 | Exercice personnalisé | Les séances déjà prévues gardent l'exercice d'origine | US-11 |
| D-17 | Q-06 Chronométrer un exercice | V1 ; en MVP, durée saisie à la main | US-49 |
| D-18 | O-03 Provenance | Pas de distinction pendant / après coup : « ajouté » | US-32, US-37 |
| D-19 | Muscles : cardio et mobilité | Exclus par le groupe (Cardio, Étirements) | US-50 |

## Évolutions de la base

| Migration | Contenu | Carte |
|---|---|---|
| 001 | Schéma actuel (25 tables) | T-04 |
| 002 | `appointment.cancelled_at` + contrainte | T-04 (utilisé par US-21, US-26) |
| 003 | `program.status` avec `draft` | T-04 (utilisé par US-18) |
| 004 | `user.terms_accepted_at`, `user.timezone`, `workout_session.auto_closed`, `workout_session.declared_afterwards` | T-04 |
| 005 | Exercices « chaque côté » : `is_per_side`, charges gauche / droite, table `workout_set_side` | US-51 |

## Plan des sprints

| Sprint | Cartes | Points |
|---|---|---|
| Sprint 0 · Socle technique | T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08 | 21 |
| Sprint 01 · Compte et navigation | US-01, US-02, US-03, US-44 | 13 |
| Sprint 02 · Catalogue | US-07, US-08, US-09 | 9 |
| Sprint 03 · Préparer une séance libre | US-12, US-13, US-14, US-15, US-23 | 18 |
| Sprint 04 · Faire sa séance | US-28, US-29, US-30, US-33, US-34 | 19 |
| Sprint 05 · Historique (fin du MVP) | US-35, US-36 | 6 |
| Sprint 06 · Planning et notifications | US-24, US-26, US-27, US-25, US-46 | 25 |
| Sprint 07 · Créer un programme | US-48, US-18, US-19 | 16 |
| Sprint 08 · Faire évoluer séances et programmes | US-16, US-17, US-20, US-21 | 24 |
| Sprint 09 · Historique complet | US-37, US-38, US-52 | 13 |
| Sprint 10 · Entraînement avancé | US-32, US-49, US-51 | 16 |
| Sprint 11 · Progression et Suivi | US-39, US-40, US-41, US-50 | 22 |
| Sprint 12 · Profil et installation | US-04, US-05, US-47, US-06, US-45 | 16 |
| Sprint 13 · Blocs chronométrés et exercices personnels | US-43, US-31, US-10, US-11 | 20 |
| Plus tard | US-22, US-42 | 5 |

**Total :** 243 points. MVP = Sprint 0 à Sprint 05 (19 US) ; V1 = Sprint 06 à Sprint 13 (31 US) ; Plus tard : 2 US.

## Sommaire

**Sprint 0 · Socle technique**

- T-01 · Outils de qualité et de test
- T-02 · Sécurité HTTP
- T-03 · Validation des données reçues
- T-04 · Migrations de la base
- T-05 · Accès à la base et transactions
- T-06 · Authentification : socle
- T-07 · Socle client
- T-08 · Données de départ

**Sprint 01 · Compte et navigation**

- US-01 · S'inscrire
- US-02 · Se connecter
- US-03 · Se déconnecter
- US-44 · Naviguer dans l'appli et page Accueil

**Sprint 02 · Catalogue**

- US-07 · Parcourir le catalogue
- US-08 · Chercher et filtrer
- US-09 · Voir la fiche d'un exercice

**Sprint 03 · Préparer une séance libre**

- US-12 · Créer une séance
- US-13 · Ajouter un bloc
- US-14 · Ajouter des exercices dans un bloc
- US-15 · Définir les séries prévues
- US-23 · Planifier une séance libre (enregistrement)

**Sprint 04 · Faire sa séance**

- US-28 · Démarrer une séance
- US-29 · Valider une série
- US-30 · Minuteur de repos
- US-33 · Abandonner une séance (et clôture après 4 heures)
- US-34 · Terminer une séance

**Sprint 05 · Historique (fin du MVP)**

- US-35 · Voir mon historique
- US-36 · Voir le détail d'une séance passée

**Sprint 06 · Planning et notifications**

- US-24 · Voir mon planning
- US-26 · Annuler une séance
- US-27 · Confirmer une séance passée (À confirmer, Manquée)
- US-25 · Déplacer une séance
- US-46 · Consulter mes notifications

**Sprint 07 · Créer un programme**

- US-48 · Voir mes programmes
- US-18 · Créer un programme
- US-19 · Planifier les séances de la semaine

**Sprint 08 · Faire évoluer séances et programmes**

- US-16 · Réordonner blocs, exercices et séries
- US-17 · Modifier une séance
- US-20 · Modifier le programme (jours, heures, période)
- US-21 · Raccourcir, abandonner ou supprimer un programme

**Sprint 09 · Historique complet**

- US-37 · Corriger une séance passée
- US-38 · Déclarer une séance faite après coup
- US-52 · Filtrer l'historique

**Sprint 10 · Entraînement avancé**

- US-32 · Ajouter un exercice ou une série en cours de séance
- US-49 · Chronométrer un exercice en durée ou en cardio
- US-51 · Exercices « chaque côté » (gauche / droite)

**Sprint 11 · Progression et Suivi**

- US-39 · Progression d'un exercice
- US-40 · Records personnels
- US-41 · Résumé du suivi (régularité et travail)
- US-50 · Muscles travaillés

**Sprint 12 · Profil et installation**

- US-04 · Modifier mon profil
- US-05 · Régler mes préférences
- US-47 · Changer mon mot de passe
- US-06 · Supprimer mon compte
- US-45 · Installer l'appli sur mon téléphone

**Sprint 13 · Blocs chronométrés et exercices personnels**

- US-43 · Ajouter un bloc chronométré (Circuit, AMRAP, For Time)
- US-31 · Minuteur de bloc (Circuit, AMRAP, For Time)
- US-10 · Créer un exercice personnel
- US-11 · Personnaliser ou archiver un exercice

**Plus tard**

- US-22 · Réutiliser un programme
- US-42 · Indicateur d'accueil

# Sprint 0 · Socle technique

## T-01 · Outils de qualité et de test

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** aucune
**Intégration future :** toutes les US
**Branche :** `chore/t-01-quality-tools`

### User story

En tant que développeuse, je veux que chaque PR soit vérifiée automatiquement afin de ne jamais fusionner du code cassé dans `dev`.

### Pourquoi

Le projet vise beaucoup de tests (unitaires, intégration, bout en bout) et une PR par US. Sans vérification automatique, une erreur de type, de format ou un test rouge peut passer dans `dev` sans que personne ne le voie.

### Règles métier

- Une PR vers `dev` ne peut pas être fusionnée si Biome, TypeScript ou un test échoue.
- Les tests d'intégration tournent sur une base `fulgora_test`, jamais sur la base de développement.
- Les paquets s'installent toujours avec `--ignore-scripts`.

### Critères d'acceptation

- `npm run check` lance Biome sur tout le dépôt.
- `npm run typecheck` vérifie le client et le serveur.
- `npm test` lance les tests Vitest du serveur et du client.
- `npm run test:e2e` lance Playwright sur l'appli démarrée.
- Un workflow GitHub Actions lance `check`, `typecheck` et `test` à chaque PR vers `dev`, avec un service MySQL 8.
- Une PR avec une erreur Biome est marquée en échec.
- Une PR avec un test rouge est marquée en échec.

### Réponses attendues

- CI verte : la PR peut être relue.
- CI rouge : le nom de l'étape en échec est visible dans la PR.

### Hors périmètre

- Déploiement en production.
- Protection de branche sur GitHub (réglage du dépôt, fait à la main par Cynthia).

### Tâches techniques
- [ ] Outillage : installer `vitest`, `supertest`, `@types/supertest` dans `server` (`--ignore-scripts`)
- [ ] Outillage : installer `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` dans `client`
- [ ] Outillage : installer `@playwright/test` et `@axe-core/playwright` à la racine
- [ ] Outillage : ajouter les scripts `typecheck`, `test`, `test:e2e` à la racine et dans chaque workspace
- [ ] Outillage : `vitest.config.ts` serveur (environnement node) et client (environnement jsdom)
- [ ] Outillage : `playwright.config.ts` : un projet mobile 375 px et un projet ordinateur 1280 px, `webServer` qui lance `npm run dev`
- [ ] CI : `.github/workflows/ci.yml` : `npm ci --ignore-scripts`, `check`, `typecheck`, migration de `fulgora_test`, `test`
- [ ] Tests : un test unitaire témoin par workspace et un test E2E témoin (la page de connexion s'affiche)

### Definition of Done
- [ ] Les 4 scripts fonctionnent en local
- [ ] Une PR de test volontairement cassée est bien refusée par la CI
- [ ] Aucune trace de Claude dans les commits ni dans la PR

## T-02 · Sécurité HTTP

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-01
**Intégration future :** toutes les routes
**Branche :** `chore/t-02-http-security`
**Règles :** DT-03, DT-07

### User story

En tant qu'utilisatrice, je veux que l'appli refuse les requêtes venues d'autres sites et les attaques par force brute afin que mon compte reste protégé.

### Pourquoi

Le jeton de connexion est dans un cookie : le navigateur l'envoie tout seul. Sans contrôle d'origine, un site malveillant pourrait déclencher une action à la place de l'utilisatrice (attaque CSRF). Sans limite de tentatives, un robot pourrait essayer des milliers de mots de passe.

### Règles métier

- Toute requête `POST`, `PUT`, `PATCH` ou `DELETE` doit venir d'une origine autorisée.
- L'origine est lue dans l'en-tête `Origin`, sinon dans `Referer`. Sans aucun des deux : refus.
- La comparaison est exacte (pas de « commence par »).
- Les origines autorisées viennent de la variable d'environnement `ALLOWED_ORIGINS`.
- Connexion et inscription : 5 essais par 15 minutes et par adresse IP.
- Une erreur imprévue ne renvoie jamais de détail technique.

### Critères d'acceptation

- `X-Powered-By` n'apparaît plus dans les réponses.
- Helmet ajoute ses en-têtes de sécurité à toutes les réponses.
- Un corps JSON de plus de 100 Ko est refusé.
- Un POST sans `Origin` ni `Referer` répond 403.
- Un POST avec l'origine d'un autre site répond 403.
- Un POST avec la bonne origine passe.
- Un GET n'est pas concerné par le contrôle d'origine.
- La 6ᵉ tentative de connexion en 15 minutes répond 429.
- Toutes les erreurs suivent le format `{ "error": { "code", "message", "field" } }`.

### Réponses API attendues

- Origine refusée : `403 Forbidden`, code `FORBIDDEN_ORIGIN`
- Trop de tentatives : `429 Too Many Requests`, code `TOO_MANY_REQUESTS`, message « Trop de tentatives. Réessaie dans quelques minutes. »
- Erreur imprévue : `500`, code `INTERNAL_ERROR`, message « Une erreur est survenue. Réessaie plus tard. »

### Hors périmètre

- Authentification (T-06).
- Validation des données (T-03).

### Tâches techniques
- [ ] Outillage : installer `helmet` et `express-rate-limit` (`--ignore-scripts`)
- [ ] Backend : `app.ts` : `app.disable("x-powered-by")`, `helmet()`, `express.json({ limit: "100kb" })`
- [ ] Backend : créer `server/src/utils/httpError.ts` : classe `HttpError(status, code, message, field?)`
- [ ] Backend : créer `server/src/middlewares/checkOrigin.ts` : méthodes concernées, lecture `Origin` puis `Referer` (origine extraite avec `new URL`), comparaison exacte avec `ALLOWED_ORIGINS`
- [ ] Backend : créer `server/src/middlewares/rateLimiters.ts` : `authLimiter` (5 / 15 min) et `apiLimiter` (300 / 15 min), réponse au format commun
- [ ] Backend : remplacer le gestionnaire d'erreurs de `app.ts` : `HttpError` → son statut et son JSON ; autre erreur → log serveur + 500 générique
- [ ] Backend : ajouter `ALLOWED_ORIGINS` dans `.env.sample` (jamais dans `.env` versionné)
- [ ] Tests : 403 sans origine, 403 mauvaise origine, 200 bonne origine, GET non bloqué, 429 au 6ᵉ essai, `X-Powered-By` absent, 500 sans détail

### Definition of Done
- [ ] Tous les tests de la checklist passent
- [ ] Aucun secret ni origine en dur dans le code
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript

## T-03 · Validation des données reçues

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-02
**Intégration future :** toutes les routes qui reçoivent des données
**Branche :** `chore/t-03-validation`
**Règles :** DT-05

### User story

En tant que développeuse, je veux que chaque donnée reçue soit vérifiée par un schéma avant d'arriver dans l'action afin que l'action ne travaille que sur des données propres.

### Pourquoi

Le client peut être contourné : n'importe qui peut envoyer une requête à la main. Le serveur doit vérifier lui-même le type, la longueur et les bornes de chaque valeur.

### Règles métier

- Les schémas vivent dans `shared/`, pour que le client et le serveur utilisent les mêmes règles.
- Une donnée invalide ne va jamais jusqu'à l'action.
- Les champs inconnus sont retirés.
- Les chaînes sont nettoyées de leurs espaces au début et à la fin.

### Critères d'acceptation

- Le middleware `validate({ body, params, query })` accepte un schéma Zod par partie de la requête.
- Après validation, `req.body` (ou `params`, `query`) contient la version nettoyée.
- Une donnée invalide répond 400 avec la liste des champs fautifs.
- `idParamSchema` refuse `0`, `-1`, `1.5`, `abc`.

### Réponses API attendues

- Données invalides : `400 Bad Request`, code `VALIDATION_ERROR`, avec `fields: [{ field, message }]`.

### Hors périmètre

- Les schémas propres à chaque US (écrits dans chaque US).

### Tâches techniques
- [ ] Outillage : installer `zod` dans `shared` (`--ignore-scripts`)
- [ ] Shared : créer `shared/validation.ts` : `idParamSchema`, `dateSchema` (AAAA-MM-JJ, date réelle), `timeSchema` (HH:MM)
- [ ] Backend : créer `server/src/middlewares/validate.ts`
- [ ] Tests : unitaires des schémas communs ; intégration d'une route témoin (400 avec le détail des champs)

### Definition of Done
- [ ] Tests verts
- [ ] Messages d'erreur en français, affichables tels quels

## T-04 · Migrations de la base

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-01
**Intégration future :** toute évolution de la base
**Branche :** `chore/t-04-migrations`
**Règles :** DT-19

### User story

En tant que développeuse, je veux faire évoluer la base avec des migrations numérotées afin de ne jamais perdre de données et de savoir exactement dans quel état est chaque base.

### Pourquoi

`migrate.ts` crée aujourd'hui la base depuis `schema.sql`. Dès qu'il y aura de vraies données, il faudra ajouter des colonnes sans tout effacer.

### Règles métier

- Chaque migration a un numéro et ne s'applique qu'une fois.
- `db:reset` est refusé quand `NODE_ENV=production`.
- Les identifiants viennent uniquement de l'environnement.

### Critères d'acceptation

- `server/database/migrations/` contient `001_initial_schema.sql`, `002_appointment_cancelled_at.sql`, `003_program_draft_status.sql`, `004_user_terms_and_auto_closed.sql`.
- La table `schema_migration (version INT PRIMARY KEY, applied_at DATETIME(3))` garde la trace des migrations appliquées.
- `npm run db:migrate` n'applique que les migrations manquantes, dans l'ordre.
- Relancer `db:migrate` ne fait rien et ne plante pas.
- `npm run db:reset` en production affiche un refus et s'arrête.

### Décisions

- **D-02** : migration 005 pour les exercices « chaque côté » (US-51).
- **D-11** : la migration 004 contient aussi `user.timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris'` (D-12) et `workout_session.declared_afterwards BOOLEAN NOT NULL DEFAULT FALSE` (US-38).

### Hors périmètre

- Données de départ (T-08).

### Tâches techniques
- [ ] BDD : `001` = le schéma actuel de `schema.sql`
- [ ] BDD : `002` : `appointment.cancelled_at` + contrainte `ck_appointment_cancelled_at`
- [ ] BDD : `003` : `program.status` avec `draft`
- [ ] BDD : `004` : `user.terms_accepted_at DATETIME(3) NOT NULL` et `workout_session.auto_closed BOOLEAN NOT NULL DEFAULT FALSE`
- [ ] Backend : réécrire `server/bin/migrate.ts` : crée `schema_migration`, lit les fichiers dans l'ordre, applique les manquants, enregistre chaque version
- [ ] Backend : `--reset` : refusé si `NODE_ENV=production`, sinon supprime et recrée la base puis applique tout
- [ ] Tests : base vide → 4 versions ; relance → rien ; reset en production → refus

### Definition of Done
- [ ] Base de développement et base de test migrées sans erreur
- [ ] `schema.sql` mis à jour pour refléter l'état final (documentation)

## T-05 · Accès à la base et transactions

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-04
**Intégration future :** US-23, US-28 et toute écriture dans plusieurs tables
**Branche :** `chore/t-05-transactions`
**Règles :** DT-09, DT-17

### User story

En tant que développeuse, je veux un outil simple pour écrire dans plusieurs tables d'un coup afin que l'appli n'enregistre jamais une donnée à moitié.

### Pourquoi

Créer une séance écrit dans 6 tables. Si la 4ᵉ écriture échoue, les 3 premières doivent être annulées.

### Règles métier

- Une transaction est soit entièrement enregistrée, soit entièrement annulée.
- Une connexion empruntée au pool est toujours rendue, même en cas d'erreur.
- L'utilisateur MySQL de l'appli n'a que `SELECT, INSERT, UPDATE, DELETE` sur la base.

### Critères d'acceptation

- `withTransaction(async (connection) => …)` valide si tout réussit, annule si une erreur est levée, et rend la connexion dans les deux cas.
- Chaque fonction de repository accepte un paramètre `db: Queryable = client` (le pool ou la connexion de la transaction).
- Une transaction qui lève une erreur au milieu ne laisse aucune ligne.

### Hors périmètre

- Verrous propres à chaque US (`FOR UPDATE`), écrits dans l'US concernée.

### Tâches techniques
- [ ] Backend : `database/client.ts` : exporter le type `Queryable`
- [ ] Backend : créer `database/withTransaction.ts` (`getConnection`, `beginTransaction`, `commit`, `rollback`, `release` dans `finally`)
- [ ] BDD : documenter dans `docs/` la création de l'utilisateur MySQL à droits limités (commande à lancer par Cynthia)
- [ ] Tests : transaction réussie ; erreur au milieu → aucune ligne ; connexion rendue (le pool ne s'épuise pas après 20 échecs)

### Definition of Done
- [ ] Tests verts
- [ ] La notion de transaction est expliquée en commentaire en tête du fichier

## T-06 · Authentification : socle

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-02, T-03
**Intégration future :** US-01, US-02, US-03 et toutes les routes privées
**Branche :** `chore/t-06-auth-core`
**Règles :** DT-01, DT-02, DT-06

### User story

En tant qu'utilisatrice, je veux que mon mot de passe soit protégé et que l'appli sache qui je suis à chaque requête afin que personne d'autre ne voie mes données.

### Pourquoi

Les US Compte ont besoin de hacher les mots de passe, de créer un jeton et de protéger les routes. On prépare ces outils une fois pour toutes.

### Règles métier

- Mot de passe haché avec Argon2id, jamais stocké, renvoyé ni écrit dans les logs.
- Jeton signé (JWT, HS256) avec un secret d'au moins 32 caractères lu dans `JWT_SECRET`, valable 7 jours.
- Jeton dans un cookie `fulgora_token` : `httpOnly`, `secure` en production, `sameSite: "strict"`, `path: "/"`.
- Une route privée sans jeton valide répond 401.
- L'identifiant de l'utilisateur vient **toujours** du jeton, jamais du corps de la requête.

### Critères d'acceptation

- `hashPassword` produit un hachage qui commence par `$argon2id$`.
- `verifyPassword` renvoie vrai pour le bon mot de passe, faux sinon.
- `authenticate` place `req.userId` quand le jeton est valide.
- Jeton absent, expiré ou signé avec un autre secret : 401.
- Au démarrage, le serveur refuse de se lancer si `JWT_SECRET` fait moins de 32 caractères.

### Réponses API attendues

- Pas connecté : `401 Unauthorized`, code `UNAUTHENTICATED`, message « Connecte-toi pour continuer. »

### Décisions

- **D-13** : jeton signé (JWT) dans un cookie, plus simple à expliquer. Limite assumée et documentée : il ne se révoque pas avant son expiration (7 jours). Évolution possible : table de sessions.

### Hors périmètre

- Pages d'inscription et de connexion (US-01, US-02).

### Tâches techniques
- [ ] Outillage : installer `argon2` et `jsonwebtoken` (+ `@types/jsonwebtoken`) (`--ignore-scripts` puis construction du module natif d'argon2 vérifiée)
- [ ] Backend : `utils/password.ts` : Argon2id, mémoire 19 456 Kio, 2 passes, parallélisme 1
- [ ] Backend : `utils/token.ts` : `signToken(userId)`, `verifyToken(token)`
- [ ] Backend : `utils/authCookie.ts` : `setAuthCookie(res, token)`, `clearAuthCookie(res)` avec les mêmes options
- [ ] Backend : `middlewares/authenticate.ts` ; type Express étendu pour `req.userId`
- [ ] Backend : contrôle de `JWT_SECRET` au démarrage dans `main.ts`
- [ ] Tests : unitaires (hachage, vérification, jeton expiré) ; intégration d'une route témoin protégée

### Definition of Done
- [ ] Tests verts
- [ ] Aucun mot de passe ni jeton dans les logs

## T-07 · Socle client

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-06
**Intégration future :** toutes les pages
**Branche :** `chore/t-07-client-core`

### User story

En tant que développeuse, je veux des briques communes côté client (appel au serveur, utilisateur connecté, états de chargement) afin que chaque page les réutilise au lieu de les réécrire.

### Pourquoi

Chaque page charge des données, peut échouer et doit afficher un état vide. Sans briques communes, chaque page le ferait à sa façon.

### Règles métier

- Le client ne parle au serveur que par `apiFetch`.
- Une erreur du serveur arrive dans le client avec son `code` et son `message`.
- Une page privée n'est jamais affichée sans utilisateur connecté.
- Pas de bibliothèque de chargement (React Query) : `useState` + `useEffect`, explicables simplement.

### Critères d'acceptation

- `apiFetch` lève une `ApiError(status, code, message, field)` quand la réponse n'est pas OK.
- `AuthContext` charge l'utilisateur au démarrage par `GET /api/auth/me` et expose `user`, `isLoading`, `login`, `logout`.
- `ProtectedRoute` redirige vers `/connexion` sans utilisateur, et revient à la page demandée après connexion.
- Les composants `LoadingState`, `ErrorState` (avec « Réessayer »), `EmptyState` et `StatusBadge` existent.
- `StatusBadge` affiche toujours un symbole **et** un texte.
- Une requête en cours est annulée (`AbortController`) quand la page se ferme.

### Éléments affichés

- Chargement générique : « Chargement… » (lu par les lecteurs d'écran)
- Erreur générique : « Une erreur est survenue. » + bouton « Réessayer »
- Statuts (symbole + texte, repris du Planning) : Planifiée · ✓ Effectuée · Inachevée · À confirmer · × Manquée · / Annulée · ↷ Déplacée

### Hors périmètre

- Barre d'onglets et mise en page (US-44).

### Tâches techniques
- [ ] Frontend : `services/apiError.ts` + mise à jour de `apiFetch`
- [ ] Frontend : `contexts/AuthContext.tsx` + `hooks/useAuth.ts`
- [ ] Frontend : `components/ProtectedRoute.tsx`
- [ ] Frontend : `components/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `StatusBadge.tsx`
- [ ] Shared : `shared/status.ts` : liste des statuts, libellés et symboles (une seule source pour toutes les pages)
- [ ] Tests : `apiFetch` (erreur lue), `ProtectedRoute` (redirection), `StatusBadge` (symbole + texte)

### Definition of Done
- [ ] Tests verts
- [ ] axe sans violation sur les composants communs

## T-08 · Données de départ

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-04
**Intégration future :** US-07, US-15, tests E2E
**Branche :** `chore/t-08-seed`

### User story

En tant que développeuse, je veux un catalogue complet et un compte de démonstration afin de développer et tester sur des données réalistes.

### Pourquoi

Les exercices au poids du corps n'ont que la mesure « répétitions » : impossible de saisir un lest (maquette B5a). Il faut aussi des données pour les tests E2E.

### Règles métier

- Le compte de démonstration n'est jamais créé en production.
- Le catalogue commun n'a pas de propriétaire (`owner_user_id` à `NULL`).

### Critères d'acceptation

- Les 42 exercices au poids du corps ont aussi la mesure « charge » (pour le lest).
- Les 24 nouveaux exercices (id 152 à 175) et les 4 nouveaux équipements sont dans le catalogue.
- `npm run db:seed:dev` crée un compte de démonstration et quelques séances, et refuse en production.

### Décisions

- **D-14** : les 24 nouveaux exercices restent sans carte musculaire au départ ; la fiche affiche alors les muscles en texte seulement. Les cartes sont ajoutées dès qu'elles sont dessinées.

### Tâches techniques
- [ ] BDD : mettre à jour `catalog.json` (mesure « charge » sur le profil `bodyweight`)
- [ ] Backend : `bin/seedDev.ts` : compte de démonstration (mot de passe lu dans l'environnement), une séance libre, refus si `NODE_ENV=production`
- [ ] Tests : après seed, `exercise_measure` contient la charge pour Tractions

### Definition of Done
- [ ] Seed relancé sur une base vide sans erreur

# Sprint 01 · Compte et navigation

## US-01 · S'inscrire

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** T-02, T-03, T-04, T-06, T-07
**Intégration future :** US-02 (connexion), US-44 (Accueil)
**Branche :** `feat/us-01-signup`
**Maquettes :** écran 01, états 1 à 5
**Règles :** RM-001, RM-002, DT-01, DT-07

### User story

En tant que visiteur, je veux créer un compte afin de garder mes séances et ma progression.

### Pourquoi

Toutes les données de Fulgora sont personnelles : séances, programmes, résultats. Sans compte, rien ne peut être retrouvé d'une visite à l'autre ni d'un appareil à l'autre.

### Règles métier

- Pseudo, adresse e-mail, mot de passe et acceptation des CGU sont obligatoires (RM-001).
- Le pseudo et l'adresse e-mail sont uniques (sans tenir compte des majuscules).
- Le pseudo fait 3 à 30 caractères : lettres, chiffres, `.`, `_`, `-`.
- L'adresse e-mail est enregistrée en minuscules.
- Le mot de passe fait au moins 8 caractères (128 au plus) et contient au moins un chiffre.
- Le mot de passe est haché avec Argon2id et n'est jamais enregistré, renvoyé ni écrit dans les logs (RM-002, DT-01).
- La date d'acceptation des CGU est enregistrée (`terms_accepted_at`).
- Après l'inscription, la session est ouverte directement : pas besoin de se reconnecter.

### Critères d'acceptation

- Le formulaire affiche Pseudo, Adresse e-mail, Mot de passe et la case CGU, décochée par défaut.
- Le mot de passe est masqué par défaut ; « Afficher » / « Masquer » bascule sa visibilité.
- Les liens CGU et Politique de confidentialité s'ouvrent sans perdre la saisie.
- « Entrée » sur le dernier champ envoie le formulaire.
- Un champ vide affiche « Ce champ est obligatoire. » sous le champ.
- Un pseudo déjà pris affiche « Ce pseudo est déjà utilisé. Choisis-en un autre. »
- Une adresse déjà utilisée affiche « Un compte existe déjà avec cette adresse. » avec le lien « Se connecter », qui ouvre la connexion avec l'adresse pré-remplie.
- Après une erreur, le pseudo, l'adresse et la case restent remplis ; le mot de passe est vidé.
- Le résumé des erreurs en haut est annoncé aux lecteurs d'écran et le focus va sur le premier champ en erreur.
- Pendant l'envoi, le bouton est désactivé et les champs sont en lecture seule (un seul envoi possible).
- Après succès, l'écran « Compte créé » s'affiche, puis l'Accueil.
- En base, le hachage commence par `$argon2id$` et `terms_accepted_at` est rempli.

### Éléments affichés

#### Formulaire

**Titre :** Créer mon compte
**Texte :** Crée ton compte pour planifier tes séances et suivre ta progression.
**Champs :** Pseudo * (Ex. lea.m) · Adresse e-mail * (nom@exemple.fr) · Mot de passe * (8 caractères minimum)
**Aide :** 8 caractères minimum, dont un chiffre.
**Case :** J'accepte les Conditions générales d'utilisation et la Politique de confidentialité *
**Bouton :** Créer mon compte
**Lien :** Déjà un compte ? Se connecter

#### Messages d'erreur

- Résumé : « 3 champs à corriger. Le compte n'a pas été créé. » (le nombre s'adapte)
- « Ce champ est obligatoire. »
- « Adresse e-mail invalide. »
- « 8 caractères minimum, dont un chiffre. »
- « Ce pseudo est déjà utilisé. Choisis-en un autre. »
- « Un compte existe déjà avec cette adresse. Se connecter »
- « Pour ta sécurité, ressaisis ton mot de passe. »
- « Tu dois accepter les conditions pour créer ton compte. »

#### Succès

**Titre :** Compte créé
**Texte :** Bienvenue lea.m. Ton compte est prêt.

### États à gérer

#### Formulaire vide
Bouton actif ; la validation se fait à l'envoi.

#### Erreur de validation
Résumé en haut + message sous chaque champ, icône + texte + bordure (jamais la couleur seule). Mot de passe vidé.

#### Inscription en cours
Bouton « Création du compte… » désactivé, champs en lecture seule, statut annoncé « Création du compte en cours ».

#### Échec réseau
« Connexion impossible. Réessaie. » en haut, données conservées.

#### Succès
Écran « Compte créé », puis Accueil.

### Réponses API attendues

- Compte créé : `201 Created` + `{ id, username }` + cookie de session
- Données invalides : `400`, code `VALIDATION_ERROR`
- Pseudo déjà pris : `409`, code `USERNAME_TAKEN`, champ `username`
- Adresse déjà utilisée : `409`, code `EMAIL_TAKEN`, champ `email`
- Trop de tentatives : `429`, code `TOO_MANY_REQUESTS`
- Requête venue d'un autre site : `403`, code `FORBIDDEN_ORIGIN`

### Hors périmètre

- Vérification de l'adresse e-mail par lien.
- Connexion Google / Apple.
- Mot de passe oublié.
- Pages CGU et Politique de confidentialité (contenu à rédiger à part).

### Tâches techniques
- [ ] BDD : utiliser `user` avec `terms_accepted_at` (migration 004) ; unicité par `uq_user_username` et `uq_user_email`
- [ ] Shared : `shared/user.ts` : `signupSchema` (règles ci-dessus, `terms_accepted` doit valoir `true`) et type `PublicUser` (sans hachage)
- [ ] Backend : `userRepository.createUser` : `INSERT INTO user (username, email, password_hash, terms_accepted_at) VALUES (?, ?, ?, NOW(3))`
- [ ] Backend : ne pas faire de `SELECT` avant l'`INSERT` pour tester l'unicité : laisser l'index refuser (deux inscriptions simultanées) et lire `ER_DUP_ENTRY` pour savoir quel index (`uq_user_username` ou `uq_user_email`) a refusé
- [ ] Backend : `userActions.create` : hacher, créer, poser le cookie (`setAuthCookie`), répondre 201 sans le hachage
- [ ] Backend : `userRouter.ts` : `POST /api/users` → `checkOrigin` → `authLimiter` → `validate({ body: signupSchema })` → action
- [ ] Frontend : `features/user/services/userService.ts` : `createUser(data)`
- [ ] Frontend : `features/user/hooks/useSignup.ts` : envoi, `isSubmitting`, erreurs par champ à partir de `ApiError.field`
- [ ] Frontend : `features/user/pages/SignupPage.tsx` : formulaire contrôlé, `autocomplete` (`username`, `email`, `new-password`), `type="email"`, bouton Afficher
- [ ] Frontend : résumé d'erreurs `role="alert"`, focus sur le premier champ en erreur, mot de passe vidé
- [ ] Frontend : après succès : `AuthContext.login(user)`, écran « Compte créé », puis Accueil
- [ ] Routing : `/inscription` (publique) ; un utilisateur déjà connecté est envoyé vers l'Accueil
- [ ] Tests : schéma : mot de passe sans chiffre, 7 caractères, pseudo avec espace, CGU non cochée, e-mail mis en minuscules
- [ ] Tests : back : 201 + cookie `httpOnly`, 409 pseudo pris, 409 e-mail pris (même en majuscules), 400 champs vides, hachage `$argon2id$`, réponse sans hachage
- [ ] Tests : front : erreurs par champ, mot de passe vidé, double clic = un seul envoi
- [ ] Tests : E2E : inscription complète → Accueil ; axe sans violation sur les 5 états
- [ ] Sécurité : limiteur de tentatives actif ; aucun mot de passe dans les logs

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement sur la branche
- [ ] États formulaire, erreur, envoi, échec réseau et succès implémentés et testés
- [ ] Développé en mobile-first : conçu à 375 px puis élargi, vérifié sur tablette et ordinateur
- [ ] Accessibilité : focus visible, erreurs annoncées, zones de 44 px, aucune information par la couleur seule
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-02 · Se connecter

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-01
**Intégration future :** US-03, US-44
**Branche :** `feat/us-02-login`
**Maquettes :** écran 02, états 1 à 5
**Règles :** RM-002, DT-01, DT-02, DT-07

### User story

En tant qu'utilisateur inscrit, je veux me connecter avec mon pseudo ou mon adresse e-mail afin de retrouver mes séances et mes programmes.

### Pourquoi

À la salle, il faut retrouver ses données vite, sur n'importe quel appareil. Le pseudo est plus court à taper que l'adresse e-mail.

### Règles métier

- On se connecte avec le pseudo **ou** l'adresse e-mail, et le mot de passe (RM-002).
- Le message d'erreur ne dit jamais lequel des deux est faux.
- Un compte inconnu et un mot de passe faux répondent de la même façon, en un temps comparable.
- À l'ouverture de l'appli, une session encore valide mène directement à l'Accueil.
- La connexion est gardée 7 jours dans un cookie sécurisé.

### Critères d'acceptation

- Le formulaire affiche « Pseudo ou adresse e-mail » et « Mot de passe ».
- « Entrée » sur le mot de passe envoie le formulaire.
- Un champ vide affiche « Ce champ est obligatoire. » sous le champ.
- Connexion par pseudo réussie → Accueil (ou la page privée demandée avant la connexion).
- Connexion par adresse e-mail réussie, même tapée en majuscules.
- Identifiants faux : un seul message en haut, aucun champ marqué en erreur, pseudo conservé, mot de passe vidé et focus dessus.
- Recharger la page après connexion garde l'utilisateur connecté.
- Ouvrir `/connexion` déjà connecté mène à l'Accueil.
- Pendant l'envoi, le bouton est désactivé.

### Éléments affichés

**Titre :** Se connecter
**Texte :** Retrouve tes séances et tes programmes.
**Champs :** Pseudo ou adresse e-mail * (Ex. lea.m ou nom@exemple.fr) · Mot de passe * (Ton mot de passe)
**Bouton :** Se connecter
**Lien :** Pas encore de compte ? Créer un compte

**Erreur d'identifiants :** « Identifiants incorrects. Vérifie ta saisie et réessaie. »
**Échec réseau :** « Connexion impossible. Réessaie. »
**Trop d'essais :** « Trop de tentatives. Réessaie dans quelques minutes. »

### États à gérer

#### Connexion initiale
Formulaire vide, mot de passe masqué.

#### Erreur d'identifiants
Message unique en haut, icône + texte + bordure, annoncé aux lecteurs d'écran ; mot de passe vidé, focus dessus.

#### Chargement
Bouton désactivé, statut annoncé « Connexion en cours ».

#### Échec réseau
Même emplacement que l'erreur, données conservées.

#### Session déjà valide
Pas de formulaire : redirection vers l'Accueil.

### Réponses API attendues

- Connexion réussie : `200` + `PublicUser` + cookie
- Champs manquants : `400`, code `VALIDATION_ERROR`
- Identifiants faux (compte inconnu ou mauvais mot de passe) : `401`, code `INVALID_CREDENTIALS`
- Trop de tentatives : `429`
- `GET /api/auth/me` sans session : `401`, code `UNAUTHENTICATED`

### Hors périmètre

- Mot de passe oublié.
- Connexion Google / Apple.
- « Se souvenir de moi » (la durée est fixe : 7 jours).

### Tâches techniques
- [ ] Shared : `loginSchema` : `identifier` (1 à 254 caractères), `password` (1 à 128)
- [ ] Backend : `userRepository.readUserByIdentifier` : `SELECT id, username, email, sex, password_hash FROM user WHERE email = ? OR username = ? LIMIT 1` (même valeur deux fois, mise en minuscules pour l'e-mail)
- [ ] Backend : `userRepository.readUser(id)` : l'utilisateur sans hachage, pour `/me`
- [ ] Backend : `authActions.login` : compte absent → vérifier quand même un hachage factice (même durée de réponse) puis 401 ; mauvais mot de passe → 401 ; sinon cookie + 200
- [ ] Backend : `authActions.readMe` : renvoie l'utilisateur de `req.userId`
- [ ] Backend : `authRouter.ts` (dans `modules/user`) : `POST /api/auth/login` → `checkOrigin` → `authLimiter` → `validate` → action ; `GET /api/auth/me` → `authenticate` → action
- [ ] Frontend : `features/user/services/authService.ts` : `login`, `readMe`
- [ ] Frontend : `features/user/hooks/useLogin.ts`
- [ ] Frontend : `features/user/pages/LoginPage.tsx` : `autocomplete` `username` et `current-password`, e-mail pré-rempli depuis l'inscription (paramètre d'adresse)
- [ ] Frontend : après succès : `AuthContext.login`, retour à la page demandée ou Accueil
- [ ] Routing : `/connexion` (publique)
- [ ] Tests : back : connexion par pseudo, par e-mail en majuscules, mauvais mot de passe → 401, compte inconnu → même 401 et même message, 6ᵉ essai → 429, `/me` sans cookie → 401, réponse sans hachage
- [ ] Tests : front : message unique, mot de passe vidé, double clic = un envoi
- [ ] Tests : E2E : connexion puis rechargement → toujours connectée ; page privée → connexion → retour sur la page privée

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement sur la branche
- [ ] États connexion, erreur, chargement et échec réseau implémentés et testés
- [ ] Mobile-first 375 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-03 · Se déconnecter

EPIC 1 · Compte

**Taille :** S (2 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-02, US-44 (accès au profil par l'avatar)
**Intégration future :** US-28 (séance en cours)
**Branche :** `feat/us-03-logout`
**Maquettes :** PRF-01, PRF-09
**Règles :** DT-02

### User story

En tant qu'utilisateur connecté, je veux me déconnecter afin de protéger mon compte sur un appareil partagé.

### Pourquoi

Le téléphone peut être prêté, ou l'appli ouverte sur l'ordinateur d'une salle. La déconnexion doit être simple et ne rien effacer.

### Règles métier

- La déconnexion efface le cookie de session. Aucune donnée sportive n'est supprimée.
- Une séance en cours reste en cours : elle pourra être reprise à la prochaine connexion.
- Sans séance en cours, la déconnexion est immédiate. Avec une séance en cours, une confirmation est demandée.
- Après la déconnexion, le bouton « retour » du navigateur ne réaffiche pas une page privée.

### Critères d'acceptation

- Le bouton « Se déconnecter » est dans la page Profil (avatar de l'en-tête).
- Sans séance en cours, un appui déconnecte et mène à la page de connexion.
- Avec une séance en cours, une confirmation s'ouvre ; « Annuler » laisse tout tel quel.
- Après la déconnexion, `GET /api/auth/me` répond 401.
- Le retour arrière ne montre pas de page privée.

### Éléments affichés

**Bouton :** Se déconnecter

#### Confirmation (séance en cours)
**Titre :** Te déconnecter ?
**Message :** Ta séance en cours restera enregistrée. Tu pourras la reprendre à ta prochaine connexion.
**Actions :** « Se déconnecter » · « Annuler »

### États à gérer

#### Déconnexion en cours
Bouton désactivé.

#### Erreur API
Le cookie est quand même effacé côté client par la redirection ; message « Déconnexion impossible. Réessaie. » si le serveur ne répond pas, avec « Réessayer ».

### Réponses API attendues

- Déconnexion réussie : `204 No Content`, cookie expiré dans la réponse
- Pas connecté : `401`
- Origine refusée : `403`

### Décisions

- **D-05** : déconnexion confirmée seulement s'il y a une séance en cours, textes de PRF-09 : titre « Une séance est en cours », message « Haut du corps · commencée à 18:34. Si tu te déconnectes, elle restera en cours et tu pourras la reprendre à ta prochaine connexion. », boutons « Se déconnecter » et « Rester connecté ».

### Hors périmètre

- Déconnexion de tous les appareils (impossible avec un JWT simple, voir T-06).
- Suppression du compte (US-06).

### Tâches techniques
- [ ] Backend : `authActions.logout` : `clearAuthCookie(res)` avec les mêmes options que la pose, 204
- [ ] Backend : `POST /api/auth/logout` → `checkOrigin` → `authenticate` → action
- [ ] Frontend : `authService.logout`
- [ ] Frontend : `ProfilePage.tsx` (minimale en MVP : pseudo, adresse, bouton) ; bouton Se déconnecter
- [ ] Frontend : avant de déconnecter, `readCurrentWorkoutSession` : s'il y a une séance en cours, ouvrir la confirmation
- [ ] Frontend : `AuthContext.logout` : vide l'utilisateur et navigue vers `/connexion` avec `replace: true`
- [ ] Tests : back : 204, cookie expiré, `/me` ensuite → 401
- [ ] Tests : E2E : déconnexion sans séance ; déconnexion avec séance en cours (confirmation, puis reprise possible après reconnexion)

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Confirmation accessible (focus piégé dans la modale, Échap ferme)
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-44 · Naviguer dans l'appli et page Accueil

EPIC 9 · Socle

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-02, T-07
**Intégration future :** US-24 (Planning), US-28 (reprendre une séance), US-46 (notifications), US-48 (Mes programmes)
**Branche :** `feat/us-44-navigation-home`
**Maquettes :** écran 03 (5 états), PRF-01
**Règles :** RM-066

### User story

En tant qu'utilisateur, je veux passer facilement d'une partie de l'appli à l'autre et voir ma séance du jour dès l'Accueil afin de lancer mon entraînement sans chercher.

### Pourquoi

À la salle, on a le téléphone dans une main. La séance du jour et la reprise d'une séance en cours doivent être à un seul appui.

### Règles métier

- Quatre onglets en bas de l'écran : Accueil, Planning, Suivi, Catalogue (RM-066).
- Le profil s'ouvre par l'avatar de l'en-tête, jamais par un 5ᵉ onglet.
- Les écrans de création et d'entraînement s'affichent sans la barre d'onglets.
- À l'Accueil, une séance en cours passe avant tout : « Reprendre ma séance » remplace « Démarrer ».
- Plusieurs séances le même jour : triées par heure, « Sans heure » en dernier.
- Une seule séance en cours à la fois (RM-040) : « Démarrer » n'est pas proposé sur une autre séance tant qu'une séance est en cours.

### Critères d'acceptation

- Les 4 onglets sont visibles sur toutes les pages principales, avec une icône et un libellé texte.
- L'onglet actif est visible autrement que par la couleur et porte `aria-current="page"`.
- L'avatar ouvre le Profil ; le retour ‹ ramène à l'onglet d'origine.
- Une adresse privée ouverte sans être connecté mène à la connexion, puis revient à cette adresse.
- Une adresse inconnue affiche la page « Page introuvable ».
- L'Accueil affiche la date du jour (« Jeudi 26 novembre »).
- Sans séance aujourd'hui : « Aucune séance prévue » + « Créer ma première séance » (ou « Créer une séance » si l'utilisateur en a déjà).
- Avec une ou plusieurs séances aujourd'hui : un sélecteur « 4 aujourd'hui › » et la carte de la séance choisie (heure, programme, nom, nombre de blocs et d'exercices) avec « ▶ Démarrer la séance ».
- Avec une séance en cours : carte « ● EN COURS », « Commencée à 07:04 · 6 / 11 séries » et « Reprendre ma séance », sélectionnée par défaut.
- Actions rapides : « Créer une séance », « Voir mon planning », « Voir mon historique » (« Créer une séance » est retiré quand c'est déjà l'action principale).
- La section « Mes programmes » affiche « Aucun programme en cours… » en MVP (les programmes arrivent en V1).
- Tout fonctionne au clavier seul.

### Éléments affichés

#### Onglets
Accueil · Planning · Suivi · Catalogue

#### Accueil, utilisateur débutant
**Section :** Séance du jour
**Texte :** Aucune séance prévue
**Aide :** Crée ta première séance : choisis tes blocs et tes exercices, puis lance-la quand tu veux.
**Bouton :** Créer ma première séance
**Section :** Mes programmes · « Aucun programme en cours. Un programme planifie tes séances sur plusieurs semaines. »
**Actions rapides :** Voir mon planning · Voir mon historique

#### Accueil, utilisateur actif
**Sélecteur :** « 4 aujourd'hui › »
**Carte :** 07:00 · FORCE 8 SEM. · S4/8 · Jambes · 1 bloc · 3 exercices
**Bouton :** ▶ Démarrer la séance

#### Accueil, séance démarrée
**Carte :** ● EN COURS · Jambes · Commencée à 07:04 · 6 / 11 séries
**Bouton :** Reprendre ma séance

#### Erreur
**Titre :** Impossible de charger tes séances
**Texte :** Vérifie ta connexion internet, puis réessaie.
**Bouton :** Réessayer

#### Page introuvable
**Titre :** Page introuvable · **Bouton :** Retour à l'accueil

### États à gérer

#### Chargement
Blocs gris à l'emplacement du contenu, la structure ne bouge pas ; en-tête et onglets utilisables ; statut annoncé « Chargement de l'accueil ».

#### Erreur
Message unique à la place de « Séance du jour » et « Mes programmes » ; actions rapides et onglets restent disponibles.

#### Séance du jour sans exercice
Le bouton devient « Ajouter des exercices » (RM-018).

#### Séance déjà en cours
« Démarrer » n'apparaît sur aucune autre carte.

### Réponses API attendues

- `GET /api/appointments?from=&to=` : `200` + liste ; plage invalide ou de plus de 62 jours : `400` ; pas connecté : `401`
- `GET /api/workout-sessions/current` : `200` + séance en cours ou `null`

### Décisions

- **D-01** : notifications par une cloche dans l'en-tête (pas de pastille sur l'avatar). En MVP, la cloche n'est pas affichée (elle arrive avec l'US-46).

### Hors périmètre

- Page Planning complète (US-24) : en MVP, l'onglet Planning affiche les séances à venir en liste simple pour pouvoir démarrer et créer.
- Page « Mes programmes » (US-48).
- Indicateur d'accueil choisi (US-42).
- Notifications (US-46).

### Tâches techniques
- [ ] Backend : `appointmentRepository.readAppointmentsBetween(userId, from, to)` : rendez-vous + nom de séance + programme + séance réalisée liée (`LEFT JOIN workout_session`), `WHERE a.owner_user_id = ? AND a.planned_date BETWEEN ? AND ?`, tri `planned_date, planned_time IS NULL, planned_time, id`
- [ ] Backend : `appointmentRepository.countVersionContent(versionIds)` : nombre de blocs et d'exercices par version (pour « 1 bloc · 3 exercices »)
- [ ] Backend : `appointmentActions.browse` ; `GET /api/appointments` → `authenticate` → `validate({ query: dateRangeSchema })` (62 jours max)
- [ ] Backend : `GET /api/workout-sessions/current` (livré avec US-28 ; en attendant, renvoie `null`)
- [ ] Shared : `dateRangeSchema` ; `formatLongDate` (« Jeudi 26 novembre ») ; `sortDayAppointments` (heure puis sans heure)
- [ ] Frontend : `components/AppLayout.tsx` (en-tête : titre, avatar), `components/TabBar.tsx` (4 `NavLink`, `aria-current`), `pages/NotFoundPage.tsx`
- [ ] Frontend : `App.tsx` : routes publiques (`/inscription`, `/connexion`), routes privées dans `ProtectedRoute` + `AppLayout`, routes plein écran (`/seances/nouvelle`, `/entrainement/:id`) sans `AppLayout`
- [ ] Frontend : `features/appointment/services/appointmentService.ts` : `readAppointments(from, to)`
- [ ] Frontend : `features/appointment/hooks/useTodayAppointments.ts`, `features/workout-session/hooks/useCurrentWorkoutSession.ts`
- [ ] Frontend : `pages/HomePage.tsx` : `TodaySessionCard`, `TodaySelector`, `QuickActions`, `ProgramsSummary` (vide en MVP)
- [ ] Frontend : états chargement / erreur / vide ; statut `aria-live`
- [ ] Tests : back : plage de dates, séances d'un autre exclues, tri sans heure en dernier
- [ ] Tests : front : `TabBar` met `aria-current` sur le bon onglet ; Accueil débutant / actif / en cours
- [ ] Tests : E2E : navigation au clavier entre les 4 onglets ; page privée sans connexion → connexion → retour ; axe sur les 5 états de l'Accueil

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] 5 états de l'Accueil implémentés et testés
- [ ] Mobile-first 375 px, onglets à 44 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

# Sprint 02 · Catalogue

## US-07 · Parcourir le catalogue

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-44, T-08
**Intégration future :** US-08 (filtres), US-09 (fiche), US-14 (mode sélection)
**Branche :** `feat/us-07-exercise-list`
**Maquettes :** écran 04, états 1, 6 et 7
**Règles :** RM-007, RM-014

### User story

En tant qu'utilisateur, je veux voir la liste des exercices afin de choisir ceux de mes séances.

### Pourquoi

Le catalogue est le point de départ de toute séance : 175 exercices illustrés, classés par groupe musculaire, matériel et difficulté.

### Règles métier

- On voit le catalogue commun et ses propres exercices, jamais les exercices personnels des autres (RM-007).
- Un exercice archivé n'apparaît pas dans le catalogue.
- Tri par nom, de A à Z.
- 20 exercices sont chargés à la fois ; les suivants arrivent en approchant du bas de la liste.
- L'illustration suit le choix Femme / Homme du profil ; si elle manque, on prend l'autre ; si aucune n'existe, un emplacement « Illustration non disponible » (RM-014).

### Critères d'acceptation

- L'onglet Catalogue affiche « 175 exercices » (le total réel) et la liste.
- Chaque carte affiche l'illustration, le nom, « Groupe · Difficulté » et le matériel, et un œil « Fiche ».
- Toute la carte, ou l'œil, ouvre la fiche (US-09).
- En approchant du bas, les 20 suivants se chargent ; « Chargement… » s'affiche en fin de liste ; à la fin, plus rien ne se charge.
- Un exercice personnel d'un autre utilisateur n'apparaît jamais, même en trafiquant la requête.
- Le retour depuis une fiche conserve la position dans la liste.

### Éléments affichés

**Titre :** Catalogue
**Compteur :** « 175 exercices »
**Carte :** illustration · Squat à la barre · « Jambes · Intermédiaire » · « Barre » · œil « Fiche »
**Bouton en haut :** Sélectionner (mode sélection, US-14)

**Erreur :**
> Impossible de charger les exercices
> Vérifie ta connexion internet, puis réessaie.
Bouton « Réessayer »

### États à gérer

#### Chargement de la liste
Cartes grises de la même hauteur que les vraies ; statut annoncé « Chargement des exercices ».

#### Chargement progressif
Une seule carte grise ajoutée en bas.

#### Erreur de chargement
Message + « Réessayer » ; si l'erreur arrive pendant le chargement progressif, les cartes déjà affichées restent et « Réessayer » remplace la ligne de chargement.

### Réponses API attendues

- Liste : `200` + `{ items, total, next_offset }` (`next_offset` à `null` à la fin)
- Paramètre invalide : `400`
- Pas connecté : `401`

### Hors périmètre

- Recherche et filtres (US-08).
- Fiche (US-09).
- Mode sélection (US-14).
- Créer un exercice personnel (US-10).

### Tâches techniques
- [ ] BDD : s'appuyer sur `exercise`, `exercise_category`, `category`, `exercise_equipment`, `equipment`
- [ ] Backend : `exerciseRepository.readExercises(userId, filters, limit, offset)` : colonnes `id, slug, name, difficulty, image_female_url, image_male_url, (owner_user_id IS NOT NULL) AS is_personal` + sous-requête du premier groupe (`category_name`) + sous-requête du matériel (`GROUP_CONCAT` des noms séparés par « · »), `WHERE (e.owner_user_id IS NULL OR e.owner_user_id = ?) AND e.is_archived = FALSE`, `ORDER BY e.name LIMIT ? OFFSET ?` (limit et offset en chaînes)
- [ ] Backend : `exerciseRepository.countExercises(userId, filters)` : même `WHERE`, `COUNT(*)`
- [ ] Backend : `exerciseActions.browse` : calcule `next_offset` (`offset + 20 < total` sinon `null`)
- [ ] Backend : `exerciseRouter.ts` : `GET /api/exercises` → `authenticate` → `validate({ query: exerciseQuerySchema })` → action
- [ ] Shared : `shared/catalog.ts` : `exerciseQuerySchema` (`offset` ≥ 0, `limit` fixé à 20 côté serveur), type `ExerciseListItem`, `getExerciseImage(exercise, sex)` (choix, autre version, sinon `null`)
- [ ] Frontend : `features/exercise/services/exerciseService.ts` : `readExercises(query)`
- [ ] Frontend : `features/exercise/hooks/useExercises.ts` : premier chargement, `loadMore`, `isLoadingMore`, `hasMore`, erreur
- [ ] Frontend : `features/exercise/components/ExerciseCard.tsx`, `ExerciseCardSkeleton.tsx`
- [ ] Frontend : `features/exercise/pages/ExerciseListPage.tsx` : chargement progressif avec `IntersectionObserver` sur une sentinelle en bas de liste, plus un bouton « Charger plus » de secours (clavier, lecteurs d'écran)
- [ ] Frontend : position de défilement conservée au retour (état gardé dans la page parente ou `sessionStorage` dans un `try/catch`)
- [ ] Routing : `/catalogue`
- [ ] Tests : back : utilisateur A ne voit jamais l'exercice personnel de B ; exercice archivé absent ; `next_offset` exact sur 175 exercices (8 appels, le dernier renvoie `null`)
- [ ] Tests : unitaires : `getExerciseImage` (4 cas)
- [ ] Tests : front : cartes affichées, état d'erreur, chargement suivant au clic sur « Charger plus »
- [ ] Tests : E2E : faire défiler jusqu'au bout ; axe sur les états liste, chargement, erreur

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États chargement, chargement progressif et erreur implémentés et testés
- [ ] Mobile-first 375 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-08 · Chercher et filtrer

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-07
**Intégration future :** US-14 (mêmes filtres en mode sélection)
**Branche :** `feat/us-08-exercise-filters`
**Maquettes :** écran 04, états 2, 3 et 4
**Règles :** RM-007

### User story

En tant qu'utilisateur, je veux chercher un exercice par son nom et filtrer par groupe, matériel et difficulté afin de le trouver vite.

### Pourquoi

175 exercices, c'est trop pour faire défiler. À la salle, on cherche « squat » ou « tout ce qui se fait avec des haltères ».

### Règles métier

- La recherche porte sur le nom de l'exercice.
- Trois filtres : Groupe (8 choix), Matériel (10 choix), Difficulté (3 choix).
- Plusieurs choix sont possibles dans un même filtre : un exercice correspond s'il a **au moins un** des choix (OU).
- Les filtres se combinent entre eux : un exercice doit correspondre à **tous** les filtres actifs (ET).
- Le filtrage est immédiat, sans bouton « Appliquer ».
- Les caractères `%` et `_` tapés dans la recherche sont cherchés tels quels.

### Critères d'acceptation

- La liste se met à jour pendant la saisie, 300 ms après la dernière frappe.
- Le terme recherché est en gras dans le nom.
- « × » dans le champ efface la recherche.
- Groupe, Matériel et Difficulté déplient chacun une grille sous la recherche ; un seul déplié à la fois ; un nouvel appui le replie.
- Le nombre de choix actifs s'affiche sur le bouton du filtre.
- Une tuile active a une bordure épaisse, une coche et un libellé en gras (pas seulement la couleur).
- Les filtres actifs apparaissent en étiquettes sous la recherche ; « × » retire un filtre, « Tout effacer » les retire tous.
- « 3 résultats pour « squat » · Jambes » s'affiche et est annoncé aux lecteurs d'écran.
- Sans résultat : message avec le terme, « Effacer la recherche » et, seulement si un filtre est actif, « Réinitialiser les filtres ».
- Recherche et filtres sont gardés dans l'adresse : le retour depuis une fiche et le rechargement les conservent.

### Éléments affichés

**Champ :** Rechercher un exercice
**Boutons filtres :** Groupe · Matériel · Difficulté
**Grille Groupe :** Abdominaux · Bras · Cardio · Dos · Épaules · Étirements · Jambes · Pectoraux · bouton « Effacer le groupe »
**Compteur :** « 18 résultats »
**Lien :** Tout effacer

**Aucun résultat :**
> Aucun exercice trouvé pour « squaat »
> Vérifie l'orthographe ou retire un filtre.
Boutons « Effacer la recherche » · « Réinitialiser les filtres »

### États à gérer

#### Recherche avec résultats
Compteur et terme en gras.

#### Aucun résultat
Message avec le terme saisi.

#### Chargement
Recherche et filtres restent utilisables.

#### Erreur
Comme l'US-07, recherche et filtres conservés.

### Réponses API attendues

- Liste filtrée : `200`
- Recherche de plus de 60 caractères, identifiant de filtre invalide, difficulté inconnue : `400`
- `GET /api/categories`, `GET /api/equipments` : `200` + liste

### Hors périmètre

- Recherche dans les instructions ou les muscles.
- Tri autre que par nom.

### Tâches techniques
- [ ] Backend : `readExercises` et `countExercises` : ajouter des morceaux de SQL **constants**, seulement si le filtre est fourni : `AND e.name LIKE ? ESCAPE '\\'` ; `AND EXISTS (SELECT 1 FROM exercise_category ec WHERE ec.exercise_id = e.id AND ec.category_id IN (?))` ; idem matériel avec `exercise_equipment` ; `AND e.difficulty IN (?)`
- [ ] Backend : utiliser `query` (et non `execute`) pour ces deux fonctions, à cause des tableaux dans `IN (?)`
- [ ] Backend : échapper `\`, `%` et `_` dans la recherche avant de l'entourer de `%`
- [ ] Backend : `exerciseRepository.readCategories`, `readEquipments` ; routes `GET /api/categories`, `GET /api/equipments`
- [ ] Shared : `exerciseQuerySchema` : `search` 0 à 60, `category_ids` / `equipment_ids` tableaux d'entiers positifs (10 max), `difficulties` dans l'énumération
- [ ] Shared : `escapeLike(text)` (fonction pure)
- [ ] Frontend : `features/exercise/components/ExerciseSearch.tsx`, `FilterToggle.tsx`, `FilterGrid.tsx` (tuiles icône + libellé), `ActiveFilterChips.tsx`
- [ ] Frontend : `hooks/useDebouncedValue.ts` (300 ms)
- [ ] Frontend : filtres lus et écrits avec `useSearchParams`
- [ ] Frontend : `HighlightedText.tsx` (terme en gras, sans `dangerouslySetInnerHTML`)
- [ ] Frontend : compteur dans une zone `aria-live="polite"`
- [ ] Tests : unitaires : `escapeLike`, `HighlightedText`
- [ ] Tests : back : « squat » ; « % » ne renvoie pas tout ; deux groupes (OU) ; groupe + matériel (ET) ; difficulté inconnue → 400
- [ ] Tests : E2E : filtrer, ouvrir une fiche, revenir → filtres et position conservés ; axe avec un filtre déplié

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États résultats, aucun résultat, chargement et erreur testés
- [ ] Grilles utilisables au clavier (Tab, Entrée, Espace)
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-09 · Voir la fiche d'un exercice

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-07
**Intégration future :** US-14 (« Ajouter à une séance »), US-39 (« Ma progression »)
**Branche :** `feat/us-09-exercise-detail`
**Maquettes :** écran 05, états 1 à 5
**Règles :** RM-004, RM-007, RM-009, RM-010, RM-014

### User story

En tant qu'utilisateur, je veux voir la fiche complète d'un exercice afin de bien l'exécuter.

### Pourquoi

Savoir quels muscles travaillent, comment faire le mouvement et quelles erreurs éviter, c'est ce qui rend l'exercice sûr et efficace.

### Règles métier

- La fiche n'est visible que pour un exercice du catalogue commun ou un exercice personnel de l'utilisateur (RM-007).
- Muscles principaux et secondaires sont séparés (RM-009) ; « Principal » ou « Principaux » selon le nombre.
- Seules les mesures prévues pour l'exercice sont affichées (RM-010).
- Illustration et carte musculaire suivent le choix Femme / Homme (RM-004, RM-014).
- Un exercice personnel sans alternatives n'affiche pas la section « Exercices alternatifs ».

### Critères d'acceptation

- La fiche affiche : nom, illustration, Groupe, Difficulté, Matériel (plusieurs séparés par « · »), carte musculaire face et dos, muscles principaux et secondaires écrits sous l'image, instructions numérotées, erreurs à éviter, exercices alternatifs (texte non cliquable), mesures suivies.
- Le nom, connu depuis la liste, s'affiche dans l'en-tête pendant le chargement.
- Retour ‹ → catalogue, recherche, filtres et position conservés.
- Un exercice personnel affiche le badge « EXERCICE PERSONNEL » et, sans image, « Illustration non disponible ».
- Ouvrir l'adresse d'un exercice personnel d'un autre utilisateur affiche « Exercice introuvable ».
- « Ajouter à une séance » est en bas, fixe, et désactivé tant que la fiche n'est pas chargée.

### Éléments affichés

**Infos :** Groupe · Jambes · Difficulté · Intermédiaire · Matériel · Barre
**Section :** Muscles sollicités · PRINCIPAUX : Quadriceps · Fessiers · SECONDAIRES : Ischio-jambiers · Mollets
**Sections :** Instructions · Erreurs à éviter · Exercices alternatifs · Mesures suivies
**Bouton :** Ajouter à une séance
**Image absente :** « Illustration non disponible » (texte alternatif : « Mon tirage élastique, illustration non disponible »)

**Erreur :**
> Impossible de charger la fiche
> Vérifie ta connexion internet, puis réessaie.
Bouton « Réessayer »

**Introuvable :** « Exercice introuvable » + bouton « Retour au catalogue »

### États à gérer

#### Chargement
Nom dans l'en-tête, contenu gris, bouton d'ajout désactivé, statut annoncé.

#### Erreur
Message + « Réessayer » ; le retour reste disponible ; bouton d'ajout masqué.

#### Exercice personnel sans illustration
Badge + emplacement réservé avec texte visible.

#### Introuvable (404)
Message + retour au catalogue.

### Réponses API attendues

- Fiche : `200`
- Identifiant invalide : `400`
- Absent ou personnel d'un autre : `404`, code `NOT_FOUND`
- Pas connecté : `401`

### Hors périmètre

- « Ajouter à une séance » : le bouton mène au choix de la séance (US-14 / US-23).
- Lien « Ma progression » (US-39) : masqué en MVP.
- Modifier ou personnaliser l'exercice (US-11).

### Tâches techniques
- [ ] Backend : `exerciseRepository.readExercise(id, userId)` : même condition de visibilité que US-07
- [ ] Backend : `readExerciseMuscles(id)` (nom + rôle, principaux d'abord), `readExerciseEquipments(id)`, `readExerciseMeasures(id)` (code + libellé), `readExerciseTexts(id)` (`ORDER BY type, position`), `readExerciseCategories(id)` : une fonction = une requête
- [ ] Backend : `exerciseActions.read` : appelle les 6 fonctions l'une après l'autre, 404 si l'exercice est absent
- [ ] Backend : `GET /api/exercises/:id` → `authenticate` → `validate({ params: idParamSchema })` → action
- [ ] Shared : type `ExerciseDetail` ; `formatMuscleRoleLabel(count)` (« Principal » / « Principaux »)
- [ ] Frontend : `exerciseService.readExercise(id)`, `hooks/useExercise.ts`
- [ ] Frontend : `pages/ExerciseDetailPage.tsx` ; composants `MuscleMap.tsx` (image + texte alternatif listant les muscles), `ExerciseTextList.tsx` (`<ol>` pour les instructions), `MeasureList.tsx`
- [ ] Frontend : bouton « Ajouter à une séance » fixe en bas (mène au choix de séance, voir US-14)
- [ ] Routing : `/catalogue/:id` ; nom passé par l'état de navigation pour l'afficher pendant le chargement
- [ ] Tests : back : fiche complète, exercice personnel d'un autre → 404, identifiant texte → 400, mesures limitées à celles de l'exercice
- [ ] Tests : front : principaux / secondaires, section alternatives masquée si vide, image absente
- [ ] Tests : E2E : liste → fiche → retour (filtres conservés) ; axe sur la fiche complète

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États chargement, erreur, introuvable et exercice personnel testés
- [ ] Mobile-first 375 px ; en-tête et bouton du bas fixes
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

# Sprint 03 · Préparer une séance libre

## US-12 · Créer une séance

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-44
**Intégration future :** US-13, US-14, US-15, US-23
**Branche :** `feat/us-12-session-editor`
**Maquettes :** A1, A2, A8, A9
**Règles :** RM-016, RM-018

### User story

En tant qu'utilisateur, je veux créer une séance avec un nom afin de préparer mon entraînement.

### Pourquoi

Une séance préparée, c'est savoir exactement quoi faire en arrivant à la salle.

### Règles métier

- Le nom est obligatoire (1 à 160 caractères).
- Une séance peut être enregistrée sans bloc (RM-018), mais ne pourra pas démarrer tant qu'elle n'a pas d'exercice.
- À l'enregistrement, la séance reçoit sa version 1 (RM-016).
- Quitter l'éditeur avec un brouillon non enregistré demande confirmation.

### Critères d'acceptation

- L'écran « Nouvelle séance » affiche Séance libre, Date (pré-remplie), Heure (facultatif), Nom de la séance, la section Blocs et « Enregistrer la séance ».
- Sans bloc : « 0 bloc » et « Ajoute un premier bloc pour y mettre des exercices. »
- « Enregistrer la séance » sans nom affiche « Ce champ est obligatoire. »
- L'écran A8 résume la séance avant l'enregistrement ; toucher une carte rouvre le bloc.
- Une séance sans exercice affiche l'avertissement « Cette séance n'a pas encore d'exercice : tu ne pourras pas la démarrer. » mais peut être enregistrée.
- Le retour ‹ ou la fermeture de l'onglet avec un brouillon non enregistré demande confirmation.

### Éléments affichés

**Titre :** Nouvelle séance · étiquette « Séance libre »
**Champs :** Date · Heure (facultatif) « --:-- » · Nom de la séance (Ex. Haut du corps)
**Section :** Blocs · « 0 bloc » · « Ajoute un premier bloc pour y mettre des exercices. »
**Boutons :** Ajouter un bloc · Enregistrer la séance

#### Confirmation de sortie
**Titre :** Quitter sans enregistrer ?
**Message :** Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue.
**Actions :** « Quitter » · « Continuer la séance »

### États à gérer

#### Brouillon vide
Un seul appel à l'action : « Ajouter un bloc ».

#### Brouillon modifié
Confirmation de sortie active.

### Réponses API attendues

Aucune route propre : l'enregistrement est livré par l'US-23.

### Hors périmètre

- Modifier une séance déjà enregistrée (US-17).
- Séance d'un programme (US-18).

### Tâches techniques
- [ ] Shared : `shared/session-template.ts` : types `SessionDraft`, `DraftBlock`, `DraftExercise`, `PlannedSetValues` ; `sessionDraftSchema` (Zod) avec toutes les bornes (voir US-15)
- [ ] Frontend : `features/session-template/hooks/sessionDraftReducer.ts` : fonction pure, actions `setName`, `setDate`, `setTime`, `addBlock`, `removeBlock`, `restoreBlock`, `moveBlock`, `addExercises`, `removeExercise`, `updateExerciseRest`, `addSet`, `duplicateLastSet`, `updateSet`, `removeSet`
- [ ] Frontend : `features/session-template/hooks/useSessionDraft.ts` (`useReducer` + `isDirty`)
- [ ] Frontend : **Notion à expliquer avant de coder** : `useReducer` (un état complexe modifié par une seule fonction pure, testable sans écran)
- [ ] Frontend : `features/session-template/pages/SessionEditorPage.tsx` (A2), `components/SessionReview.tsx` (A8)
- [ ] Frontend : garde de sortie : `beforeunload` + confirmation sur le retour ‹ (React Router `useBlocker`)
- [ ] Routing : `/seances/nouvelle?date=AAAA-MM-JJ` (plein écran, sans onglets)
- [ ] Tests : reducer : chaque action, ordre conservé, `isDirty`
- [ ] Tests : front : nom obligatoire, avertissement « pas d'exercice », confirmation de sortie

### Definition of Done
- [ ] Reducer couvert par des tests unitaires
- [ ] Confirmation de sortie testée (retour ‹ et fermeture)
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-13 · Ajouter un bloc

EPIC 3 · Séances modèles

**Taille :** S (2 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-12
**Intégration future :** US-43 (blocs chronométrés), US-17 (changer le type)
**Branche :** `feat/us-13-session-blocks`
**Maquettes :** A3, A4, A8
**Règles :** RM-019, RM-020, RM-024

### User story

En tant qu'utilisateur, je veux organiser ma séance en blocs afin de séparer l'échauffement, le travail et le retour au calme.

### Pourquoi

Une séance se pense en parties : on s'échauffe, on travaille, on s'étire. Les blocs reproduisent cette organisation.

### Règles métier

- En MVP, 5 types sont disponibles : Classique, Échauffement, Étirements, Défi, Note. Ils fonctionnent tous comme un bloc Classique, seule l'étiquette change (RM-019).
- Circuit, AMRAP et For Time sont affichés mais indisponibles (« Bientôt ») : ils arrivent avec l'US-43.
- Un bloc Note contient un texte libre et aucun exercice (RM-020).
- Plusieurs blocs du même type sont possibles (RM-020).
- L'intitulé est facultatif ; sans intitulé, on affiche « Classique · Bloc 1 ».
- 20 blocs au maximum.
- L'ordre des blocs est l'ordre d'affichage (RM-024).

### Critères d'acceptation

- « Ajouter un bloc » ouvre le panneau « Type de bloc » avec les 8 types et leur description.
- Choisir un type ajoute un bloc vide et ouvre son écran (A4).
- Le bloc affiche « Bloc 1 · Haut du corps », « Intitulé (facultatif) », « Changer », « Exercices · 0 exercice », « Ajouter des exercices », « Enregistrer le bloc ».
- Un bloc Note affiche un champ texte (2 000 caractères max) à la place des exercices.
- Dans le résumé (A8), « Retirer » supprime le bloc et propose « Annuler » pendant 5 secondes.
- Avec 20 blocs, « Ajouter un bloc » est désactivé avec l'explication « 20 blocs au maximum ».

### Éléments affichés

#### Panneau « Type de bloc »
- Classique · Exercices et séries, avec objectifs et repos
- Circuit · Exercices enchaînés, nombre de tours (Bientôt)
- AMRAP · Maximum de tours dans une durée fixe (Bientôt)
- For Time · Travail fixe, le plus vite possible (Bientôt)
- Échauffement · Mise en route
- Étirements · Retour au calme
- Défi · Objectif ponctuel
- Note · Texte libre

#### Bloc vide
**Champ :** Intitulé (facultatif) (Ex. Force) · **Lien :** Changer
**Texte :** 0 exercice · « Choisis tes exercices dans le catalogue. »
**Boutons :** Ajouter des exercices · Enregistrer le bloc

#### Retrait
Toast « Bloc retiré » + bouton « Annuler » (5 s)

### États à gérer

#### Type indisponible
Tuile grisée avec « Bientôt » en texte, non sélectionnable, annoncée comme indisponible.

#### Bloc Note
Pas de section Exercices.

### Réponses API attendues

Validation dans la route de l'US-23 :
- Bloc Note avec exercices : `400`
- Type inconnu ou chronométré : `400`
- Plus de 20 blocs : `400`

### Décisions

- **D-03** : en MVP, « Changer » n'est proposé que sur un bloc vide. Le changement de type d'un bloc rempli est traité par l'US-17.

### Hors périmètre

- Blocs chronométrés (US-43).
- Réordonner par glisser-déposer (US-16) : en MVP, l'ordre est celui de création.

### Tâches techniques
- [ ] Shared : `BLOCK_TYPES` (code, libellé, description, `isAvailable`) dans `shared/session-template.ts`
- [ ] Shared : `sessionDraftSchema` : `block_type` limité aux 5 types MVP, note sans exercice (`superRefine`), 20 blocs max, `name` 0 à 160, `instructions` 0 à 2 000
- [ ] Frontend : `components/BlockTypePicker.tsx` (panneau, une colonne, tuiles indisponibles)
- [ ] Frontend : `components/BlockEditor.tsx` (A4), `components/BlockCard.tsx` (résumé A8)
- [ ] Frontend : `components/UndoToast.tsx` (« Annuler » pendant 5 s, `aria-live`)
- [ ] Frontend : `getBlockLabel(block, index)` (« Classique · Bloc 1 ») dans `shared/`
- [ ] Tests : schéma : note avec exercice refusée, 21 blocs refusés, type `amrap` refusé
- [ ] Tests : front : ajout, retrait + annulation, tuile indisponible non sélectionnable

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Panneau utilisable au clavier, focus rendu au bouton à la fermeture
- [ ] Code relu et fusionné via pull request

## US-14 · Ajouter des exercices dans un bloc

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-13, US-08
**Intégration future :** US-16 (réordonner), US-17 (ajouter à une séance existante)
**Branche :** `feat/us-14-block-exercises`
**Maquettes :** A5, A5b, A6, écran 04 états 5 et 5b, écran 05 bouton « Ajouter à une séance »
**Règles :** RM-007, RM-021, RM-024

### User story

En tant qu'utilisateur, je veux choisir des exercices dans le catalogue pour les mettre dans un bloc afin de composer ma séance.

### Pourquoi

On construit sa séance avec les mêmes outils que pour chercher un exercice : recherche, filtres, fiches.

### Règles métier

- Le catalogue s'ouvre en mode sélection : on sélectionne plusieurs exercices d'un coup.
- L'ordre de sélection devient l'ordre des exercices dans le bloc.
- Un même exercice peut être ajouté plusieurs fois (RM-021).
- Seuls les exercices visibles par l'utilisateur et non archivés sont acceptés (RM-007).
- Chaque exercice arrive avec 1 série pré-remplie (voir US-15) et le repos par défaut de 1 min 30.
- 30 exercices au maximum par bloc.
- Depuis le catalogue (hors éditeur), « Ajouter à une séance » propose en MVP seulement « Nouvelle séance libre » ; les exercices arrivent dans un bloc Classique.

### Critères d'acceptation

- « Ajouter des exercices » ouvre « Sélection pour le bloc 1 » avec recherche et filtres (US-08).
- Toucher une carte la sélectionne : fond inversé et numéro d'ordre (1, 2, 3…) ; toucher à nouveau la désélectionne et les numéros se recalent.
- Le lecteur d'écran annonce « Squat, sélectionné, 1 sur 3 ».
- L'œil ouvre la fiche ; la sélection est conservée au retour.
- Le bouton « Ajouter au bloc · 6 » est désactivé à 0 sélection.
- De retour dans le bloc (A6) : « Force · 6 exercices », chaque ligne avec son résumé (« 1 série · 10 rép. · 40 kg »).
- Toucher une ligne ouvre sa configuration (US-15) ; « Retirer » enlève l'exercice avec « Annuler » pendant 5 s.
- Depuis le catalogue en mode normal : « Sélectionner » → « Annuler », compteur, « Tout désélectionner », « Ajouter à une séance » → choix « Nouvelle séance libre · Tu choisiras la date ensuite » → éditeur avec les exercices dans un bloc Classique.

### Éléments affichés

**Titre :** Sélection pour le bloc 1
**Bouton :** Ajouter au bloc · 6
**Mode sélection depuis le catalogue :** « Annuler » · « 3 sélectionnés » · « Tout désélectionner » · « Ajouter à une séance »
**Choix de la séance :** Ajouter 3 exercices · Nouvelle séance libre · « Tu choisiras la date ensuite » · Continuer vers l'éditeur
**Ligne d'exercice :** Développé couché · 1 série · 10 rép. · 40 kg

### États à gérer

#### Aucune sélection
Bouton d'ajout désactivé.

#### Limite atteinte
Au-delà de 30 exercices dans le bloc : « 30 exercices au maximum par bloc », cartes non sélectionnables.

#### Exercice devenu indisponible
Refusé à l'enregistrement (US-23) avec son nom.

### Réponses API attendues

Validation dans la route de l'US-23 :
- Exercice d'un autre utilisateur, archivé ou inexistant : `422`, code `EXERCISE_NOT_AVAILABLE`, avec le nom ou l'identifiant
- Plus de 30 exercices dans un bloc : `400`

### Hors périmètre

- Ajouter à une séance déjà enregistrée (« OU UNE SÉANCE À VENIR », US-17).
- Réordonner par glisser-déposer ⋮⋮ (US-16).
- Créer un exercice personnel depuis la sélection (US-10).

### Tâches techniques
- [ ] Backend : `exerciseRepository.readAvailableExerciseIds(userId, ids)` (avec `query`) : `SELECT id FROM exercise WHERE id IN (?) AND is_archived = FALSE AND (owner_user_id IS NULL OR owner_user_id = ?)`
- [ ] Frontend : `ExerciseListPage` reçoit `selectionMode` (`"block"` ou `"catalog"`) ; `useExerciseSelection` (liste ordonnée d'identifiants, `toggle`, `clear`)
- [ ] Frontend : `components/SelectableExerciseCard.tsx` (`aria-pressed`, libellé « sélectionné, 1 sur 3 »)
- [ ] Frontend : `components/SessionDestinationSheet.tsx` (MVP : nouvelle séance libre seulement)
- [ ] Frontend : sélection transmise à l'éditeur par l'état de navigation ; reducer `addExercises(blockIndex, exercises)` crée 1 série pré-remplie selon le profil (US-15)
- [ ] Frontend : `components/BlockExerciseRow.tsx` avec `formatSetSummary` (shared)
- [ ] Tests : unitaires : `useExerciseSelection` (ordre, recalage des numéros)
- [ ] Tests : back (dans US-23) : exercice personnel d'un autre → 422, archivé → 422
- [ ] Tests : E2E : bloc → sélection de 3 exercices → retour, ordre respecté ; catalogue → Sélectionner → Ajouter à une séance → éditeur

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Sélection utilisable au clavier et au lecteur d'écran
- [ ] Code relu et fusionné via pull request

## US-15 · Définir les séries prévues

EPIC 3 · Séances modèles

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-14, T-08
**Intégration future :** US-29 (saisie du réalisé), US-49 (minuteur)
**Branche :** `feat/us-15-planned-sets`
**Maquettes :** A6, A7a, A7b, A7c, A7d (A7e et A7f : US-51)
**Règles :** RM-010, RM-022, RM-023

### User story

En tant qu'utilisateur, je veux définir mes séries et leurs objectifs afin de savoir exactement quoi faire à la salle.

### Pourquoi

Les objectifs prévus servent deux fois : ils guident pendant la séance, puis ils permettent de comparer le prévu et le réalisé dans le Suivi.

### Règles métier

- Seules les mesures de l'exercice sont proposées (RM-010). Profils :
  - **répétitions + charge** : Répétitions, Charge (kg) ;
  - **poids du corps** : Répétitions, et un lest facultatif (« Ajouter un lest », désactivé par défaut) enregistré comme charge ;
  - **durée** : Durée (min:s) ;
  - **cardio** : des **étapes** (une étape = une série en base) avec Durée, Distance, Vitesse, Inclinaison, Calories selon la machine.
- Chaque objectif est facultatif : un champ vide = pas d'objectif (RM-022).
- Chaque exercice a un repos par défaut (1 min 30 au départ) ; une série peut avoir son propre repos, qui remplace celui de l'exercice (RM-023).
- 1 à 20 séries par exercice.
- Bornes : répétitions 0 à 1 000 ; charge 0 à 1 000 kg, par pas de 0,25 ; durée 0 à 24 h ; distance 0 à 1 000 km ; vitesse 0 à 60 km/h ; inclinaison 0 à 40 % ; résistance 0 à 100 ; calories 0 à 10 000 ; repos 0 à 10 min.
- Valeurs de la 1ʳᵉ série ajoutée : 10 rép. (répétitions), 1 min (durée), 1 étape de 10 min (cardio), charge vide.
- En base, tout est stocké en kg, mètres, secondes, km/h (DT-11) ; l'écran affiche km pour la distance.

### Critères d'acceptation

- Toucher un exercice du bloc ouvre sa configuration, titrée par son nom et « Groupe · Matériel ».
- L'écran affiche « PRÉPARATION · OBJECTIFS PRÉVUS » et « Mesures suivies : Répétitions · Charge ».
- « Repos par défaut » se règle en minutes et secondes.
- Chaque série a ses champs ; « + Série » ajoute une série vide, « Dupliquer la dernière » recopie la dernière.
- « ⋯ » sur une série permet « Repos différent » et « Retirer ».
- Poids du corps : « Ajouter un lest » active le champ « Lest (kg) » série par série.
- Cardio : les séries s'appellent « Étape 1, 2, 3 » ; « + Étape » en ajoute une.
- Une valeur hors bornes affiche un message sous le champ et bloque « Valider l'exercice ».
- La saisie numérique ouvre le clavier numérique (décimales acceptées pour la charge, la distance et la vitesse).
- « Valider l'exercice » revient au bloc avec le résumé à jour.
- Le serveur refuse une mesure qui n'appartient pas à l'exercice (exemple : une durée sur le développé couché).

### Éléments affichés

**En-tête :** PRÉPARATION · OBJECTIFS PRÉVUS · « Mesures suivies : Répétitions · Charge »
**Repos :** Repos par défaut · 1 min 30
**Série :** Série 1 · Répétitions · Charge (kg)
**Boutons :** + Série · Dupliquer la dernière · Valider l'exercice
**Lest :** Ajouter un lest · « Gilet, ceinture, disque : une charge en plus du poids du corps » · Lest (kg)
**Durée :** Durée (min:s) · « Pendant la séance : minuteur ou chrono au choix. »
**Cardio :** Étape 1 · Durée · Distance (km) · Vitesse (km/h) · Inclinaison (%) · + Étape
**Résumés :** « 1 série · 10 rép. · 40 kg » · « 3 séries · 8 rép. · 10 kg lest » · « 3 séries · 1 min » · « 3 étapes »

### États à gérer

#### Valeur invalide
Message sous le champ (« Entre un nombre entre 0 et 1 000. »), bouton « Valider l'exercice » désactivé.

#### Exercice sans mesure connue
Message « Cet exercice n'a pas de mesure : tu pourras seulement le cocher comme fait. »

### Réponses API attendues

Validation dans la route de l'US-23 :
- Valeur hors bornes ou de mauvais type : `400`
- Mesure non prévue pour l'exercice : `422`, code `MEASURE_NOT_ALLOWED`, avec le nom de l'exercice et la mesure

### Décisions

- **D-02** : les profils « chaque côté » (A7e, A7f) sont traités par l'US-51.

### Hors périmètre

- Profils « chaque côté » et « durée chaque côté » (US-51).
- Conversion lb / mi (US-05).
- Minuteur pendant la séance (US-49).

### Tâches techniques
- [ ] BDD : `planned_set` : `reps`, `weight_kg`, `duration_seconds`, `distance_meters`, `speed_kmh`, `resistance`, `incline_percent`, `calories`, `rest_after_seconds` ; `template_block_exercise.default_rest_seconds`
- [ ] Backend : `exerciseRepository.readExerciseMeasureCodes(ids)` (avec `query`) : `SELECT em.exercise_id, m.code FROM exercise_measure em JOIN measure m ON m.id = em.measure_id WHERE em.exercise_id IN (?)`
- [ ] Shared : `getSetFields(measureCodes)` : liste des champs à afficher, utilisée par le client et par le serveur
- [ ] Shared : `getMeasureProfile(measureCodes)` : `weighted`, `bodyweight`, `duration`, `cardio`
- [ ] Shared : `formatSetSummary(sets, profile)` (« 3 séries · 8 rép. · 10 kg lest », « 3 étapes »)
- [ ] Shared : `formatDuration(seconds)` (« 1 min 30 », « 45 s ») et `parseMinSec("1:30")`
- [ ] Shared : bornes de `PlannedSetValues` dans `sessionDraftSchema` (charge : multiple de 0,25)
- [ ] Frontend : `components/SetConfigurator.tsx` choisit `RepsWeightFields`, `BodyweightFields` (lest), `DurationFields`, `CardioStepFields` selon le profil
- [ ] Frontend : `components/NumberField.tsx` (`inputMode="decimal"` ou `numeric`, message d'erreur lié par `aria-describedby`)
- [ ] Frontend : `components/RestInput.tsx` (minutes + secondes)
- [ ] Tests : unitaires : `getSetFields` et `getMeasureProfile` pour chaque profil ; `formatSetSummary` ; `parseMinSec`
- [ ] Tests : back (dans US-23) : durée sur un exercice à répétitions → 422 ; valeur négative → 400 ; charge 40,3 → 400
- [ ] Tests : E2E : configurer un exercice de chaque profil ; axe sur A7a à A7d

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement pour les 4 profils
- [ ] Clavier numérique sur mobile vérifié
- [ ] Code relu et fusionné via pull request

## US-23 · Planifier une séance libre (enregistrement)

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-12, US-13, US-14, US-15, T-05
**Intégration future :** US-24 (Planning), US-25 (déplacer), US-28 (démarrer)
**Branche :** `feat/us-23-free-session`
**Maquettes :** A1, A2, A2b, A9, CAL-01b
**Règles :** RM-015, RM-016, RM-018, RM-024, RM-027

### User story

En tant qu'utilisateur, je veux planifier ma séance à une date afin de m'entraîner sans programme.

### Pourquoi

Tout le monde ne suit pas un programme : on peut juste prévoir « Haut du corps jeudi ». C'est l'US qui enregistre tout le parcours.

### Règles métier

- Une séance libre a toujours une date ; l'heure est facultative (RM-015, RM-027).
- Une séance libre est un rendez-vous sans programme : `program_id` et `weekly_schedule_id` restent vides (RM-015).
- La date se choisit en premier, depuis le Planning ou l'Accueil ; elle reste modifiable (A2b).
- Une date passée est acceptée (séance déclarée après coup), jusqu'à 1 an en arrière ; au plus 2 ans en avant.
- Tout est enregistré en une seule fois, dans une transaction : séance, version 1, blocs, exercices, séries, rendez-vous. Si une étape échoue, rien n'est enregistré.
- Les positions (blocs, exercices, séries) sont calculées par le serveur à partir de l'ordre des listes : 1, 2, 3… Le client n'envoie jamais de position (RM-024).

### Critères d'acceptation

- Depuis le Planning ou l'Accueil, « + » puis « Séance libre » ouvre l'éditeur avec la date choisie.
- Toucher le champ Date ouvre « Date de la séance » ; « Valider la date » met à jour le champ (« Séance le samedi 28 novembre »).
- « Enregistrer la séance » enregistre tout et affiche A9 : « PRÉVUE », « 1 bloc · 6 exercices », « ✓ Séance enregistrée le jeudi 26 novembre. »
- Le retour mène au Planning (ou à l'Accueil) sur le jour choisi ; la séance y apparaît avec l'étiquette « Séance libre ».
- En cas d'échec, le brouillon est conservé et un message s'affiche ; rien n'est créé en base.
- Un exercice devenu indisponible bloque l'enregistrement avec son nom.
- Le bouton est désactivé pendant l'envoi (une seule séance créée même en cas de double appui).

### Éléments affichés

**Sélecteur de date :** Date de la séance · Aujourd'hui · Choisie · « Séance le samedi 28 novembre » · Valider la date · Fermer
**Confirmation (A9) :** PRÉVUE · Haut du corps · 1 bloc · 6 exercices · « ✓ Séance enregistrée le jeudi 26 novembre. »
**Erreur :** « Impossible d'enregistrer la séance. Ton brouillon est conservé. » + « Réessayer »
**Exercice indisponible :** « « Mon tirage élastique » n'est plus disponible. Retire-le pour enregistrer. »

### États à gérer

#### Enregistrement en cours
Bouton « Enregistrement… » désactivé, éditeur en lecture seule.

#### Erreur API
Message + « Réessayer », brouillon intact.

#### Succès
Écran A9, puis retour au jour choisi.

### Réponses API attendues

- Séance enregistrée : `201` + `{ appointment_id }`
- Données invalides (date, nom, bornes, structure) : `400`, code `VALIDATION_ERROR`
- Exercice indisponible : `422`, code `EXERCISE_NOT_AVAILABLE`
- Mesure non prévue : `422`, code `MEASURE_NOT_ALLOWED`
- Pas connecté : `401` ; origine refusée : `403`

### Hors périmètre

- Séances d'un programme (US-18, US-19).
- Vue Planning complète (US-24).
- Déplacer ou annuler (US-25, US-26).

### Tâches techniques
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

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Transaction testée (aucune ligne orpheline après échec)
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

# Sprint 04 · Faire sa séance

## US-28 · Démarrer une séance

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-23, T-05
**Intégration future :** US-29, US-30, US-33, US-34, US-44 (Reprendre ma séance)
**Branche :** `feat/us-28-start-workout`
**Maquettes :** B1, B2, écran 03 (séance démarrée)
**Règles :** RM-018, RM-038, RM-039, RM-040, RM-041, RM-044, RM-069, DT-15

### User story

En tant qu'utilisateur, je veux démarrer une séance prévue afin de noter ce que je fais réellement à la salle.

### Pourquoi

Démarrer, c'est passer du prévu au réalisé. Le prévu est copié et figé pour que l'historique reste juste, même si la séance est modifiée plus tard.

### Règles métier

- On peut démarrer une séance planifiée, à confirmer ou manquée, n'importe quel jour, avant ou après sa date prévue (RM-069) ; elle n'est pas déplacée.
- Une séance effectuée ou annulée ne se démarre pas.
- Une séance sans exercice ne se démarre pas (RM-018) : le bouton devient « Ajouter des exercices ».
- Une seule séance en cours par utilisateur (RM-040) : protégé par le serveur **et** par l'index unique de la base, même si deux demandes arrivent en même temps (DT-15).
- Un rendez-vous a au plus une séance réalisée (RM-038).
- Au démarrage, les blocs, exercices et séries prévus sont copiés ; les valeurs prévues copiées ne changent plus jamais (RM-041).
- Démarrer enregistre l'heure réelle de début et passe le rendez-vous en « effectuée » (`attended`) (RM-039).
- Les valeurs réalisées restent vides tant qu'une série n'est pas validée.
- Une séance en cours se reprend plus tard, au point d'arrêt (RM-044), dans la limite de 4 heures sans activité (RM-065).

### Critères d'acceptation

- Le détail d'une séance prévue (B1) affiche « PRÉVUE », la date, « 1 bloc · 6 exercices », les blocs et la liste des exercices, et « ▶ Démarrer la séance ».
- Un appui crée la séance réalisée, copie le prévu et ouvre la liste des exercices (B2).
- B2 affiche « En cours · séance libre » (ou le nom du programme), le chrono de séance « ● 12:40 », « Séries réalisées 0 / 18 », chaque exercice avec « 0 / 3 séries » et son résumé.
- Le chrono se calcule à partir de l'heure de début enregistrée : il reste juste après un rechargement ou une mise en veille.
- À l'Accueil, une séance en cours affiche « Reprendre ma séance », qui ramène à B2.
- Tenter de démarrer une 2ᵉ séance affiche le refus et propose de reprendre celle en cours.
- Deux appuis rapides ne créent qu'une seule séance réalisée.
- Modifier le prévu après le démarrage ne change pas les valeurs copiées.

### Éléments affichés

#### Séance prévue (B1)
**Étiquette :** PRÉVUE · **Texte :** Jeudi 26 novembre · 1 bloc · 6 exercices
**Bloc :** Classique · Force · « Développé couché · Tractions · Gainage · Tapis · Curl · Gainage latéral »
**Bouton :** ▶ Démarrer la séance (ou « Ajouter des exercices » si la séance est vide)

#### Séance en cours (B2)
**En-tête :** En cours · séance libre · ● 12:40
**Compteur :** Séries réalisées · 3 / 18
**Ligne :** Développé couché · 1 / 3 séries · 3 séries · 10 rép. · 40 kg
**Boutons :** Abandonner · Terminer la séance

#### Refus, séance déjà en cours
**Titre :** Une séance est déjà en cours
**Message :** Termine ou abandonne « Jambes » avant d'en démarrer une autre.
**Actions :** « Reprendre « Jambes » » · « Fermer »

#### Erreur
« Impossible de démarrer la séance. » + « Réessayer »

### États à gérer

#### Séance sans exercice
Bouton « Ajouter des exercices » à la place de « Démarrer ».

#### Démarrage en cours
Bouton désactivé (pas de double démarrage).

#### Séance déjà en cours
Refus explicite + accès direct à la séance en cours.

#### Erreur API
Message + « Réessayer » ; l'état réel est rechargé (si la séance a quand même démarré, on l'ouvre).

#### Chargement de B2
Structure grise, chrono masqué tant que l'heure de début n'est pas connue.

### Réponses API attendues

- Séance démarrée : `201` + `{ id }`
- Identifiant invalide : `400`
- Rendez-vous absent ou d'un autre utilisateur : `404`
- Rendez-vous effectué ou annulé : `409`, code `APPOINTMENT_NOT_STARTABLE`
- Une autre séance en cours : `409`, code `WORKOUT_ALREADY_IN_PROGRESS`, avec l'identifiant de la séance en cours
- Séance sans exercice : `422`, code `SESSION_WITHOUT_EXERCISE`
- `GET /api/workout-sessions/current` : `200` + séance ou `null`
- `GET /api/workout-sessions/:id` : `200` + arbre complet ; d'un autre : `404`

### Décisions

- **D-08** : le compteur « Séries réalisées » compte les étapes cardio comme des séries (une étape = une série en base).

### Hors périmètre

- Saisir une série (US-29), minuteur de repos (US-30), abandonner (US-33), terminer (US-34).
- Ajouter un exercice ou une série pendant la séance (US-32) : boutons masqués en MVP.
- Clôture automatique après 4 h (US-33).

### Tâches techniques
- [ ] BDD : `workout_session`, `workout_block`, `workout_exercise`, `workout_set` ; index unique `uq_one_active_workout_per_user`
- [ ] Backend : `appointmentRepository.readAppointmentForUpdate(id, userId)` : `SELECT id, status, session_version_id FROM appointment WHERE id = ? AND owner_user_id = ? FOR UPDATE`
- [ ] Backend : `sessionTemplateRepository.countVersionExercises(versionId)` (jointure `template_block_exercise` → `template_block`)
- [ ] Backend : `workoutSessionRepository.createWorkoutSession` : `INSERT … (appointment_id, owner_user_id, status, started_at, last_activity_at) VALUES (?, ?, 'in_progress', NOW(3), NOW(3))`
- [ ] Backend : `copyTemplateBlocks(workoutSessionId, versionId)`, `copyTemplateExercises(workoutSessionId)`, `copyPlannedSets(workoutSessionId)` : trois `INSERT … SELECT` (colonnes `_planned` remplies, `_actual` vides)
- [ ] Backend : `appointmentRepository.updateAppointmentStatus(id, status)`
- [ ] Backend : `workoutSessionActions.start`, dans `withTransaction` : verrou → statut → nombre d'exercices → création (lire `ER_DUP_ENTRY` sur `uq_one_active_workout_per_user` → 409 avec l'identifiant de la séance en cours) → copie → `attended` → 201
- [ ] Backend : `readCurrentWorkoutSession(userId)`, `readWorkoutSession(id, userId)`, `readWorkoutBlocks(id)`, `readWorkoutExercises(id)` (avec nom, groupe et mesures de l'exercice), `readWorkoutSets(id)` ; `workoutSessionActions.read` assemble l'arbre
- [ ] Backend : routes : `POST /api/workout-sessions` ; `GET /api/workout-sessions/current` **déclarée avant** `GET /api/workout-sessions/:id`
- [ ] Shared : `shared/workout-session.ts` : types `WorkoutSessionTree`, `WorkoutSetRow` ; `countValidatedSets`, `countPlannedSets`
- [ ] Frontend : `workoutSessionService` : `startWorkoutSession(appointmentId)`, `readCurrentWorkoutSession()`, `readWorkoutSession(id)`
- [ ] Frontend : `hooks/useWorkoutSession(id)`, `hooks/useSessionChrono(startedAt)` (calcul à partir de l'heure de début, pas d'un compteur)
- [ ] Frontend : `pages/PlannedSessionPage.tsx` (B1), `pages/WorkoutPage.tsx` (B2), `components/WorkoutExerciseRow.tsx`, `components/AlreadyInProgressDialog.tsx`
- [ ] Routing : `/seances/:appointmentId` (B1), `/entrainement/:id` (B2, plein écran)
- [ ] Tests : back : copie identique au prévu ; 2ᵉ démarrage → 409 ; **deux démarrages simultanés** (`Promise.all`) → un seul 201 ; séance vide → 422 ; rendez-vous d'un autre → 404 ; rendez-vous annulé → 409 ; modifier ensuite une `planned_set` ne change pas `workout_set.*_planned`
- [ ] Tests : unitaires : `useSessionChrono` avec faux minuteurs
- [ ] Tests : E2E : démarrer depuis l'Accueil, recharger, « Reprendre ma séance » ; axe sur B1 et B2

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Test de concurrence vert
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-29 · Valider une série

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-28
**Intégration future :** US-30 (repos lancé après validation), US-34 (résumé), US-37 (correction après coup), US-49 (minuteur)
**Branche :** `feat/us-29-validate-set`
**Maquettes :** B3a, B3b, B5a, B5f (B5g, B5h : US-51)
**Règles :** RM-024, RM-041, RM-044, RM-049, RM-065

### User story

En tant qu'utilisateur, je veux enregistrer ce que j'ai réellement fait sur chaque série afin de suivre ma performance.

### Pourquoi

C'est le cœur de l'appli à la salle : un appui quand on a fait comme prévu, quelques appuis quand on a fait autrement.

### Règles métier

- L'ordre est libre : on choisit l'exercice et la série (RM-024).
- Les valeurs prévues s'affichent en lecture seule ; seul le réalisé est saisi (RM-041).
- « Valider » sans modifier enregistre le prévu comme réalisé (fait comme prévu = 1 appui).
- « Modifier » ouvre le panneau « Ce que tu as réellement fait », avec − / + et le prévu à côté.
- Une série dont toutes les valeurs sont vides ou à 0 est refusée.
- Seules les mesures de l'exercice sont acceptées (RM-010).
- La série est enregistrée tout de suite (RM-044).
- Une série déjà validée peut être revalidée pendant la séance ; sa **première** date de validation est conservée (RM-049).
- Chaque validation met à jour l'heure de dernière activité de la séance (pour la clôture après 4 h, RM-065).
- On ne valide une série que dans une séance en cours.

### Critères d'acceptation

- Toucher un exercice dans B2 ouvre B3 : « Exercice 1 / 6 · repos 1 min 30 s ».
- Les séries validées affichent « ✓ Série 1 · 10 rép. · 40 kg ».
- La série en cours affiche les valeurs prévues en gros et « Valider la série 2 ».
- Les séries suivantes affichent « Série 3 · prévu 10 rép. · 40 kg » et « Faire ».
- « Valider la série 2 » enregistre la série et lance le repos (US-30).
- « Modifier » ouvre le panneau : Répétitions · prévu 10, Charge (kg) · prévu 40, avec − / + ; « Valider » enregistre et lance le repos ; « Annuler » ne change rien.
- Poids du corps : le lest prévu s'affiche comme une valeur (« 8 rép. · 10 kg lest »).
- Cardio : sans chrono en MVP, « Valider l'étape » ouvre le relevé de la machine pré-rempli avec le prévu (Durée, Distance, Vitesse moy., Inclinaison moy., Calories).
- « Suivant : Tractions › » passe à l'exercice suivant ; « ‹ Exercices » revient à B2.
- Le compteur « Séries réalisées » et « 1 / 3 séries » se mettent à jour tout de suite.
- En cas d'échec réseau, la série revient à son état précédent et un message s'affiche.

### Éléments affichés

**En-tête :** ‹ Exercices · Développé couché · Exercice 1 / 6 · repos 1 min 30 s
**Série validée :** ✓ Série 1 · 10 rép. · 40 kg
**Série en cours :** SÉRIE 2 · 10 rép. · 40 kg · bouton « Valider la série 2 » · lien « Modifier »
**Série à venir :** Série 3 · prévu 10 rép. · 40 kg · « Faire »
**Bas :** Suivant : Tractions ›

#### Panneau « Modifier »
**Titre :** Ce que tu as réellement fait · Série 2
**Champs :** Répétitions · prévu 10 · Charge (kg) · prévu 40 (boutons − / +)
**Actions :** Valider · Annuler

#### Relevé cardio
**Titre :** Étape 2 · Durée · Distance (km) · Vitesse moy. (km/h) · Inclinaison moy. (%) · Calories · « Valider l'étape 2 »

**Série vide :** « Indique au moins une valeur pour valider la série. »
**Erreur :** « La série n'a pas été enregistrée. Réessaie. »

### États à gérer

#### Validation en cours
Bouton désactivé ; la série passe tout de suite en « validée » (affichage optimiste).

#### Erreur API
Retour à l'état précédent + message + « Réessayer ».

#### Séance clôturée entre-temps (4 h)
Message de RM-065 et retour au résumé.

### Réponses API attendues

- Série enregistrée : `200` + série à jour
- Valeurs invalides : `400`
- Série absente ou d'un autre : `404`
- Séance qui n'est plus en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`
- Mesure non prévue : `422`, code `MEASURE_NOT_ALLOWED`
- Série vide : `422`, code `EMPTY_SET`

### Décisions

- **D-02** : la saisie gauche / droite (B5g, B5h) est traitée par l'US-51.

### Hors périmètre

- Minuteur de durée et chrono cardio (US-49) : en MVP, la durée se saisit à la main.
- Ajouter une série ou un exercice (US-32).
- Corriger après la fin de la séance (US-37).

### Tâches techniques
- [ ] Backend : `workoutSessionRepository.readWorkoutSetContext(setId, userId)` : série + statut de la séance + `exercise_id` (jointures `workout_exercise` → `workout_block` → `workout_session`, `WHERE wset.id = ? AND ws.owner_user_id = ?`)
- [ ] Backend : `updateWorkoutSetActual(setId, values)` : met à jour les 8 colonnes `_actual` et `validated_at = COALESCE(validated_at, NOW(3))` ; **jamais** les colonnes `_planned`
- [ ] Backend : `touchWorkoutSession(id)` : `UPDATE workout_session SET last_activity_at = NOW(3) WHERE id = ?`
- [ ] Backend : `workoutSessionActions.validateSet` dans `withTransaction` : contexte → 404 / 409 → mesures autorisées (`readExerciseMeasureCodes`) → série non vide → mise à jour → `touch` → 200
- [ ] Backend : `PUT /api/workout-sets/:id` → `checkOrigin` → `authenticate` → `validate` → action
- [ ] Shared : `actualSetSchema` (mêmes bornes que le prévu) ; `isEmptySet(values)` ; `getSetGap(set)` (« ▲ 2,5 kg », « ▼ 1 rép. », « = ») ; `isObjectiveReached(set)`
- [ ] Frontend : `workoutSessionService.validateSet(id, values)`
- [ ] Frontend : `hooks/useValidateSet.ts` (affichage optimiste + retour arrière)
- [ ] Frontend : `pages/WorkoutExercisePage.tsx` (B3), `components/SetRow.tsx`, `components/ActualSetSheet.tsx` (panneau Modifier avec − / +), `components/CardioReadingSheet.tsx` (B5f)
- [ ] Frontend : `components/Stepper.tsx` (− / + avec pas adapté : 1 rép., 2,5 kg, 15 s ; libellés « Diminuer », « Augmenter »)
- [ ] Tests : unitaires : `isEmptySet`, `getSetGap`, `isObjectiveReached` (répétitions, charge, durée, valeurs vides)
- [ ] Tests : back : validation ; revalidation garde la 1ʳᵉ date ; série vide → 422 ; durée sur exercice à répétitions → 422 ; séance terminée → 409 ; série d'un autre → 404 ; `last_activity_at` avance ; colonnes `_planned` inchangées
- [ ] Tests : front : 1 appui = prévu enregistré ; Modifier → valeurs saisies ; retour arrière sur erreur
- [ ] Tests : E2E : valider 3 séries d'un exercice, puis passer au suivant ; axe sur B3 et le panneau

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Zones − / + d'au moins 44 px, utilisables d'une main
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-30 · Minuteur de repos

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-29
**Intégration future :** US-05 (réglages son, vibration), US-49 (mêmes alertes)
**Branche :** `feat/us-30-rest-timer`
**Maquettes :** B4
**Règles :** RM-023, RM-060, RM-061, RM-062, RM-063

### User story

En tant qu'utilisateur, je veux un minuteur de repos après chaque série afin de respecter mes temps de récupération sans quitter l'appli.

### Pourquoi

Sans minuteur intégré, il faut ouvrir une autre application à chaque série.

### Règles métier

- Le repos démarre seul après chaque série validée.
- Durée : le repos de la série s'il existe, sinon le repos par défaut de l'exercice, sinon 1 min 30 (RM-023).
- Le temps restant se calcule à partir de l'heure de fin, pas en retirant une seconde à chaque tic : il reste juste si l'appli passe en arrière-plan.
- Bips courts aux 3 dernières secondes ; à 0, un bip long et une vibration si elle est disponible (RM-060). Rien n'est promis sur iPhone (RM-063).
- Changement visuel pendant les 10 dernières secondes ; chaque alerte sonore ou vibrante a un équivalent visuel (RM-061).
- Le minuteur ne crée aucune donnée en base (RM-062).
- Son et vibration sont activés par défaut ; leur réglage arrive avec l'US-05.

### Critères d'acceptation

- Après « Valider la série », l'écran Repos s'affiche avec « Repos · 1 min 30 s par défaut » et le temps restant en gros.
- « − 15 s » et « + 15 s » ajustent le repos en cours (jamais sous 0).
- « Passer le repos » ferme le repos tout de suite.
- « Ensuite : série 3 · prévu 10 rép. · 40 kg » annonce la suite.
- Dans les 10 dernières secondes, l'affichage change (cadre noir) ; 3 bips à 3, 2, 1.
- À 0 : bip long, vibration si possible, puis retour à l'exercice.
- Le temps reste juste après 30 secondes passées sur une autre application.
- Les lecteurs d'écran entendent « 10 secondes » puis « Repos terminé », pas chaque seconde.
- Si l'utilisateur a demandé de réduire les animations, rien ne clignote.

### Éléments affichés

**Titre :** Repos · 1 min 30 s par défaut
**Temps :** 1:12
**Boutons :** − 15 s · + 15 s · Passer le repos
**Suite :** Ensuite : série 3 · prévu 10 rép. · 40 kg
**Annonces :** « 10 secondes » · « Repos terminé »

### États à gérer

#### Repos en cours
Temps en gros, boutons actifs.

#### 10 dernières secondes
Cadre noir, annonce unique.

#### Fin du repos
Alerte, puis retour à l'exercice.

#### Navigateur sans son ni vibration
Seul le signal visuel ; aucune erreur.

### Réponses API attendues

Aucune : tout se passe dans le navigateur.

### Hors périmètre

- Réglages son / vibration / notification (US-05).
- Minuteur de durée et chrono cardio (US-49).
- Repos conservé après fermeture de l'appli.

### Tâches techniques
- [ ] Shared : `getRestDuration(set, exercise)` (série → exercice → 90 s)
- [ ] Frontend : `hooks/useCountdown.ts` : `endsAt`, `secondsLeft` calculé à partir de `Date.now()`, `addSeconds`, `skip`, nettoyage de l'intervalle
- [ ] Frontend : `hooks/useTimerAlerts.ts` : bips (Web Audio API, contexte audio créé au premier appui de l'utilisateur), `navigator.vibrate` seulement s'il existe, chaque alerte déclenchée une seule fois
- [ ] Frontend : `components/RestTimer.tsx` : temps `mm:ss`, boutons, zone `aria-live="polite"` pour les deux annonces, `motion-safe` pour l'animation
- [ ] Frontend : `shared/format` : `formatClock(seconds)` (« 1:12 »)
- [ ] Frontend : branchement : la validation d'une série (US-29) appelle `startRest(getRestDuration(...))`
- [ ] Tests : unitaires avec faux minuteurs (`vi.useFakeTimers`) : temps exact après une « veille » simulée ; − 15 s ne descend pas sous 0 ; alertes à 3, 2, 1 et 0 déclenchées une seule fois ; `navigator.vibrate` absent → pas d'erreur
- [ ] Tests : unitaires : `getRestDuration`, `formatClock`
- [ ] Tests : E2E : valider une série → repos → Passer ; axe sur B4

### Definition of Done
- [ ] Critères d'acceptation vérifiés sur un vrai téléphone (Android et iPhone)
- [ ] Aucune information portée par le son seul
- [ ] Code relu et fusionné via pull request

## US-33 · Abandonner une séance (et clôture après 4 heures)

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-28, T-04 (colonne `auto_closed`)
**Intégration future :** US-35 (historique : « Inachevée »), US-37 (corriger les résultats)
**Branche :** `feat/us-33-abandon-workout`
**Maquettes :** B2 (bouton Abandonner), CAL-07d
**Règles :** RM-044, RM-045, RM-065, DT-18

### User story

En tant qu'utilisateur, je veux arrêter une séance avant la fin afin de ne pas la laisser ouverte, sans perdre ce que j'ai déjà fait.

### Pourquoi

On peut devoir partir de la salle avant la fin. Les séries faites sont du vrai travail : elles restent dans l'historique.

### Règles métier

- Abandonner passe la séance en « inachevée » (`unfinished`), définitivement ; les séries validées sont gardées (RM-045).
- Le rendez-vous reste « effectué » (`attended`).
- Une séance inachevée ne se reprend jamais ; ses résultats pourront être corrigés (US-37).
- Une séance sans aucune action pendant 4 heures est clôturée automatiquement de la même façon (RM-065) ; l'heure de fin enregistrée est celle de la dernière action.
- Une tâche du serveur vérifie toutes les 5 minutes ; elle ne clôture que les séances encore en cours (DT-18).
- Une séance clôturée automatiquement est marquée (`auto_closed`), pour afficher le bon message.

### Critères d'acceptation

- « Abandonner » dans B2 ouvre une confirmation.
- « Continuer ma séance » ferme la confirmation sans rien changer.
- « Abandonner » passe la séance en inachevée et mène au résumé (US-34) avec l'étiquette « INACHEVÉE ».
- Les séries validées sont intactes ; les autres restent sans valeur réalisée.
- Abandonner une séance déjà terminée est refusé.
- Après 4 h sans action, la séance est clôturée ; à la prochaine ouverture, le message de RM-065 s'affiche avec « Voir le résumé » (et « Corriger les résultats » quand l'US-37 sera faite).
- Une séance avec une action il y a 3 h 59 n'est pas clôturée.

### Éléments affichés

#### Confirmation
**Titre :** Abandonner cette séance ?
**Message :** Tes séries faites seront gardées dans ton historique. Tu ne pourras pas reprendre cette séance.
**Actions :** « Abandonner » · « Continuer ma séance »

#### Clôture automatique (RM-065)
**Message :** Cette séance a été clôturée après 4 heures sans activité. Tes résultats ont été conservés.
**Boutons :** Voir le résumé · Corriger les résultats (US-37)

**Erreur :** « Impossible d'abandonner la séance. Réessaie. » + « Réessayer »

### États à gérer

#### Confirmation annulée
Aucune requête, la séance continue.

#### Abandon en cours
Boutons désactivés.

#### Erreur API
Message + « Réessayer » ; l'état réel est rechargé (déjà inachevée → résumé).

### Réponses API attendues

- Abandon réussi : `200` + résumé
- Séance absente ou d'un autre : `404`
- Séance qui n'est pas en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`

### Décisions

- **D-09** : un abandon sans aucune série validée applique RM-045 telle quelle : la séance devient « inachevée », sans résultat.

### Hors périmètre

- Corriger les résultats (US-37).
- Reprendre une séance inachevée (interdit par RM-045).

### Tâches techniques
- [ ] BDD : `workout_session.auto_closed` (migration 004)
- [ ] Backend : `workoutSessionRepository.abandonWorkoutSession(id, userId)` : `UPDATE workout_session SET status = 'unfinished', ended_at = NOW(3) WHERE id = ? AND owner_user_id = ? AND status = 'in_progress'`
- [ ] Backend : action : 0 ligne modifiée → relire la séance → absente : 404, sinon 409
- [ ] Backend : `closeInactiveWorkoutSessions()` : `UPDATE workout_session SET status = 'unfinished', ended_at = last_activity_at, auto_closed = TRUE WHERE status = 'in_progress' AND last_activity_at < NOW(3) - INTERVAL 4 HOUR`
- [ ] Backend : `main.ts` : `setInterval(closeInactiveWorkoutSessions, 5 * 60 * 1000)`, jamais démarré pendant les tests ; erreurs loguées sans arrêter le serveur
- [ ] Backend : `POST /api/workout-sessions/:id/abandon` → `checkOrigin` → `authenticate` → `validate({ params })` → action
- [ ] Frontend : `workoutSessionService.abandonWorkoutSession(id)`
- [ ] Frontend : `components/AbandonWorkoutDialog.tsx` ; `components/AutoClosedNotice.tsx`
- [ ] Tests : back : abandon → `unfinished`, séries gardées, rendez-vous `attended` ; 2ᵉ abandon → 409 ; séance d'un autre → 404
- [ ] Tests : back : `closeInactiveWorkoutSessions` avec une séance à 3 h 59 (non touchée) et une à 4 h 01 (clôturée, `ended_at = last_activity_at`, `auto_closed = TRUE`)
- [ ] Tests : E2E : abandonner après 2 séries → résumé « INACHEVÉE »

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Modale accessible (focus piégé, Échap = continuer)
- [ ] Code relu et fusionné via pull request

## US-34 · Terminer une séance

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-29
**Intégration future :** US-36 (détail dans l'historique), US-37 (corriger), US-40 (records)
**Branche :** `feat/us-34-complete-workout`
**Maquettes :** B6
**Règles :** RM-046, RM-051

### User story

En tant qu'utilisateur, je veux terminer ma séance afin de voir mon résumé.

### Pourquoi

Le résumé, c'est la récompense : durée, séries faites, volume soulevé.

### Règles métier

- Terminer passe la séance en « terminée » (`completed`) et enregistre l'heure de fin.
- Des séries peuvent rester non faites ; elles n'ont pas de date de validation (RM-046).
- Le résumé est calculé à partir des résultats, rien n'est stocké en plus (RM-051) :
  - durée = fin − début ;
  - séries = validées / prévues ;
  - volume = somme de répétitions × charge des séries validées (un exercice sans charge compte 0).
- Le résumé de chaque exercice indique les séries faites / prévues et les valeurs réalisées.

### Critères d'acceptation

- « Terminer la séance » ouvre une confirmation qui indique le nombre de séries non faites.
- Après confirmation, le résumé B6 s'affiche : nom, date, « ✓ TERMINÉE », durée, « 17 / 18 séries », volume.
- Chaque exercice affiche « 3 / 3 · 10, 8, 10 rép. » ou, pour une série incomplète, « 2 / 3 · série 3 non faite ».
- « Retour au planning » ramène au Planning sur le jour de la séance.
- Une séance déjà terminée ne peut pas être terminée une 2ᵉ fois.
- Le même résumé s'affiche (avec « INACHEVÉE ») après un abandon (US-33).

### Éléments affichés

#### Confirmation
**Titre :** Terminer la séance ?
**Message :** 1 série n'est pas faite. Elle restera non faite dans ton historique.
**Actions :** « Terminer » · « Continuer ma séance »

#### Résumé (B6)
**Titre :** Résumé · Haut du corps · jeudi 26 novembre
**Étiquette :** ✓ TERMINÉE (ou INACHEVÉE)
**Chiffres :** 48 min · 17 / 18 séries · 3 240 kg volume
**Exercice :** Développé couché · 3 / 3 · 10, 8, 10 rép.
**Boutons :** Corriger les résultats (US-37, masqué en MVP) · Retour au planning

### États à gérer

#### Terminaison en cours
Boutons désactivés.

#### Erreur API
Message « Impossible de terminer la séance. Réessaie. » + « Réessayer » ; l'état réel est rechargé.

#### Aucune série validée
Voir À PRÉCISER.

### Réponses API attendues

- Séance terminée : `200` + résumé
- Séance absente ou d'un autre : `404`
- Séance qui n'est pas en cours : `409`, code `WORKOUT_NOT_IN_PROGRESS`

### Décisions

- **D-10** : terminer sans aucune série validée est refusé (`422`, code `NO_VALIDATED_SET`, message « Aucune série n'est faite. Tu peux abandonner la séance. ») avec le bouton « Abandonner ».

### Hors périmètre

- Corriger les résultats (US-37).
- Détection et notification des records (US-40).

### Tâches techniques
- [ ] Backend : `workoutSessionRepository.completeWorkoutSession(id, userId)` : même forme que l'abandon avec `status = 'completed'`
- [ ] Backend : `workoutSessionActions.complete` : 0 ligne → 404 / 409 ; sinon relire l'arbre et renvoyer le résumé
- [ ] Backend : `POST /api/workout-sessions/:id/complete`
- [ ] Shared : `computeDurationSeconds(startedAt, endedAt)`, `computeTonnage(sets)`, `countValidatedSets`, `countPlannedSets`, `formatExerciseResult(sets, profile)` (« 3 / 3 · 10, 8, 10 rép. »)
- [ ] Frontend : `workoutSessionService.completeWorkoutSession(id)`
- [ ] Frontend : `components/CompleteWorkoutDialog.tsx`, `pages/WorkoutSummaryPage.tsx` (B6, sert aussi après un abandon)
- [ ] Routing : `/entrainement/:id/resume`
- [ ] Tests : unitaires : `computeTonnage` (séries non validées ignorées, sans charge, décimales 62,5), `computeDurationSeconds`, `formatExerciseResult`
- [ ] Tests : back : terminer avec des séries non faites → 200, leur `validated_at` reste vide ; 2ᵉ terminaison → 409 ; d'un autre → 404
- [ ] Tests : E2E : séance complète → résumé avec les bons chiffres ; axe sur B6

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Chiffres du résumé vérifiés à la main sur un exemple
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

# Sprint 05 · Historique (fin du MVP)

## US-35 · Voir mon historique

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 05
**Dépendance principale :** US-28, US-33, US-34
**Intégration future :** US-27 (statut « à confirmer »), US-41 (onglet Résumé), US-39 (onglet Exercices), US-52 (filtres)
**Branche :** `feat/us-35-history-list`
**Maquettes :** SUI-05, SUI-07 (filtres SUI-05f, SUI-05g, SUI-05v : US-52)
**Règles :** RM-050, RM-059, RM-082

### User story

En tant qu'utilisateur, je veux voir la liste de mes séances passées afin de mesurer ma régularité.

### Pourquoi

L'historique répond à « qu'est-ce que j'ai fait, et quand ? », y compris les séances manquées ou annulées, pour une image honnête.

### Règles métier

- L'historique montre les séances terminées, inachevées, à confirmer, manquées et annulées (RM-059).
- Les séances à venir et la séance en cours n'apparaissent pas.
- Classement du plus récent au plus ancien : par **date de réalisation** pour une séance faite ou inachevée, par **date prévue** pour les autres (RM-050, RM-082).
- Regroupement par semaine, du lundi au dimanche (« SEMAINE DU 23 NOV. »).
- Mêmes statuts et mêmes symboles que le Planning, toujours symbole + texte.
- Une séance faite un autre jour que prévu indique « Prévue le 19 » ; une séance déplacée indique « ↷ déplacée du 21 ».
- 20 séances chargées à la fois.
- « Aujourd'hui » est calculé en `Europe/Paris` par le serveur.

### Critères d'acceptation

- L'onglet Suivi ouvre l'Historique (en MVP, les onglets Résumé et Exercices ne sont pas affichés).
- Chaque ligne affiche le jour (« JEU 26 »), le symbole, le nom de la séance, « Statut · Programme » (ou « Séance libre ») et une flèche ›.
- Une séance prévue le 19 et faite le 17 est rangée au 17, avec « Prévue le 19 ».
- Une séance annulée dans le futur n'apparaît pas.
- La séance en cours n'apparaît pas.
- Toucher une ligne ouvre le détail (US-36).
- « Charger plus » (ou le défilement) ajoute les 20 suivantes ; à la fin, plus rien ne se charge.
- Sans aucune séance passée : l'écran SUI-07.
- Une séance d'un autre utilisateur n'apparaît jamais.

### Éléments affichés

**Onglets :** Résumé · Historique · Exercices (seul Historique en MVP)
**Groupe :** SEMAINE DU 23 NOV.
**Lignes :**
- JEU 26 · ✓ Réveil musculaire · Effectuée · Séance libre ›
- MAR 24 · Dos · À confirmer · Séance libre · ↷ déplacée du 21 ›
- SAM 21 · × Course · Manquée · Cardio base ›
- MAR 17 · ✓ Haut du corps · Effectuée · Séance libre · Prévue le 19 ›
- SAM 14 · / Course · Annulée · Cardio base ›

**Vide (SUI-07) :**
> Aucune séance passée
> Tes séances apparaîtront ici dès qu'elles seront faites, manquées ou annulées.

**Erreur :** « Impossible de charger ton historique. » + « Réessayer »

### États à gérer

#### Chargement
Lignes grises de la même hauteur.

#### Vide
Écran SUI-07.

#### Erreur
Message + « Réessayer ».

#### Chargement des suivantes
Une ligne grise en bas ; en cas d'erreur, les lignes affichées restent et « Réessayer » apparaît en bas.

### Réponses API attendues

- Liste : `200` + `{ items, has_more }`
- Paramètre invalide : `400`
- Pas connecté : `401`

### Décisions

- **D-07** : les filtres de l'historique (SUI-05f, SUI-05g, SUI-05v) sont traités par l'US-52. En MVP, la liste suffit.

### Hors périmètre

- Onglets Résumé (US-41) et Exercices (US-39).
- Filtres (US-52).
- Passage automatique en « à confirmer » et « manquée » (US-27) : en MVP, une séance passée non faite reste « planifiée » et n'apparaît donc pas.

### Tâches techniques
- [ ] Backend : `historyRepository.readHistory(userId, today, limit, offset)` : rendez-vous + nom de séance + programme + séance réalisée (`LEFT JOIN workout_session`) ; condition `ws.status IN ('completed','unfinished') OR (ws.id IS NULL AND a.status IN ('to_confirm','missed','cancelled') AND a.planned_date < ?)` ; colonne calculée `COALESCE(DATE(ws.started_at), a.planned_date) AS history_date` ; `ORDER BY history_date DESC, a.id DESC LIMIT ? OFFSET ?` (en chaînes)
- [ ] Backend : vérifier avec `EXPLAIN` que l'index `ix_appointment_calendar` est utilisé
- [ ] Backend : `historyActions.browse` (demande 21 lignes pour savoir s'il en reste : `has_more`)
- [ ] Backend : `historyRouter.ts` : `GET /api/history?offset=` → `authenticate` → `validate` → action
- [ ] Shared : `shared/history.ts` : `getHistoryStatus(row)` (`completed`, `unfinished`, `to_confirm`, `missed`, `cancelled`), `groupByWeek(rows)` (lundi → dimanche), `formatWeekLabel` (« SEMAINE DU 23 NOV. »), `formatDayBadge` (« JEU 26 »)
- [ ] Shared : `todayInParis()` (déjà créé pour US-23)
- [ ] Frontend : `features/history/services/historyService.ts`, `hooks/useHistory.ts`
- [ ] Frontend : `pages/TrackingPage.tsx` (onglet Suivi, Historique seul en MVP), `components/HistoryWeekGroup.tsx`, `components/HistoryRow.tsx` (avec `StatusBadge`)
- [ ] Routing : `/suivi` et `/suivi/historique`
- [ ] Tests : unitaires : `getHistoryStatus`, `groupByWeek` (un dimanche reste dans la semaine du lundi précédent), `formatWeekLabel`
- [ ] Tests : back : ordre par date réelle (prévue le 19, faite le 17 → rangée au 17) ; séance en cours absente ; annulée future absente ; séance d'un autre absente ; `has_more` exact
- [ ] Tests : E2E : historique vide, puis après une séance terminée ; axe sur SUI-05 et SUI-07

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États chargement, vide, erreur et chargement des suivantes testés
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

## US-36 · Voir le détail d'une séance passée

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 05
**Dépendance principale :** US-35
**Intégration future :** US-37 (« Corriger les résultats »), US-38 (déclarer faite)
**Branche :** `feat/us-36-history-detail`
**Maquettes :** SUI-06, SUI-06b
**Règles :** RM-047, RM-051, RM-058

### User story

En tant qu'utilisateur, je veux revoir une séance passée afin de comparer ce que j'avais prévu et ce que j'ai fait.

### Pourquoi

Voir l'écart entre le prévu et le réalisé, série par série, aide à ajuster les prochaines séances.

### Règles métier

- Séance faite ou inachevée : on affiche le prévu copié au démarrage et le réalisé, côte à côte (RM-047).
- Séance manquée, annulée ou à confirmer : on affiche seulement le prévu, celui de sa version d'origine (RM-058).
- Écart écrit avec ▲ ▼ = et la valeur (« ▲ 2,5 kg », « ▼ 1 rép. »), jamais seulement en couleur.
- « = » quand l'objectif est atteint pile.
- En tête : durée, tonnage (seulement s'il y a des charges) et objectifs atteints, calculés à partir des résultats (RM-051).
- Un objectif est atteint quand chaque valeur prévue est atteinte ou dépassée.

### Critères d'acceptation

- Le titre est le nom de la séance ; dessous : « Effectuée jeudi 19 novembre · 07:02 » et « Force 8 semaines · semaine 3 » (ou « Séance libre »).
- Les trois chiffres : « 52 min durée », « 1 760 kg tonnage », « 6 / 10 objectifs atteints ».
- Chaque exercice affiche « 2 / 4 objectifs » et un tableau : série, PRÉVU, RÉALISÉ, ÉCART.
- Une série non faite affiche « Non faite ».
- Une séance manquée affiche l'étiquette « • MANQUÉE », « Prévue samedi 21 novembre · sans heure · Cardio base », le bloc « Prévu » et la phrase « Aucun résultat : seul le prévu est affiché. »
- Une séance manquée n'affiche pas « Corriger les résultats ».
- Ouvrir l'adresse d'une séance d'un autre affiche « Séance introuvable ».

### Éléments affichés

#### Séance effectuée (SUI-06)
**Ligne 1 :** Effectuée jeudi 19 novembre · 07:02
**Ligne 2 :** Force 8 semaines · semaine 3
**Chiffres :** 52 min · durée · 1 760 kg · tonnage · 6 / 10 · objectifs atteints
**Exercice :** Squat à la barre · 2 / 4 objectifs
**Tableau :** S1 · 8 × 60 kg · 8 × 60 kg · = ; S2 · 8 × 60 kg · 7 × 60 kg · ▼ 1 rép. ; S3 · 8 × 60 kg · 8 × 62,5 kg · ▲ 2,5 kg
**Bouton :** Corriger les résultats (US-37, masqué en MVP)

#### Séance manquée (SUI-06b)
**Étiquette :** • MANQUÉE
**Ligne :** Prévue samedi 21 novembre · sans heure · Cardio base
**Bloc :** Prévu · Tapis de course · 30 min · 9 km/h · 1 %
**Phrase :** Aucun résultat : seul le prévu est affiché.

**Introuvable :** « Séance introuvable » + « Retour à l'historique »
**Erreur :** « Impossible de charger la séance. » + « Réessayer »

### États à gérer

#### Chargement
Structure grise.

#### Séance sans charge
Pas de tonnage affiché.

#### Séance inachevée
Étiquette « INACHEVÉE », séries non faites affichées « Non faite ».

#### Introuvable / Erreur
Messages ci-dessus.

### Réponses API attendues

- Détail : `200` + `{ kind: "done" | "planned_only", … }`
- Identifiant invalide : `400`
- Absent ou d'un autre : `404`

### Hors périmètre

- Corriger les résultats (US-37).
- Déclarer faite une séance manquée (US-38).
- Numéro de semaine du programme : affiché seulement quand les programmes existent (V1) ; en MVP, « Séance libre ».

### Tâches techniques
- [ ] Backend : `historyActions.read(appointmentId, userId)` : `readHistoryAppointment` (rendez-vous + séance + programme, filtré par `owner_user_id`) ; s'il y a une séance réalisée → fonctions `readWorkout…` de l'US-28 ; sinon → `readVersionBlocks`, `readVersionExercises`, `readVersionSets` (prévu de la version d'origine)
- [ ] Backend : `GET /api/history/:appointmentId` → `authenticate` → `validate({ params })` → action
- [ ] Shared : `getSetGap`, `isObjectiveReached`, `countReachedObjectives`, `computeTonnage`, `computeDurationSeconds` (déjà créés, réutilisés) ; `formatSetValues` (« 8 × 62,5 kg », « 1:10 »)
- [ ] Frontend : `historyService.readHistoryDetail(id)`, `hooks/useHistoryDetail.ts`
- [ ] Frontend : `pages/HistoryDetailPage.tsx` ; `components/SessionStats.tsx` ; `components/SetComparisonTable.tsx` (vrai `<table>` avec `<th scope="col">` PRÉVU, RÉALISÉ, ÉCART) ; `components/PlannedOnlyView.tsx` (SUI-06b)
- [ ] Routing : `/suivi/historique/:appointmentId`
- [ ] Tests : unitaires : `getSetGap` (répétitions, charge, durée, vide), `countReachedObjectives` (exemple SUI-06 : 6 / 10)
- [ ] Tests : back : séance faite (prévu + réalisé), séance manquée (prévu seul), séance d'un autre → 404
- [ ] Tests : E2E : de la liste au détail ; axe sur SUI-06 et SUI-06b

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement, chiffres de SUI-06 retrouvés sur les données d'exemple
- [ ] Tableau lisible au lecteur d'écran
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console

# Sprint 06 · Planning et notifications

## US-24 · Voir mon planning

EPIC 5 · Planning

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-23, US-28
**Intégration future :** US-25, US-26, US-27, US-17
**Branche :** `feat/us-24-planning`
**Maquettes :** CAL-01, CAL-01b, CAL-02, CAL-03, CAL-03u, CAL-03p, CAL-03e, CAL-03d, CAL-03h, CAL-04, CAL-04m, CAL-10a, CAL-10b, CAL-10c
**Règles :** RM-027, RM-028, RM-040, RM-064, RM-069, RM-070

### User story

En tant qu'utilisateur, je veux voir mes séances par mois, par semaine et par jour afin de savoir quand je m'entraîne.

### Pourquoi

Le Planning est la vue d'ensemble : ce qui est prévu, fait, manqué, déplacé.

### Ce qui change

En MVP, l'onglet Planning n'affichait qu'une liste simple. Il devient le vrai calendrier.

### Règles métier

- Vues Mois (CAL-01) et Semaine (CAL-02), et le détail d'un jour (CAL-03).
- Statuts : Planifiée, Effectuée, Inachevée, À confirmer, Manquée, Annulée ; « ↷ Déplacée » est un indicateur en plus du statut. Toujours symbole + mot (RM-064).
- Mois : 3 indicateurs par jour au plus, « +n » au-delà.
- Tri d'un jour : par heure, sans heure en dernier.
- Une séance faite un autre jour s'affiche à sa date réelle avec « Prévue le … », et en rappel grisé à sa date prévue, qui ne compte pas (RM-070).
- Une séance peut être démarrée avant ou après sa date (RM-069).
- Si une séance est en cours, « Démarrer » devient « Une séance est en cours » sur les autres (RM-040).
- Le bouton « + » propose « Séance libre » ou « Programme », avec la date du jour sélectionné.

### Critères d'acceptation

- CAL-01 : ‹ › change de mois, « Aujourd'hui » revient au jour courant, toucher un jour le sélectionne et affiche ses séances dessous.
- CAL-02 : ‹ › change de semaine ; chaque séance avec heure, nom, statut ; « sans heure » à la place de l'heure.
- CAL-03 : « Jeudi 26 novembre · 4 séances · 1 effectuée », la prochaine séance mise en avant avec « Démarrer ».
- CAL-03e / 03d : jour sans séance, aujourd'hui ou un autre jour, avec « Ajoute une séance libre ou démarre un programme. »
- CAL-03h : séances à confirmer avec « Touche une séance pour dire si tu l'as faite. »
- CAL-04 : détail d'une séance prévue (programme, semaine, exercices) et ses actions ; menu ⋯ (CAL-04m) : Modifier la préparation, Déplacer, Annuler le rendez-vous.
- CAL-10a/b/c : une séance faite le 17 et prévue le 19 apparaît le 17 (« Prévue le 19 novembre ») et en rappel grisé le 19 ; le 19 compte 2 séances, pas 3.
- Un rendez-vous d'un autre utilisateur n'apparaît jamais.

### Éléments affichés

**Légende :** Planifiée · Effectuée · Inachevée · À confirmer · × Manquée · / Annulée · ↷ Déplacée · Rappel · faite un autre jour (non comptée)
**CAL-01b :** Séance libre · Programme
**CAL-03 :** « Jeudi 26 novembre · 4 séances · 1 effectuée » · « La prochaine séance prévue. Les autres se démarrent depuis leur détail. »
**CAL-03e :** « Ajoute une séance libre ou démarre un programme. »
**CAL-03h :** « Touche une séance pour dire si tu l'as faite. »
**CAL-04 :** « Programme Force 8 semaines · semaine 4 » · Démarrer · Modifier la préparation · Déplacer · Annuler le rendez-vous
**CAL-10a :** « Effectuée · Séance libre · Prévue le 19 novembre »

### États à gérer

#### Chargement
Grille grise, navigation utilisable.

#### Erreur
« Impossible de charger ton planning. » + « Réessayer ».

#### Séance en cours
« Une séance est en cours » à la place de « Démarrer ».

### Réponses API attendues

- `GET /api/appointments?from=&to=` (62 jours max) : `200` ; plage invalide : `400`

### Hors périmètre

- Vue Jour séparée (le détail du jour CAL-03 la remplace).
- Déplacer, annuler, confirmer (US-25 à US-27).

### Tâches techniques
- [ ] Backend : `readAppointmentsBetween` élargi : rendez-vous **prévus** dans la plage **ou réalisés** dans la plage (`a.planned_date BETWEEN ? AND ? OR DATE(ws.started_at) BETWEEN ? AND ?`), avec `initial_date`, `moved_manually`, programme et numéro de semaine
- [ ] Shared : `getAppointmentDisplayDate(row)` (date réelle si faite), `buildDayEntries(rows, day)` (séances du jour + rappels grisés), `buildMonthGrid(year, month)` (semaines du lundi au dimanche), `getProgramWeekNumber(program, date)`
- [ ] Frontend : `features/appointment/pages/PlanningPage.tsx` (Mois / Semaine), `MonthGrid.tsx`, `WeekList.tsx`, `DayAppointments.tsx`, `AppointmentRow.tsx`, `AppointmentDetailPage.tsx` (CAL-04), `AppointmentActionsMenu.tsx`, `CreateChoiceSheet.tsx` (CAL-01b)
- [ ] Frontend : grille du mois accessible (`role="grid"`, flèches du clavier, jour sélectionné annoncé)
- [ ] Tests : unitaires `buildDayEntries` (rappel non compté), `buildMonthGrid` (mois commençant un dimanche) ; back : séance faite hors plage prévue mais réalisée dans la plage incluse ; séances d'un autre exclues
- [ ] Tests : E2E navigation mois / semaine / jour ; axe sur CAL-01, CAL-02, CAL-03

### Definition of Done
- [ ] Exemple CAL-10 vérifié sur les données de démonstration
- [ ] Code relu et fusionné via pull request

## US-26 · Annuler une séance

EPIC 5 · Planning

**Taille :** S (2 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24
**Intégration future :** US-41 (comptée « annulée »)
**Branche :** `feat/us-26-cancel-appointment`
**Maquettes :** CAL-07, CAL-07b, CAL-07c
**Règles :** RM-035

### User story

En tant qu'utilisateur, je veux annuler une séance prévue afin de garder un planning juste.

### Pourquoi

Une séance qu'on sait qu'on ne fera pas ne doit pas finir « manquée ».

### Règles métier

- Seule une séance planifiée ou à confirmer, **non commencée**, s'annule.
- Elle passe en « Annulée », avec la date et l'heure d'annulation, et reste visible dans le jour et l'historique (RM-035).
- Une séance annulée ne compte pas dans la progression.
- Une séance commencée ne s'annule pas : on la termine ou on l'abandonne (CAL-07b).
- Ses notifications « À confirmer » éventuelles sont marquées lues.

### Critères d'acceptation

- CAL-07 : confirmation avec la date, « Annuler la séance » / « Garder la séance ».
- Après annulation, CAL-07c : « Annulée le 25 novembre à 21:12 », pas de « Démarrer ».
- Séance en cours (CAL-07b) : message et « Reprendre ».

### Éléments affichés

**CAL-07 :** « Jeudi 26 novembre · 07:00. La séance restera visible dans ton historique comme annulée. » · Annuler la séance · Garder la séance
**CAL-07b :** Séance commencée · « Elle ne peut plus être annulée. Termine-la ou abandonne-la depuis la séance : tes séries réalisées sont conservées. » · Reprendre
**CAL-07c :** « Prévue jeudi 26 novembre · 07:00 » · « Annulée le 25 novembre à 21:12 »

### États à gérer

#### Envoi
Boutons désactivés.

### Réponses API attendues

- Annulée : `200`
- Commencée, effectuée, déjà annulée : `409`, code `APPOINTMENT_NOT_CANCELLABLE`
- D'un autre : `404`

### Hors périmètre

- Annuler toutes les séances d'un programme (US-21).

### Tâches techniques
- [ ] BDD : `appointment.cancelled_at` + contrainte (migration 002)
- [ ] Backend : `cancelAppointment(id, userId)` : `UPDATE appointment SET status = 'cancelled', cancelled_at = NOW(3) WHERE id = ? AND owner_user_id = ? AND status IN ('planned','to_confirm') AND NOT EXISTS (SELECT 1 FROM workout_session WHERE appointment_id = appointment.id)` ; 0 ligne → relire pour 404 / 409
- [ ] Backend : `markAppointmentNotificationsRead(appointmentId)` ; `PATCH /api/appointments/:id/cancel`
- [ ] Frontend : `CancelAppointmentDialog`, affichage CAL-07c
- [ ] Tests : back : annulation, `cancelled_at` rempli, commencée → 409, la contrainte refuse `cancelled` sans date

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-27 · Confirmer une séance passée (À confirmer, Manquée)

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24, US-46
**Intégration future :** US-38 (déclarer faite), US-41 (comptage)
**Branche :** `feat/us-27-confirm-past-session`
**Maquettes :** CAL-03h, CAL-08, CAL-08c, NOT-03, NOT-03b, NOT-04
**Règles :** RM-052, RM-053, RM-054, RM-055, RM-056, RM-067, DT-16

### User story

En tant qu'utilisateur, je veux dire si j'ai fait une séance passée afin que mon historique soit juste.

### Pourquoi

On oublie souvent de lancer l'appli à la salle. Sans confirmation, l'historique serait faux.

### Ce qui change

L'historique (US-35) affiche maintenant des séances « À confirmer » et « Manquées » : en MVP, une séance passée non faite restait « planifiée ».

### Règles métier

- Une séance planifiée dont la date est passée devient « À confirmer » à 00 h le lendemain (fuseau de l'utilisateur), puis « Manquée » 72 h plus tard sans réponse, avec ou sans heure (RM-052).
- Une séance effectuée ne devient jamais manquée (RM-053).
- « Pas faite » la passe immédiatement en « Manquée », sans nouvelle notification « Manquée » (RM-067).
- On peut toujours la déclarer faite plus tard, sans limite (RM-054).
- Une notification « Séance à confirmer » est créée au passage en À confirmer, une « Séance manquée » au passage automatique en Manquée ; jamais en double (RM-055, RM-056, DT-16).
- Répondre (faite ou pas faite) marque la notification comme lue.

### Critères d'acceptation

- La tâche planifiée passe les bons rendez-vous en « À confirmer » et en « Manquée » (exemple : prévue le 24 → à confirmer le 25 à 00 h → manquée le 28 à 00 h).
- CAL-08 : « Prévue mardi 24 novembre · 12:00 · séance libre », « Sans réponse, elle passera « Manquée » le samedi 28 novembre à 00 h. », Je l'ai faite · Pas faite · Déplacer.
- « Pas faite » → CAL-08c / NOT-03b : « ✓ Séance marquée comme manquée. Tu pourras toujours la déclarer faite plus tard. »
- « Je l'ai faite » → déclaration après coup (US-38).
- Relancer la tâche ne crée aucun doublon.

### Éléments affichés

**CAL-08 :** « Tu pourras toujours la déclarer faite plus tard. » · « Sans réponse, elle passera « Manquée » le samedi 28 novembre à 00 h. » · Je l'ai faite · Pas faite · Déplacer
**NOT-03 :** À CONFIRMER · « Aucun résultat saisi pour cette séance. » · Je l'ai faite · saisir mes résultats · Pas faite
**NOT-03b :** × MANQUÉE · « ✓ Séance marquée comme manquée. » · « Tu pourras toujours la déclarer faite plus tard. » · Retour aux notifications
**NOT-04 :** « Tu l'as finalement faite ? Tu peux encore la déclarer, même après 72 h. » · Voir dans le Suivi ›

### États à gérer

#### Envoi
Boutons désactivés.

#### Déjà traitée ailleurs
Rechargement de l'état réel.

### Réponses API attendues

- « Pas faite » : `POST /api/appointments/:id/not-done` → `200`
- Statut incompatible (planifiée future, effectuée, annulée) : `409`

### Décisions

- **D-12** : les dates sont calculées dans le fuseau de l'utilisateur (`user.timezone`, `Europe/Paris` par défaut, migration 004).

### Hors périmètre

- Saisir les résultats après coup (US-38).
- Centre de notifications (US-46).

### Tâches techniques
- [ ] Backend : tâche `updateAppointmentStatuses()` toutes les 5 min, pour chaque fuseau : `UPDATE appointment SET status = 'to_confirm' WHERE status = 'planned' AND planned_date < ?` (aujourd'hui) puis `UPDATE … SET status = 'missed' WHERE status = 'to_confirm' AND planned_date <= ?` (aujourd'hui − 4 jours) ; les rendez-vous avec une séance réalisée sont exclus
- [ ] Backend : notifications créées par `INSERT … SELECT` sur les rendez-vous concernés, sans doublon grâce à l'index unique (`ON DUPLICATE KEY UPDATE id = id`)
- [ ] Backend : `markNotDone(id, userId)` : `to_confirm` → `missed`, notification « à confirmer » lue, **pas** de notification « manquée »
- [ ] Shared : `computeAppointmentStatus` (US-25), `getMissedDeadline(plannedDate)` (« samedi 28 novembre à 00 h »)
- [ ] Frontend : `ConfirmPastSessionPage.tsx` (CAL-08), messages CAL-08c / NOT-03b
- [ ] Tests : back avec dates passées en paramètre : J+1 → à confirmer, J+4 → manquée, effectuée jamais touchée, relance sans doublon, « Pas faite » sans notification « manquée »
- [ ] Tests : unitaires `getMissedDeadline`

### Definition of Done
- [ ] Tâche planifiée testée sans attendre minuit
- [ ] Code relu et fusionné via pull request

## US-25 · Déplacer une séance

EPIC 5 · Planning

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-24, US-27 (statuts et notifications)
**Intégration future :** US-20 (rendez-vous déplacés conservés)
**Branche :** `feat/us-25-move-appointment`
**Maquettes :** CAL-05, CAL-05b
**Règles :** RM-032, RM-052, RM-068, DT-24

### User story

En tant qu'utilisateur, je veux déplacer une séance à un autre jour afin de m'adapter à un imprévu.

### Pourquoi

Un rendez-vous tombe à l'eau : on décale la séance au lendemain, ou même à un jour passé si on l'a faite plus tôt.

### Règles métier

- Déplaçable si Planifiée, À confirmer ou Manquée, vers n'importe quelle date passée ou future ; jamais si Effectuée ou Annulée (pas de bouton) (RM-068).
- L'heure est facultative et modifiable.
- La date prévue d'origine est conservée et affichée ; l'indicateur « déplacée manuellement » est posé (RM-032).
- Le statut est recalculé selon la nouvelle date : aujourd'hui ou futur → Planifiée ; passé, 72 h non écoulées → À confirmer ; passé, 72 h écoulées → Manquée. Les 72 h partent de 00 h le lendemain de la nouvelle date.
- Les notifications « À confirmer » et « Manquée » devenues fausses sont supprimées, et les bonnes sont créées, dans la même transaction (DT-24). Le rendez-vous n'est jamais supprimé.
- Une séance déplacée à la main ne bouge plus quand la règle hebdomadaire change.

### Critères d'acceptation

- « Déplacer » ouvre CAL-05 : calendrier (date actuelle en pointillé), heure facultative, Confirmer, Annuler.
- Après confirmation, CAL-04 affiche le badge « Déplacée » et « Prévue le 21 nov. · déplacée au 24 nov. ».
- Exemple CAL-05b : « Dos » manquée le 21, déplacée au 24 (passé) → « À confirmer » jusqu'au 28 novembre à 00 h ; la notification « Manquée » du 21 disparaît, une « À confirmer » apparaît pour le 24.
- Le 21 est vide dans le mois et la semaine.
- Une séance effectuée ou annulée n'a pas de bouton « Déplacer ».

### Éléments affichés

**CAL-05 :** Déplacer la séance · calendrier · Heure (facultatif) · Confirmer · Annuler
**CAL-05b :** « Prévue le 21 nov. · déplacée au 24 nov. » · « La notification « Manquée » du 21 est supprimée ; une notification « À confirmer » est créée pour le 24. » · Je l'ai faite · Pas faite · Déplacer à nouveau

### États à gérer

#### Envoi
Boutons désactivés.

#### Séance démarrée entre-temps
Refus et rechargement.

### Réponses API attendues

- Déplacé : `200` + rendez-vous à jour
- Statut effectué ou annulé : `409`, code `APPOINTMENT_NOT_MOVABLE`
- Date hors plage (± 2 ans) : `400`
- Rendez-vous d'un autre : `404`

### Hors périmètre

- Changer le jour de toutes les semaines (US-20).

### Tâches techniques
- [ ] Shared : `computeAppointmentStatus(plannedDate, today)` (planned / to_confirm / missed selon la règle des 72 h) : fonction pure, utilisée aussi par US-27
- [ ] Backend : `readAppointmentForUpdate`, `moveAppointment(id, date, time, status)` : `UPDATE appointment SET initial_date = COALESCE(initial_date, planned_date), planned_date = ?, planned_time = ?, moved_manually = TRUE, status = ? WHERE id = ?`
- [ ] Backend : `deleteAppointmentNotifications(appointmentId, types)`, `createAppointmentNotification(appointmentId, type)`
- [ ] Backend : `PATCH /api/appointments/:id/move` dans `withTransaction`
- [ ] Frontend : `MoveAppointmentPage.tsx` (CAL-05)
- [ ] Tests : unitaires `computeAppointmentStatus` (aujourd'hui, hier, il y a 3 jours, il y a 4 jours, futur) ; back : notifications remplacées, `initial_date` gardée au 2ᵉ déplacement, effectuée → 409
- [ ] Tests : E2E exemple CAL-05b

### Definition of Done
- [ ] Exemple CAL-05b reproduit en test d'intégration
- [ ] Code relu et fusionné via pull request

## US-46 · Consulter mes notifications

EPIC 9 · Socle

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 06
**Dépendance principale :** US-27, US-48, US-40
**Intégration future :** aucune
**Branche :** `feat/us-46-notifications`
**Maquettes :** NOT-01, NOT-01b, NOT-02, NOT-02v, NOT-03, NOT-04, NOT-05, NOT-06, NOT-07, NOT-07e, NOT-08
**Règles :** RM-055, RM-056, RM-057, RM-062, DT-16

### User story

En tant qu'utilisateur, je veux voir mes notifications afin de ne rien manquer.

### Pourquoi

Les séances à confirmer, les programmes terminés et les records doivent arriver jusqu'à l'utilisateur.

### Ce qui change

L'en-tête des 4 onglets affiche l'accès aux notifications (cloche ou pastille, voir À PRÉCISER).

### Règles métier

- Quatre types : séance à confirmer, séance manquée, programme terminé, record personnel (RM-055).
- Une seule notification par rendez-vous et par type (RM-056, DT-16).
- Classées de la plus récente à la plus ancienne, groupées « Cette semaine » / « Plus anciennes ».
- Non lue : bandeau, fond, titre en gras **et** la mention « ● NON LUE » (pas seulement la couleur).
- Toucher une notification ouvre l'élément lié et la marque lue.
- « Tout marquer lu » retire le compteur ; absent quand la liste est vide.
- Une séance manquée corrigée après coup marque sa notification lue (RM-057).
- Les sons et vibrations de minuteur ne sont jamais des notifications (RM-062).

### Critères d'acceptation

- NOT-01 : le compteur des non lues (« 9+ » au-delà de 9) ; lu « Notifications, 3 non lues » ; zone de 44 px.
- NOT-01b : sans non lue, pas de pastille.
- NOT-02 : la liste et « Réglages des alertes › » (NOT-08 / PRF-04).
- NOT-02v : « Aucune notification » et son texte.
- NOT-03 / NOT-04 : liens vers la séance (US-27, US-38) ; NOT-05 vers le résumé du programme ; NOT-06 vers la progression.
- NOT-07 : après consultation, la pastille passe de 3 à 2.
- NOT-07e : élément supprimé → « Cette séance n'est plus disponible » ; erreur réseau → « Impossible d'ouvrir. Réessaie. », notification toujours non lue.

### Éléments affichés

**NOT-02 :** Tout marquer lu · CETTE SEMAINE · PLUS ANCIENNES · « Séance à confirmer · 25 nov. · Dos · mar. 24 nov. As-tu fait cette séance ? » · « Séance manquée · Course · sam. 21 nov. · Cardio base. » · « Record personnel · Squat à la barre · 62,5 kg × 8 (charge max). » · « Programme terminé · Remise en forme · 7 sept. → 1er nov. » · Réglages des alertes ›
**NOT-02v :** Aucune notification · « Tu seras prévenu ici des séances à confirmer ou manquées, des programmes terminés et de tes records. »
**NOT-07e :** « Cette séance n'est plus disponible »

### États à gérer

#### Chargement / Erreur
Comme les autres listes.

#### Élément supprimé
NOT-07e.

### Réponses API attendues

- `GET /api/notifications` : `200` + `{ items, unread_count }`
- `GET /api/notifications/unread-count` : `200`
- `PATCH /api/notifications/:id/read` : `200` ; d'un autre : `404`
- `PATCH /api/notifications/read-all` : `204`

### Décisions

- **D-01** : cloche dans l'en-tête des 4 onglets, à gauche de l'avatar (NOT-01).
- **D-05** : « Tout marquer lu » est gardé.

### Hors périmètre

- Notifications push du téléphone (hors minuteur).
- Création des notifications (US-27, US-40, US-48).

### Tâches techniques
- [ ] Backend : `notificationRepository.readNotifications(userId, limit, offset)`, `countUnreadNotifications(userId)`, `markNotificationRead(id, userId)`, `markAllNotificationsRead(userId)` ; `notificationRouter.ts`
- [ ] Backend : la route `/read-all` et `/unread-count` **déclarées avant** `/:id`
- [ ] Frontend : `NotificationBell.tsx` (en-tête, `aria-label` avec le nombre), `NotificationsPage.tsx`, `NotificationItem.tsx`, `useUnreadCount` (rafraîchi à chaque changement de page)
- [ ] Frontend : routage vers l'élément lié selon le type ; gestion du 404 (NOT-07e)
- [ ] Tests : back : liste triée, notifications d'un autre invisibles, lecture, tout lu ; front : compteur « 9+ », mention « NON LUE »
- [ ] Tests : E2E notification → séance → compteur diminué ; axe

### Definition of Done
- [ ] Code relu et fusionné via pull request

# Sprint 07 · Créer un programme

## US-48 · Voir mes programmes

EPIC 4 · Programmes

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-18
**Intégration future :** US-20, US-21, US-22, US-41 (Résumé par programme)
**Branche :** `feat/us-48-program-list`
**Maquettes :** PRO-01, PRO-01b, PRO-01v, PRO-07, PRO-07b, PRO-07c, PRO-07d, PRO-13
**Règles :** RM-025, RM-026, RM-066, RM-071, RM-074

### User story

En tant qu'utilisateur, je veux voir la liste et le détail de mes programmes afin de savoir où j'en suis dans chaque cycle.

### Pourquoi

Un programme dure des semaines : on a besoin de voir l'avancement, la prochaine séance et ce qui a été fait ou manqué.

### Ce qui change

L'Accueil (US-44) affiche maintenant la section « Mes programmes » avec le programme en cours, et le Planning un lien « Mes programmes » en haut.

### Règles métier

- « Mes programmes » est une page, pas un onglet ; on y accède depuis l'Accueil et le Planning (RM-066).
- Statuts : Brouillon, À venir, En cours, Terminé, Abandonné (RM-026). Plusieurs programmes peuvent être en cours en même temps (RM-025).
- Un brouillon n'est jamais « À venir » ni « En cours » ; il est conservé sans limite et affiché en tête (RM-071).
- Les statuts changent seuls : « À venir » → « En cours » le jour du début à 00 h ; « En cours » → « Terminé » le lendemain de la date de fin à 00 h (RM-074). Le passage à « Terminé » crée une notification.
- Chaque séance garde son propre statut ; une semaine n'est jamais « manquée » en bloc.
- Le menu ⋯ ne propose que les actions possibles selon l'état (PRO-07b).

### Critères d'acceptation

- PRO-01 : la liste avec les filtres par statut ; chaque carte affiche nom, période, jours et heures, statut en texte.
- PRO-01b : un brouillon en tête, « 2 / 4 séances prêtes », « Reprendre » et « Supprimer ».
- PRO-01v : aucun programme → texte explicatif et « + Créer mon premier programme », sans filtres.
- PRO-07 (en cours) : période, jours, barre et pourcentage (« 6 / 12 séances passées · 3 faites »), séance du jour avec « Démarrer », « Ensuite » (3 prochaines), « Déjà passées » (3 dernières avec statut), « Voir l'historique ».
- PRO-07c (à venir) : « Première séance · lun 30 nov. 18:30 » et les semaines avec leur nombre de séances planifiées ; pas de « Démarrer ».
- PRO-07d : une séance faite en avance est comptée « 1 faite en avance » dans sa semaine.
- PRO-13 (terminé) : bilan (« 16 séances prévues · 88 % réalisées »), liste des séances avec statut, « Réutiliser » ; même écran pour « Abandonné », avec la date d'abandon.
- Un programme d'un autre utilisateur affiche « Programme introuvable ».

### Éléments affichés

**PRO-01v :** « Un programme planifie tes séances sur plusieurs semaines, automatiquement. » · « Choisis la période et tes jours » · « Les séances arrivent dans ton Planning » · + Créer mon premier programme
**PRO-01b :** « 4 programmes · 2 en cours · 1 brouillon » · Brouillon · « 30 nov. → 10 janv. · Lun · Jeu · Sam · 2 / 4 séances prêtes » · « Pas encore dans le Planning » · Reprendre · Supprimer
**PRO-07 :** « 6 / 12 séances passées · 3 faites » · Ensuite · Déjà passées · Voir l'historique · 6 séances
**PRO-07c :** « PREMIÈRE SÉANCE · LUN 30 NOV. 18:30 » · « 30 nov. → 6 déc. · 4 séances planifiées »
**PRO-13 :** ⚑ TERMINÉ (ou ABANDONNÉ) · « 16 séances prévues · 88 % réalisées » · Réutiliser

### États à gérer

#### Chargement
Cartes grises.

#### Erreur
« Impossible de charger tes programmes. » + « Réessayer ».

#### Vide
PRO-01v.

#### Introuvable
« Programme introuvable » + retour à la liste.

### Réponses API attendues

- `GET /api/programs?status=` : `200`
- `GET /api/programs/:id` : `200` ; absent ou d'un autre : `404`

### Hors périmètre

- Créer, modifier, abandonner, supprimer, réutiliser (US-18 à US-22).

### Tâches techniques
- [ ] BDD : statuts de `program` avec `draft` (migration 003)
- [ ] Backend : `programRepository.readPrograms(userId, status)` avec, par programme, le nombre de rendez-vous et de rendez-vous passés et faits (sous-requêtes `COUNT`)
- [ ] Backend : `readProgram(id, userId)`, `readProgramSchedules(id)`, `readProgramAppointments(id)` (avec la séance réalisée liée)
- [ ] Backend : `programActions.browse`, `programActions.read` ; `programRouter.ts` (`GET /api/programs`, `GET /api/programs/:id`)
- [ ] Backend : tâche planifiée `updateProgramStatuses(today)` toutes les 5 min : `UPDATE program SET status = 'in_progress' WHERE status = 'programmed' AND start_date <= ?` ; `UPDATE program SET status = 'finished' WHERE status = 'in_progress' AND end_date < ?` ; création des notifications « Programme terminé » (`INSERT … SELECT` pour les programmes passés à `finished`, sans doublon), trace dans `program_change`
- [ ] Shared : `computeProgramProgress(appointments, today)` (passées, faites, pourcentage), `groupAppointmentsByWeek`, `getAvailableProgramActions(program, hasStartedSession, hasInProgressSession)`
- [ ] Frontend : `features/program/pages/ProgramListPage.tsx`, `ProgramDetailPage.tsx` ; composants `ProgramCard`, `ProgramProgress`, `ProgramWeekList`, `ProgramActionsMenu`
- [ ] Frontend : section « Mes programmes » de l'Accueil, lien « Mes programmes » du Planning
- [ ] Routing : `/programmes`, `/programmes/:id`
- [ ] Tests : unitaires `computeProgramProgress`, `getAvailableProgramActions` (chaque état) ; back : liste filtrée, programme d'un autre → 404, `updateProgramStatuses` au jour du début et au lendemain de la fin, notification créée une seule fois
- [ ] Tests : E2E liste → détail ; axe sur PRO-01, PRO-07, PRO-13

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Tâche planifiée testée sans attendre minuit (date passée en paramètre)
- [ ] Code relu et fusionné via pull request

## US-18 · Créer un programme

EPIC 4 · Programmes

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-12 à US-15 (éditeur), US-48
**Intégration future :** US-19 (jours), US-22 (copie)
**Branche :** `feat/us-18-create-program`
**Maquettes :** PRO-02, PRO-02b, PRO-03v, PRO-03, PRO-03f, PRO-03e, PRO-04, PRO-06, CAL-01b
**Règles :** RM-025, RM-026, RM-071, RM-072, RM-075

### User story

En tant qu'utilisateur, je veux créer un programme avec une période et ses séances afin de suivre un cycle d'entraînement.

### Pourquoi

Un programme évite de planifier chaque séance à la main : on décrit une semaine type, l'appli remplit le Planning.

### Règles métier

- Étape 1 : nom obligatoire, description facultative, date de début et date de fin obligatoires (fin ≥ début, 52 semaines au plus), au moins un jour.
- Étape 2 : une séance vide est créée pour chaque jour coché (« Séance du lundi »…). Chaque séance se construit avec l'éditeur existant ; « Jour : Jeudi » remplace le champ Date.
- La semaine type est identique sur toute la période (RM-075).
- **Brouillon** : enregistrable à tout moment à partir de l'étape 2, même avec des séances vides ; il ne crée **aucun** rendez-vous ni notification ; conservé sans limite ; sans nom, il s'appelle « Programme sans nom » (RM-071).
- **Créer le programme** : possible seulement quand chaque séance a au moins un exercice (RM-072). Les rendez-vous sont alors générés sur toute la période.
- Statut après création : « À venir » si le début est dans le futur, « En cours » si c'est aujourd'hui ou avant.
- Un jour partagé avec un autre programme est signalé, jamais bloquant.
- Quitter pendant la création propose : Enregistrer le brouillon, Continuer, Supprimer et quitter.

### Critères d'acceptation

- Depuis le Planning, « + » → « Programme » ouvre PRO-02 avec la date de début pré-remplie.
- PRO-02 affiche la durée calculée (« 6 semaines ») et le résumé des jours (« Lundi · Jeudi · Samedi · 3 jours par semaine »).
- Erreurs PRO-02b : sous le champ ; « Suivant » ramène au premier champ en erreur.
- PRO-03v → PRO-03 → PRO-03f : le compteur « 2 / 4 séances prêtes » et « Créer le programme » qui s'active à 4 / 4.
- Chaque séance prête affiche ses exercices (« Squat à la barre · 4 × 8 rép. · 60 kg ») ; une séance vide affiche « À configurer · aucun exercice ».
- « Enregistrer le brouillon » → PRO-01b ; rien dans le Planning.
- « Créer le programme » → PRO-06 : « 24 séances ajoutées au Planning, du lundi 30 novembre au dimanche 10 janvier. »
- Les 24 rendez-vous existent en base avec la bonne date, l'heure et la version de leur séance.

### Éléments affichés

**PRO-02 :** Étape 1 / 3 · Informations et jours · Nom · Description (Ex. 3 séances par semaine, haut / bas du corps) · Début · Fin · Jours · Suivant
**PRO-03v :** « Une séance a été créée pour chaque jour choisi. Donne-lui un nom et ajoute ses exercices. » · « À configurer · touche pour ajouter blocs et exercices »
**PRO-03 / 03f :** Étape 2 / 3 · Séances · « 2 / 4 séances prêtes » · Enregistrer le brouillon · Créer le programme
**PRO-03e :** « « Hypertrophie 6 semaines » n'est pas encore créé. Enregistre-le en brouillon pour le reprendre plus tard : il n'apparaîtra pas dans le Planning. » · Enregistrer le brouillon · Continuer · Supprimer et quitter
**PRO-06 :** Programme créé · « 24 séances ajoutées au Planning, du lundi 30 novembre au dimanche 10 janvier. » · « Statut « À venir » jusqu'au 30 novembre. » · Voir le planning · Voir le programme

### États à gérer

#### Enregistrement du brouillon / création en cours
Boutons désactivés.

#### Erreur API
Message, saisie conservée.

#### Séance « À configurer »
« Créer le programme » désactivé avec l'explication.

### Réponses API attendues

- Brouillon créé : `201` ; brouillon mis à jour : `200`
- Programme créé : `200` + `{ appointment_count, first_date, last_date }`
- Données invalides : `400`
- Séance sans exercice à la création : `422`, code `PROGRAM_SESSION_EMPTY`
- Programme qui n'est plus un brouillon : `409`

### Hors périmètre

- Plusieurs séances le même jour, modifier les jours, retirer une séance (US-19).
- Modifier un programme créé (US-20, US-21).

### Tâches techniques
- [ ] Shared : `programDraftSchema` (nom 0 à 160, dates, jours 1 à 7, séances avec `weekday`, `planned_time`, `name`, `session: SessionDraft`) ; `listWeekdayDates(start, end, weekday)` ; `countProgramAppointments`
- [ ] Backend : `programRepository.createProgram` (statut `draft`), `updateProgramInfo`, `updateProgramStatus`
- [ ] Backend : `weeklyScheduleRepository.createWeeklySchedule(programId, templateId, weekday, time)`, `deleteDraftSchedules(programId)`
- [ ] Backend : séances du brouillon créées avec les fonctions de l'US-23 (template, version 1, arbre) ; un brouillon mis à jour remplace entièrement ses séances (aucun rendez-vous n'existe, donc rien à préserver)
- [ ] Backend : `appointmentRepository.createAppointments(rows)` : insertion multiple (`INSERT … VALUES ?` avec `query`)
- [ ] Backend : `programActions.saveDraft` (`POST /api/programs`, `PUT /api/programs/:id`) et `programActions.create` (`POST /api/programs/:id/create`) dans `withTransaction` : verrou sur le programme, statut `draft`, chaque séance avec ≥ 1 exercice, génération des rendez-vous, statut `programmed` ou `in_progress`, trace `program_change`
- [ ] Frontend : `CreateProgramInfoPage.tsx` (PRO-02), `ProgramSessionsPage.tsx` (PRO-03), réutilisation de `SessionEditorPage` en mode « jour de la semaine », `ProgramCreatedPage.tsx` (PRO-06), dialogue PRO-03e (garde de sortie)
- [ ] Frontend : `useProgramDraft` (état local du programme et de ses séances)
- [ ] Tests : unitaires `listWeekdayDates` (début un mercredi, fin un dimanche, année bissextile) ; back : brouillon sans rendez-vous, création → nombre exact de rendez-vous, séance vide → 422, échec au milieu → aucun rendez-vous, programme d'un autre → 404
- [ ] Tests : E2E parcours complet PRO-02 → PRO-06 ; axe

### Definition of Done
- [ ] Nombre de rendez-vous vérifié à la main sur un exemple
- [ ] Code relu et fusionné via pull request

## US-19 · Planifier les séances de la semaine

EPIC 4 · Programmes

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-18
**Intégration future :** US-20
**Branche :** `feat/us-19-weekly-sessions`
**Maquettes :** PRO-02, PRO-03a, PRO-03b, PRO-03c, PRO-03d
**Règles :** RM-025, RM-027, RM-075

### User story

En tant qu'utilisateur, je veux associer mes séances à des jours et des heures afin que mon programme remplisse mon Planning.

### Pourquoi

Exemple : Jambes le jeudi à 07:00, Fractionné le jeudi à 12:30 et Course le samedi sans heure.

### Règles métier

- Plusieurs séances sont possibles le même jour ; chacune a son heure facultative.
- Ajouter une séance un jour ajoute un rendez-vous par semaine (le total est recalculé et affiché).
- Décocher un jour qui a des séances affiche ce qui sera retiré (séances, blocs, exercices) et le nouveau total.
- Retirer une séance propose « Annuler » quelques secondes ; si c'était la seule du jour, le jour est décoché.
- Il faut au moins une séance pour créer le programme.
- Tant que le programme n'est pas créé, rien n'est dans le Planning : aucun rendez-vous à annuler.

### Critères d'acceptation

- « + Autre séance le lundi » ouvre PRO-03a : nom obligatoire, heure facultative, « Créer et ajouter les exercices » ou « Créer sans exercice pour l'instant ».
- Le message « Ajoute 6 rendez-vous de plus (1 par semaine) : le total passe de 24 à 30. » s'affiche.
- PRO-03b : décocher le samedi affiche « Samedi décoché : 2 séances seront retirées » et le nouveau total.
- Après enregistrement, le bandeau « Samedi retiré · 2 séances supprimées · Annuler » s'affiche.
- Glisser une séance vers la gauche → « Retirer » (PRO-03c) ; « Annuler » la remet (PRO-03d) ; les compteurs se mettent à jour.
- Quand le champ de nom est actif sur mobile, le panneau remonte au-dessus du clavier.

### Éléments affichés

**PRO-03a :** « Le lundi aura 2 séances : « Haut du corps » à 18:30 et celle-ci. » · Créer et ajouter les exercices · Créer sans exercice pour l'instant
**PRO-03b :** « Samedi décoché : 2 séances seront retirées » · « « Cardio » et « Mobilité », avec leurs blocs et exercices. Le programme passe de 24 à 12 rendez-vous. »
**PRO-03d :** « Séance « Mobilité » retirée. » · Annuler

### États à gérer

#### Retrait annulable
Toast 5 s, `aria-live`.

### Réponses API attendues

Enregistrées avec le brouillon (US-18).

### Hors périmètre

- Changer un jour après la création (US-20).

### Tâches techniques
- [ ] Frontend : `AddSessionOnDaySheet.tsx` (PRO-03a), `EditProgramInfoPage` en mode brouillon (PRO-03b), retrait par glissement + bouton poubelle, `UndoToast`
- [ ] Shared : `countProgramAppointments(start, end, sessions)` utilisé pour tous les compteurs
- [ ] Tests : unitaires compteurs (24 → 30, 24 → 12) ; front : retrait + annulation, décocher le dernier jour d'une séance

### Definition of Done
- [ ] Compteurs vérifiés sur l'exemple de la maquette
- [ ] Code relu et fusionné via pull request

# Sprint 08 · Faire évoluer séances et programmes

## US-16 · Réordonner blocs, exercices et séries

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-15
**Intégration future :** US-17, US-18 (mêmes éditeurs)
**Branche :** `feat/us-16-reorder`
**Maquettes :** A6, A8, PRO-03 (poignée ⋮⋮)
**Règles :** RM-024

### User story

En tant qu'utilisateur, je veux changer l'ordre des blocs, des exercices et des séries afin d'ajuster ma séance.

### Pourquoi

On se rend souvent compte après coup qu'on préfère faire le squat avant les fentes.

### Règles métier

- L'ordre se change dans le brouillon (éditeur) ; il est enregistré avec la séance.
- Les positions restent uniques dans leur parent : c'est le serveur qui les numérote à partir de l'ordre des listes (RM-024).
- L'ordre prévu n'impose rien pendant la séance (ordre d'exécution libre).

### Critères d'acceptation

- La poignée ⋮⋮ permet de glisser un bloc, un exercice ou une série, au toucher.
- Au clavier : la poignée prend le focus, Espace pour saisir, flèches pour déplacer, Espace pour poser, Échap pour annuler.
- Le lecteur d'écran annonce « Squat déplacé en position 2 sur 6 ».
- Des boutons « Monter » / « Descendre » existent dans le menu ⋯ (solution de secours).
- L'ordre enregistré est celui affiché.

### Éléments affichés

**Poignée :** ⋮⋮ (libellé « Déplacer Squat à la barre »)
**Menu ⋯ :** Monter · Descendre

### États à gérer

#### Glissement en cours
Élément soulevé, emplacement visible.

### Réponses API attendues

Aucune route propre : l'ordre part avec l'enregistrement de la séance.

### Hors périmètre

- Réordonner pendant la séance en cours.

### Tâches techniques
- [ ] Outillage : installer `@dnd-kit/core` et `@dnd-kit/sortable` (`--ignore-scripts`) : accessible au clavier et au toucher
- [ ] Frontend : actions du reducer `moveBlock`, `moveExercise`, `moveSet` (fonctions pures, testées)
- [ ] Frontend : `SortableList.tsx` générique ; annonces `aria-live` en français
- [ ] Tests : reducer : déplacements aux bords (premier, dernier) ; E2E : glisser au clavier

### Definition of Done
- [ ] Testé au toucher, à la souris et au clavier
- [ ] Code relu et fusionné via pull request

## US-17 · Modifier une séance

EPIC 3 · Séances modèles

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-23, US-24
**Intégration future :** US-18 (séances de programme), US-14 (« Ajouter à une séance à venir »)
**Branche :** `feat/us-17-edit-session`
**Maquettes :** Modifier une séance 1 à 7, B0 à B3, C0 à C3, CAL-04m, CAL-06, CAL-06b, PRO-09
**Règles :** RM-017, RM-029, RM-030, RM-032, RM-058

### User story

En tant qu'utilisateur, je veux modifier une séance déjà planifiée afin de la faire évoluer sans abîmer mon historique.

### Pourquoi

On ajuste ses séances au fil des semaines (plus de charge, un exercice en plus). Les séances passées doivent rester telles qu'elles ont été faites.

### Règles métier

- Toute modification crée une **nouvelle version** ; l'ancienne n'est jamais modifiée ni supprimée (RM-017).
- Séance libre : pas de choix, l'éditeur s'ouvre directement, seule cette séance change.
- Séance de programme : choix de la portée (RM-029, RM-030) :
  - « Cette séance uniquement » : seul ce rendez-vous pointe vers la nouvelle version ;
  - « Cette séance et les suivantes » : ce rendez-vous et les rendez-vous à venir du même programme et de la même séance, **non commencés**, y compris ceux déplacés à la main (ils gardent leur date).
- « Et les suivantes » n'apparaît que s'il reste des séances du même programme à venir.
- Le prévu et les résultats des séances passées, manquées ou réalisées ne sont jamais réécrits (RM-058).
- Une séance démarrée (en cours, terminée, inachevée) ne se modifie pas par ce parcours (voir US-37 pour corriger les résultats).
- Les conséquences sont affichées avant de valider (CAL-06b).
- Changer le type d'un bloc demande confirmation (voir À PRÉCISER).
- Pour changer une date : « Déplacer » (US-25). Pour changer le jour de toutes les semaines : la règle du programme (US-20).

### Critères d'acceptation

- Le menu ⋯ d'une séance prévue (CAL-04m) propose « Modifier la préparation ».
- Séance de programme : l'écran de portée (CAL-06 / PRO-09) affiche les deux choix avec leurs conséquences (« Seul le jeudi 26 novembre change. », « Les 5 séances « Jambes » à venir du programme changent. », « Les séances déjà réalisées ne changent pas. »).
- L'éditeur s'ouvre pré-rempli avec la version actuelle (mêmes écrans que la création).
- Avant de valider, CAL-06b liste les changements (« + Fentes bulgares · 3 × 8 rép. », « Squat à la barre : 4 × 8 → 5 × 5 rép. »), les dates concernées, la séance déplacée qui garde sa date, et les séances non modifiées.
- « Valider » enregistre ; « Revenir » retourne à l'éditeur.
- Après validation, le détail affiche le nouveau contenu ; l'historique des séances passées est inchangé.
- Depuis le catalogue, « Ajouter à une séance » propose aussi « OU UNE SÉANCE À VENIR » : les exercices arrivent dans un nouveau bloc en fin de séance, puis la portée est demandée à l'enregistrement.

### Éléments affichés

**CAL-06 :** Modifier une séance de programme · « Cette séance fait partie du programme Force 8 semaines. » · Cette séance uniquement (« Seul le jeudi 26 novembre change. ») · Cette séance et les suivantes (« Les 5 séances « Jambes » à venir du programme changent. ») · « Les séances déjà réalisées ne changent pas. » · Continuer
**CAL-06b :** liste des changements · dates concernées · « Ven 25 déc (déplacée manuellement : contenu mis à jour, date conservée) » · « Non modifiées : … » · Valider · Revenir
**Succès :** « Séance modifiée. »

### États à gérer

#### Rien n'a changé
« Valider » inactif.

#### Rendez-vous démarré entre-temps
Il est retiré de la liste avec un message.

#### Erreur API
Message, brouillon conservé.

### Réponses API attendues

- Modification enregistrée : `200` + `{ version_id, updated_appointment_ids }`
- Rendez-vous absent ou d'un autre : `404`
- Rendez-vous démarré, effectué ou annulé : `409`, code `APPOINTMENT_NOT_EDITABLE`
- Portée « suivantes » sur une séance libre : `400`

### Décisions

- **D-03** : en changeant le type d'un bloc, les objectifs compatibles avec le nouveau type sont gardés, les autres sont vidés (avec un résumé avant confirmation). Passer en Note est interdit tant que le bloc contient des exercices : message « Retire d'abord les exercices de ce bloc. »

### Hors périmètre

- Corriger les résultats d'une séance faite (US-37).
- Déplacer (US-25), règle hebdomadaire (US-20).

### Tâches techniques
- [ ] Backend : `readVersionTree(versionId)` (blocs, exercices, séries) et conversion en `SessionDraft`
- [ ] Backend : `GET /api/appointments/:id/session` : la version actuelle en brouillon + `can_apply_to_following` + liste des rendez-vous concernés par chaque portée
- [ ] Backend : `readNextVersionNumber(templateId)` ; `createSessionVersion(templateId, n)` et création de l'arbre (fonctions de l'US-23)
- [ ] Backend : `readFollowingAppointments(programId, templateId, fromDate)` : `status = 'planned'` (et `to_confirm`, `missed`), **sans** `workout_session`, `planned_date >= ?`, avec `FOR UPDATE`
- [ ] Backend : `updateAppointmentsVersion(ids, versionId)` (avec `query` pour `IN (?)`)
- [ ] Backend : `PUT /api/appointments/:id/session` (`{ scope: "this" | "following", session }`) dans `withTransaction` ; trace dans `program_change` pour une séance de programme
- [ ] Shared : `diffSessionDrafts(before, after)` : liste lisible des changements (CAL-06b), testée
- [ ] Frontend : `EditSessionScopePage.tsx` (CAL-06 / PRO-09), réutilisation de `SessionEditorPage` en mode édition, `SessionChangesPage.tsx` (CAL-06b)
- [ ] Frontend : `SessionDestinationSheet` : section « OU UNE SÉANCE À VENIR »
- [ ] Tests : back : nouvelle version créée, ancienne intacte ; « cette séance » → 1 rendez-vous ; « suivantes » → seulement les futurs non commencés ; séance déplacée mise à jour mais date conservée ; séance démarrée → 409 ; `workout_set.*_planned` des séances passées inchangées
- [ ] Tests : unitaires : `diffSessionDrafts`
- [ ] Tests : E2E : modifier « Jambes » et les suivantes, vérifier deux dates

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Code relu et fusionné via pull request

## US-20 · Modifier le programme (jours, heures, période)

EPIC 4 · Programmes

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-18, US-25 (rendez-vous déplacés)
**Intégration future :** US-21
**Branche :** `feat/us-20-edit-program`
**Maquettes :** PRO-07b, PRO-08
**Règles :** RM-031, RM-032, RM-033, RM-037

### User story

En tant qu'utilisateur, je veux changer le jour, l'heure ou la période de mon programme afin de l'adapter à mon emploi du temps.

### Pourquoi

L'emploi du temps change en cours de cycle : passer la course du samedi au dimanche sans tout recréer.

### Règles métier

- Changer le jour ou l'heure d'une séance désactive l'ancienne règle (avec sa date) et en crée une nouvelle (RM-031).
- Seuls les rendez-vous **à venir, planifiés, non commencés et non déplacés à la main** bougent (RM-031, RM-032).
- Les rendez-vous déplacés à la main gardent leur date (RM-032).
- Les séances passées ne bougent jamais.
- Reculer la date de fin ajoute des semaines (nouveaux rendez-vous) ; l'avancer annule les rendez-vous au-delà, même déplacés à la main (RM-033), après confirmation (US-21).
- Chaque modification est historisée (RM-037).
- Les rendez-vous concernés s'affichent en direct avant de valider.

### Critères d'acceptation

- PRO-07 → ⋯ → « Modifier le programme » ouvre PRO-08 : nom, période, et pour chaque séance de la semaine type son jour et son heure.
- Passer « Course » du samedi au dimanche liste « Sam 28 nov. → Dim 29 nov. · 10:00 », etc.
- La séance déplacée à la main apparaît avec « déplacé manuellement, date conservée ».
- Les autres séances (« Fractionné du jeudi : inchangé ») et les séances passées sont annoncées inchangées.
- « Valider » applique tout et revient à PRO-07 avec un message.
- Le Planning affiche les nouvelles dates.

### Éléments affichés

**PRO-08 :** Modifier le programme · Rendez-vous concernés · « Sam 28 nov. → Dim 29 nov. · 10:00 » · « Ven 4 déc. : déplacé manuellement, date conservée. » · « Fractionné du jeudi : inchangé. » · « Séances passées (5 → 21 nov.) : inchangées. » · « Avancer la fin annule les séances au-delà ; reculer la fin ajoute des semaines. » · Valider
**Succès :** « Programme modifié. »

### États à gérer

#### Aucun changement
« Valider » inactif.

#### Calcul de l'aperçu
Liste en chargement.

#### Séance en cours dans le programme
Elle n'est jamais déplacée.

### Réponses API attendues

- Aperçu : `POST /api/programs/:id/schedule/preview` → `200` + liste des changements
- Application : `PUT /api/programs/:id/schedule` → `200`
- Programme terminé ou abandonné : `409`

### Hors périmètre

- Modifier le contenu d'une séance (US-17).
- Abandonner (US-21).

### Tâches techniques
- [ ] Shared : `planScheduleChange(program, schedules, appointments, changes, today)` : fonction pure qui renvoie les rendez-vous à déplacer, à créer, à annuler et inchangés (utilisée pour l'aperçu et l'application)
- [ ] Backend : `deactivateWeeklySchedule(id, at)`, `createWeeklySchedule`, `readFutureAppointmentsForUpdate(programId, today)` (`FOR UPDATE`), `moveAppointmentsToSchedule`, `createAppointments`, `cancelAppointments`, `createProgramChange(programId, type, old, new)`
- [ ] Backend : `programActions.previewSchedule` et `programActions.updateSchedule` dans `withTransaction`
- [ ] Frontend : `EditProgramPage.tsx` (PRO-08) avec aperçu recalculé à chaque changement (`useDebouncedValue`)
- [ ] Tests : unitaires `planScheduleChange` (déplacé à la main conservé, passé intact, séance en cours intacte, fin reculée, fin avancée) ; back : application = aperçu, trace `program_change`
- [ ] Tests : E2E samedi → dimanche

### Definition of Done
- [ ] L'aperçu et l'application donnent exactement le même résultat (test)
- [ ] Code relu et fusionné via pull request

## US-21 · Raccourcir, abandonner ou supprimer un programme

EPIC 4 · Programmes

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-20
**Intégration future :** US-22
**Branche :** `feat/us-21-stop-program`
**Maquettes :** PRO-07b, PRO-07c2, PRO-07d, PRO-08 (fin avancée), PRO-11, PRO-11b, PRO-11c, PRO-13
**Règles :** RM-033, RM-034, RM-035, RM-073, DT-25

### User story

En tant qu'utilisateur, je veux raccourcir, abandonner ou supprimer un programme afin d'arrêter un cycle qui ne me convient plus.

### Pourquoi

Une blessure, un changement d'objectif : il faut pouvoir arrêter sans perdre ce qui a été fait.

### Règles métier

- **Raccourcir** (fin avancée dans PRO-08) : les rendez-vous planifiés après la nouvelle fin sont annulés, même déplacés à la main ; la liste est affichée avant confirmation (RM-033).
- **Abandonner** : proposé dès qu'au moins une séance du programme a été démarrée (même sans série validée) ; les rendez-vous à venir planifiés passent en « annulée » (y compris aujourd'hui s'il n'a pas commencé) ; le passé, les résultats et les manquées sont conservés ; statut « Abandonné » avec sa date.
- Abandon interdit si une séance du programme est en cours (RM-034).
- **Supprimer** : proposé seulement si aucune séance n'a jamais été démarrée ; supprime le programme, ses rendez-vous, ses règles, son historique de changements, ses notifications et les séances préparées qu'aucun autre programme ni rendez-vous n'utilise, dans une transaction (RM-073, DT-25).
- Le menu affiche « Abandonner » **ou** « Supprimer », jamais les deux.
- Un brouillon se supprime directement après confirmation.
- Les rendez-vous annulés restent dans l'historique (RM-035).

### Critères d'acceptation

- PRO-11 : « Abandonner « Force 8 semaines » ? », la liste des séances à venir qui seront annulées et « Tes 3 séances passées et leurs résultats sont conservés. » ; « Abandonner » → PRO-13 « ABANDONNÉ » ; « Garder le programme » → PRO-07.
- PRO-11b : avec une séance en cours, l'abandon est refusé avec « Reprendre ».
- PRO-11c : « Supprimer « Hypertrophie 6 semaines » ? Ses 24 séances prévues seront supprimées définitivement. » ; après suppression, plus rien dans le Planning.
- PRO-07d : une séance faite en avance fait disparaître « Supprimer » au profit d'« Abandonner ».
- Raccourcir : les rendez-vous au-delà de la nouvelle fin sont listés comme annulés avant de valider.

### Éléments affichés

**PRO-11 :** Abandonner « Force 8 semaines » ? · « Les 5 séances à venir (26 nov., 3, 10, 17 et 25 déc.) seront annulées. » · « Tes 3 séances passées et leurs résultats sont conservés. » · Abandonner · Garder le programme
**PRO-11b :** Abandon impossible · « La séance « Jambes » de ce programme est en cours depuis 07:04. » · « Termine-la ou abandonne-la d'abord. » · Reprendre
**PRO-11c :** Supprimer « Hypertrophie 6 semaines » ? · « Ses 24 séances prévues seront supprimées définitivement. » · Supprimer · Garder

### États à gérer

#### Action en cours
Boutons désactivés.

#### Erreur
Message, programme inchangé.

### Réponses API attendues

- Abandonné : `200` ; supprimé : `204`
- Séance en cours : `409`, code `PROGRAM_HAS_WORKOUT_IN_PROGRESS`
- Suppression alors qu'une séance a été démarrée : `409`, code `PROGRAM_HAS_STARTED_SESSIONS`
- Abandon alors qu'aucune séance n'a été démarrée : `409`, code `USE_DELETE_INSTEAD`

### Hors périmètre

- Réutiliser (US-22).

### Tâches techniques
- [ ] BDD : `appointment.cancelled_at` (migration 002)
- [ ] Backend : `countProgramStartedSessions(programId)`, `readProgramInProgressSession(programId)`
- [ ] Backend : `cancelFutureProgramAppointments(programId, today)` : `UPDATE appointment SET status = 'cancelled', cancelled_at = NOW(3) WHERE program_id = ? AND status = 'planned' AND planned_date >= ? AND id NOT IN (SELECT appointment_id FROM workout_session)`
- [ ] Backend : suppression DT-25 : `deleteProgramNotifications`, `deleteProgramAppointments`, `deleteProgramSchedules`, `deleteProgramChanges`, `deleteProgram`, puis séances orphelines (`planned_set` → `template_block_exercise` → `template_block` → `session_version` → `session_template`) ; vérification préalable « aucune séance réalisée » dans la même transaction
- [ ] Backend : `POST /api/programs/:id/abandon`, `DELETE /api/programs/:id`
- [ ] Frontend : `AbandonProgramDialog`, `DeleteProgramDialog`, `ProgramActionsMenu` (une seule des deux actions)
- [ ] Tests : back : abandon (passé intact, futur annulé, `cancelled_at` rempli) ; abandon avec séance en cours → 409 ; suppression sans séance démarrée → plus aucune ligne liée ; suppression avec séance démarrée → 409 ; une séance préparée partagée n'est pas supprimée
- [ ] Tests : E2E abandon et suppression

### Definition of Done
- [ ] Test « aucune ligne orpheline » après suppression
- [ ] Code relu et fusionné via pull request

# Sprint 09 · Historique complet

## US-37 · Corriger une séance passée

EPIC 7 · Historique

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-36, US-32
**Intégration future :** US-40 (records recalculés)
**Branche :** `feat/us-37-correct-results`
**Maquettes :** SUI-06 (« Corriger les résultats »), B6, CAL-07d
**Règles :** RM-047, RM-048, RM-049, RM-051, RM-080

### User story

En tant qu'utilisateur, je veux corriger une valeur ou ajouter un oubli afin que mon historique soit exact.

### Pourquoi

Une faute de frappe (80 kg au lieu de 60) fausse toute la progression et les records.

### Ce qui change

Le bouton « Corriger les résultats », masqué en MVP, apparaît sur SUI-06, B6 et CAL-07d.

### Règles métier

- Seules les séances terminées ou inachevées se corrigent (RM-047).
- On corrige les valeurs réalisées ; le prévu copié ne change jamais.
- On peut renseigner une série oubliée (non faite) et ajouter une série ou un exercice oublié.
- Seuls les éléments ajoutés par l'utilisateur peuvent être supprimés (RM-048).
- La première date de validation est conservée ; la date de correction est enregistrée à part (RM-049).
- Les records et la progression sont recalculés à partir des résultats ; un record corrigé à la baisse n'est plus affiché (RM-051, RM-080).

### Critères d'acceptation

- « Corriger les résultats » ouvre la séance en mode correction (mêmes écrans que la saisie, bandeau « Correction »).
- Modifier une série validée met à jour le réalisé ; `updated_at` est rempli, `validated_at` inchangé.
- Renseigner une série non faite la valide (`validated_at` = maintenant).
- « Enregistrer les corrections » revient au détail avec « Résultats corrigés. ».
- Le prévu affiché ne change pas.

### Éléments affichés

**Bandeau :** Correction · « Les objectifs prévus ne changent pas. »
**Boutons :** Enregistrer les corrections · Annuler
**Succès :** Résultats corrigés.

### États à gérer

#### Rien n'a changé
« Enregistrer » inactif.

#### Erreur
Message, saisies conservées.

### Réponses API attendues

- Corrigé : `PUT /api/workout-sets/:id/correction` → `200`
- Séance en cours : `409` (passer par US-29)
- Supprimer un élément prévu : `422`
- D'un autre : `404`

### Décisions

- **D-18** : pas de distinction entre un élément ajouté pendant la séance et un élément ajouté après coup : les deux sont « ajoutés » (provenance vide) et peuvent être supprimés.

### Hors périmètre

- Modifier le prévu (US-17).

### Tâches techniques
- [ ] Backend : `correctWorkoutSet` : `_actual`, `validated_at = COALESCE(validated_at, NOW(3))`, `updated_at = NOW(3)` ; contexte : séance `completed` ou `unfinished` de l'utilisateur
- [ ] Backend : ajout et suppression réutilisent US-32 avec le statut de séance terminé autorisé
- [ ] Backend : après correction, recalcul des records (US-40) : notification de record supprimée si le record n'existe plus
- [ ] Frontend : `WorkoutPage` en mode `correction` ; bandeau ; retour au détail
- [ ] Tests : back : correction, `validated_at` conservé, `updated_at` rempli, prévu inchangé, séance en cours → 409, record corrigé à la baisse retiré

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-38 · Déclarer une séance faite après coup

EPIC 7 · Historique

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-27, US-28
**Intégration future :** US-41
**Branche :** `feat/us-38-declare-afterwards`
**Maquettes :** CAL-08, CAL-08b, NOT-03, NOT-04
**Règles :** RM-049, RM-050, RM-054, RM-057, RM-058

### User story

En tant qu'utilisateur, je veux enregistrer une séance que je n'ai pas notée sur le moment afin de ne rien perdre.

### Pourquoi

On a fait la séance sans l'appli : elle doit compter quand même.

### Règles métier

- Possible pour une séance à confirmer ou manquée, sans limite de temps (RM-054).
- Le contenu vient de la version d'origine de la séance (RM-058).
- La date réelle est saisie à part ; la date prévue reste (RM-050).
- Les valeurs sont pré-remplies avec le prévu mais **pas validées** : « À vérifier ». Une série non confirmée reste non réalisée.
- « Tout s'est passé comme prévu » valide tout d'un coup.
- Après enregistrement : séance « Effectuée » (terminée), mention « déclarée après coup », notification manquée ou à confirmer marquée lue (RM-057).
- La date de validation est le moment de la saisie (RM-049).

### Critères d'acceptation

- « Je l'ai faite » ouvre CAL-08b avec la date réelle (pré-remplie : date prévue) et les exercices « 3 séries prévues · à vérifier ».
- Ouvrir un exercice permet de confirmer ou modifier chaque série.
- « Tout s'est passé comme prévu » confirme toutes les séries.
- « Enregistrer » → résumé B6 avec « déclarée après coup ».
- La séance apparaît dans l'historique à sa date réelle.

### Éléments affichés

**CAL-08b :** Déclarer une séance après coup · Date réelle · « Exercices · 3 séries prévues chacun » · « à vérifier » · « Non renseigné » · Tout s'est passé comme prévu · Enregistrer
**Résumé :** « Déclarée après coup »

### États à gérer

#### Aucune série confirmée
« Enregistrer » demande : « Aucune série n'est confirmée. Enregistrer quand même comme inachevée ? »

### Réponses API attendues

- Enregistré : `POST /api/appointments/:id/declare-done` → `201`
- Statut incompatible : `409`
- Date réelle dans le futur : `400`

### Hors périmètre

- Déclarer une séance qui n'était pas prévue (créer d'abord une séance libre à la date passée, US-23).

### Tâches techniques
- [ ] Backend : `declareDone` dans `withTransaction` : verrou, statut, `createWorkoutSession` avec `started_at` déclaré et statut `completed` (ou `unfinished`), copie du prévu (US-28), mise à jour des séries confirmées, rendez-vous `attended`, notifications lues
- [ ] Backend : colonne ou drapeau « déclarée après coup » : à décider (proposition : `workout_session.declared_afterwards BOOLEAN`, migration)
- [ ] Frontend : `DeclareAfterwardsPage.tsx` (CAL-08b)
- [ ] Tests : back : séance créée à la date réelle, séries non confirmées non validées, notifications lues, déjà effectuée → 409

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-52 · Filtrer l'historique

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-35, US-48
**Intégration future :** NOT-05 (« Voir l'historique du programme »)
**Branche :** `feat/us-52-history-filters`
**Maquettes :** SUI-05, SUI-05f, SUI-05g, SUI-05v
**Règles :** RM-076, RM-082

### User story

En tant qu'utilisateur, je veux filtrer mon historique par période, programme et statut afin de retrouver vite une séance.

### Pourquoi

Après quelques mois, la liste devient longue : « mes séances manquées de novembre » doit se trouver en deux appuis.

### Ce qui change

L'historique du MVP (US-35) reçoit une pastille de filtres et les flèches ‹ › de période (décision D-07).

### Règles métier

- Période : Semaine ou Mois, avec ‹ › comme dans le Résumé ; « Tout » par défaut.
- Programme : chaque programme, et « Séance libre ».
- Statuts : Faites, Inachevées, À confirmer, Manquées, Annulées (plusieurs possibles).
- Les filtres se combinent ; les chiffres sont les mêmes que le Résumé pour la même période.

### Critères d'acceptation

- La pastille ouvre le panneau (SUI-05f) ; « Afficher » applique ; toucher le fond ferme sans appliquer.
- Les filtres actifs apparaissent en noir avec leur valeur ; ✕ retire un filtre, « Effacer » retire tout (SUI-05g).
- Exemple : novembre, manquées + annulées → 3 séances, comme SUI-02.
- Sans résultat : « Aucune séance pour ces filtres » + « Effacer les filtres » (SUI-05v), distinct de l'historique vide (SUI-07).
- Les filtres sont gardés dans l'adresse.

### Éléments affichés

**SUI-05f :** PÉRIODE · « puis ‹ › sur la liste » · Programme · Statuts · Afficher
**SUI-05v :** « Aucune séance pour ces filtres » · « Aucune séance manquée cette semaine. » · Effacer les filtres

### États à gérer

#### Aucun résultat
SUI-05v.

### Réponses API attendues

- `GET /api/history?period=&date=&program_id=&statuses=` : `200` ; valeur invalide : `400` ; programme d'un autre : `404`

### Hors périmètre

- Recherche par nom de séance.

### Tâches techniques
- [ ] Backend : `readHistory` et `countHistory` reçoivent des morceaux de SQL constants pour la période, le programme (`a.program_id = ?` ou `a.program_id IS NULL` pour « Séance libre ») et les statuts (avec `query` pour `IN (?)`)
- [ ] Shared : `historyQuerySchema`, `getPeriodRange` (US-41)
- [ ] Frontend : `HistoryFilterSheet.tsx`, `ActiveFilterChips` (réutilisé de l'US-08), `PeriodNavigator`
- [ ] Tests : back : combinaisons, « Séance libre », exemple SUI-05g = 3 ; E2E filtre puis retour arrière

### Definition of Done
- [ ] Code relu et fusionné via pull request

# Sprint 10 · Entraînement avancé

## US-32 · Ajouter un exercice ou une série en cours de séance

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-29, US-14
**Intégration future :** US-37 (provenance des éléments ajoutés)
**Branche :** `feat/us-32-add-during-workout`
**Maquettes :** B2 (« Ajouter un exercice ou un bloc », « Ajouter une série »), B6 (« supplémentaires »), B5d (« Ajouter une étape »)
**Règles :** RM-043, RM-048

### User story

En tant qu'utilisateur, je veux ajouter un exercice ou une série pendant ma séance afin de m'adapter sur le moment.

### Pourquoi

Une machine prise, une bonne forme du jour : la séance réelle s'écarte du prévu.

### Règles métier

- On peut ajouter une série à un exercice, un exercice dans un bloc, ou un nouveau bloc.
- Le prévu n'est jamais modifié ni supprimé (RM-043).
- Un élément ajouté n'a pas de « prévu » ; il est marqué comme ajouté (provenance vide).
- Seuls les éléments ajoutés peuvent être supprimés, pendant la séance comme après (RM-048).
- Le résumé compte les séries « supplémentaires » à part.

### Critères d'acceptation

- « Ajouter une série » ajoute une série vide à l'exercice ouvert.
- « Ajouter un exercice ou un bloc » ouvre le catalogue en mode sélection, puis ajoute à la fin du bloc choisi ou dans un nouveau bloc.
- Un élément ajouté affiche « Ajouté » et peut être retiré ; un élément prévu n'a pas de « Retirer ».
- Le résumé B6 affiche « Séries prévues réalisées, non faites, supplémentaires ».

### Éléments affichés

**Boutons :** Ajouter une série · Ajouter une étape · Ajouter un exercice ou un bloc
**Étiquette :** Ajouté
**Résumé :** « 2 séries supplémentaires »

### États à gérer

#### Ajout en cours
Bouton désactivé.

### Réponses API attendues

- Ajouté : `201`
- Retirer un élément prévu : `422`, code `PLANNED_ITEM_NOT_REMOVABLE`
- Séance pas en cours : `409`

### Hors périmètre

- Modifier le prévu (US-17).

### Tâches techniques
- [ ] BDD : provenance par les colonnes `source_*` à `NULL` (D-18)
- [ ] Backend : `createWorkoutSet`, `createWorkoutExercise`, `createWorkoutBlock` (positions = max + 1), `deleteAddedWorkoutSet` (seulement si `source_planned_set_id IS NULL`)
- [ ] Backend : `POST /api/workout-sessions/:id/blocks`, `POST /api/workout-blocks/:id/exercises`, `POST /api/workout-exercises/:id/sets`, `DELETE /api/workout-sets/:id`
- [ ] Frontend : boutons dans B2 et B3, réutilisation du mode sélection du catalogue
- [ ] Tests : back : ajout, suppression d'un ajouté, refus sur un prévu, séance terminée → 409

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-49 · Chronométrer un exercice en durée ou en cardio

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-29, US-30
**Intégration future :** US-31
**Branche :** `feat/us-49-exercise-timers`
**Maquettes :** B5b, B5c, B5d, B5e, B5f (B5h : US-51)
**Règles :** RM-060, RM-061, RM-063

### User story

En tant qu'utilisateur, je veux un minuteur pour un exercice en durée et un chrono pour le cardio afin de ne pas chronométrer à côté.

### Pourquoi

Un gainage d'une minute ou une étape de tapis de 10 minutes se chronomètre ; le faire dans l'appli évite un deuxième téléphone.

### Ce qui change

En MVP, la durée se saisissait à la main (US-29). Elle se mesure maintenant, et reste modifiable.

### Règles métier

- Exercice en durée : choix **Minuteur ↓** (décompte depuis l'objectif) ou **Chrono ↑** (monte).
- Minuteur : 10 dernières secondes en cadre noir, bips à 3, 2, 1 ; à 0, **la série se valide seule** avec la durée prévue.
- « ■ Arrêter » avant la fin enregistre le temps tenu ; « ‖ Pause » met en pause.
- Cardio : on voit les paramètres de l'étape, « ▶ Lancer l'étape » démarre le chrono, un bip à l'objectif, il continue jusqu'à « Arrêter » ; le relevé de la machine s'ouvre alors, durée remplie par le chrono, le reste pré-rempli avec le prévu.
- Mêmes alertes et réglages que le repos (US-30, US-05).
- Le temps se calcule à partir de l'heure de départ (juste en arrière-plan).

### Critères d'acceptation

- B5b : « Minuteur · prévu 1 min · 1:00 · ▶ Lancer le minuteur » et le choix Minuteur / Chrono.
- B5c : « Fin dans 7 s · bip à 3, 2, 1 », « ‖ Pause », « ■ Arrêter » ; à 0, série validée puis repos.
- B5d / B5e : « Chrono · objectif 10 min », le chrono monte, bip à 10:00.
- B5f : le relevé s'ouvre seul à l'arrêt, durée « 10:12 » remplie.

### Éléments affichés

**B5b :** Minuteur ↓ · Chrono ↑ · « Minuteur · prévu 1 min » · ▶ Lancer le minuteur
**B5c :** « Fin dans 7 s · bip à 3, 2, 1 » · ‖ Pause · ■ Arrêter
**B5e :** « Chrono · objectif 10 min »
**B5f :** Étape 2 · Durée 10:12 · Distance (km) · Vitesse moy. (km/h) · Inclinaison moy. (%) · Calories · Valider l'étape 2

### États à gérer

#### Pause
Temps figé, bouton « Reprendre ».

#### Retour d'arrière-plan
Temps recalculé ; si le minuteur est arrivé à 0 pendant ce temps, la série est validée.

### Réponses API attendues

Validation par la route de l'US-29.

### Décisions

- **D-02** : B5h (minuteur gauche puis droite) est traité par l'US-51.
- **D-17** : US en V1 (en MVP, la durée se saisit à la main).

### Hors périmètre

- Minuteur de bloc (US-31).

### Tâches techniques
- [ ] Frontend : `useStopwatch` (chrono à partir de l'heure de départ, pause cumulée), réutilisation de `useCountdown` et `useTimerAlerts`
- [ ] Frontend : `DurationTimer.tsx` (B5b, B5c), `CardioStepTimer.tsx` (B5d, B5e), ouverture automatique de `CardioReadingSheet` (B5f)
- [ ] Tests : unitaires faux minuteurs : pause / reprise, arrêt avant la fin, validation à 0 une seule fois
- [ ] Tests : E2E gainage 1 min accéléré (faux temps)

### Definition of Done
- [ ] Vérifié sur un vrai téléphone, écran verrouillé puis rouvert
- [ ] Code relu et fusionné via pull request

## US-51 · Exercices « chaque côté » (gauche / droite)

EPIC 3 · Séances modèles

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-15, US-29, US-49
**Intégration future :** US-39 (progression), US-50 (muscles)
**Branche :** `feat/us-51-per-side-exercises`
**Maquettes :** A7e, A7f, B5g, B5h, B6
**Règles :** RM-010, RM-022, RM-041, RM-044

### User story

En tant qu'utilisateur, je veux préparer et faire un exercice côté par côté afin de suivre chaque côté séparément, par exemple après une blessure.

### Pourquoi

Un curl à un bras, une fente, un gainage latéral se font gauche puis droite. Après une blessure ou avec un déséquilibre, la charge n'est pas la même des deux côtés.

### Ce qui change

Les écrans A7e, A7f, B5g et B5h, laissés de côté par les US-15, US-29 et US-49, sont développés ici. Le modèle de données reprend la maquette (décision par défaut D-02).

### Règles métier

- « Chaque côté » se règle par exercice dans la séance préparée (désactivé par défaut).
- L'objectif de répétitions (ou de durée) est **le même** des deux côtés.
- « Même charge des deux côtés » est activé par défaut (un seul champ Charge) ; désactivé, on règle une charge gauche et une charge droite.
- Pendant la séance, gauche et droite se saisissent séparément ; la série n'est validée que quand les deux côtés sont renseignés.
- Durée chaque côté : minuteur gauche, puis droite (US-49).
- Abandon entre les deux côtés : le côté fait est gardé, la série reste incomplète.
- Tonnage d'une série = (rép. gauche × charge gauche) + (rép. droite × charge droite).
- Pour les muscles (US-50), une série « chaque côté » compte comme **une** série.
- Les records se calculent côté par côté.

### Critères d'acceptation

- A7e : l'interrupteur « Chaque côté », « Même charge des deux côtés » et, s'il est désactivé, « Charge gauche (kg) » et « Charge droite (kg) » ; résumé « 15 rép. / côté · G 10 · D 6 kg ».
- A7f : « Durée / côté (min:s) » ; résumé « 30 s / côté ».
- B5g : GAUCHE et DROITE côte à côte, chacun avec ses valeurs ; « Modifier » ouvre les 4 champs ; la série se valide quand les deux sont renseignés.
- B5h : « SÉRIE 1 · CÔTÉ DROIT », « Gauche : 30 s ✓ », minuteur du côté en cours.
- B6 : « 3 / 3 · G 15 / D 13 … » ; une série incomplète affiche « série 3 incomplète : gauche 30 s, droite non faite ».
- Le détail de l'historique affiche les deux côtés.

### Éléments affichés

**A7e :** Chaque côté · « Gauche puis droite, même objectif pour chaque côté » · Même charge des deux côtés · « Désactive pour une charge par côté (blessure, déséquilibre) » · Rép. / côté · Charge gauche (kg) · Charge droite (kg)
**A7f :** Durée / côté (min:s) · « Pendant la séance : minuteur gauche, puis droite. Vaut aussi pour les étirements. »
**B5g :** GAUCHE · DROITE · « Série 2 · prévu 15 rép. / côté · G 10 · D 6 kg »
**B5h :** SÉRIE 1 · CÔTÉ DROIT · « Gauche : 30 s ✓ »

### États à gérer

#### Un seul côté fait
Série « incomplète », côté fait enregistré.

#### Abandon entre les deux côtés
Le côté fait reste ; la série compte comme non faite dans « séries réalisées ».

### Réponses API attendues

- Côté enregistré : `PUT /api/workout-sets/:id/sides/:side` → `200` (+ `is_validated` quand les deux côtés sont faits)
- Côté inconnu : `400` ; exercice qui n'est pas « chaque côté » : `422`

### Décisions

- **D-02 (US-51)** : modèle repris de la maquette : réglage par exercice dans la séance, même objectif de répétitions ou de durée, charge éventuellement différente par côté, résultats enregistrés côté par côté.

### Hors périmètre

- Objectif de répétitions différent par côté (non prévu par la maquette).

### Tâches techniques
- [ ] BDD : migration 005 : `template_block_exercise.is_per_side BOOLEAN NOT NULL DEFAULT FALSE` ; `planned_set.weight_left_kg` et `weight_right_kg DECIMAL(9,3) NULL` ; mêmes colonnes copiées dans `workout_exercise.is_per_side`, `workout_set.weight_left_planned_kg`, `weight_right_planned_kg`
- [ ] BDD : table `workout_set_side (workout_set_id, side ENUM('left','right'), reps_actual, weight_actual_kg, duration_actual_seconds, validated_at, PRIMARY KEY (workout_set_id, side))`, clé étrangère vers `workout_set` en `RESTRICT`
- [ ] Shared : `sessionDraftSchema` : `is_per_side`, charges gauche / droite (seulement si `is_per_side`) ; `computeTonnage` et `formatSetSummary` gèrent les deux côtés
- [ ] Backend : copie au démarrage (US-28) étendue aux nouvelles colonnes ; `upsertWorkoutSetSide` (`INSERT … ON DUPLICATE KEY UPDATE`) ; la série passe `validated_at` quand les deux côtés existent
- [ ] Backend : suppression d'un compte (US-06) étendue à `workout_set_side`
- [ ] Frontend : `PerSideFields.tsx` (A7e, A7f), `PerSideSetEntry.tsx` (B5g), `PerSideDurationTimer.tsx` (B5h)
- [ ] Tests : back : un côté → série non validée ; deux côtés → validée ; tonnage G / D ; abandon après le côté gauche ; unitaires `computeTonnage` côté par côté
- [ ] Tests : E2E curl à charge différente G / D

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Code relu et fusionné via pull request

# Sprint 11 · Progression et Suivi

## US-39 · Progression d'un exercice

EPIC 8 · Progression

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-34, US-35
**Intégration future :** US-40 (records), US-09 (lien « Ma progression »)
**Branche :** `feat/us-39-exercise-progress`
**Maquettes :** SUI-08, SUI-09, SUI-10, SUI-10b, SUI-11
**Règles :** RM-051, RM-079, RM-081

### User story

En tant qu'utilisateur, je veux voir l'évolution de chaque exercice afin de constater mes progrès.

### Pourquoi

« Est-ce que je progresse au squat ? » est la question qu'on se pose le plus.

### Ce qui change

L'onglet « Exercices » du Suivi apparaît ; la fiche exercice affiche le lien « Ma progression ».

### Règles métier

- Calculée à partir des séries réellement faites (RM-051).
- La liste montre les exercices déjà réalisés, classés par dernière fois, avec une recherche.
- La mesure suivie dépend de l'exercice : charge max ou 1RM estimée (avec charge), répétitions max (poids du corps), durée max (maintien), distance, durée ou vitesse (cardio) ; seules les mesures saisies sont proposées.
- 1RM estimée : formule d'Epley, `charge × (1 + répétitions / 30)`, seulement sur les séries de 10 répétitions ou moins, toujours affichée « (estimation) » (RM-079).
- La courbe apparaît à partir de 2 séances ; une séance manquée n'est pas un point ; une séance inachevée est un point en pointillé (RM-081).
- Avec un lest saisi, la charge s'ajoute comme pour un exercice avec charge.

### Critères d'acceptation

- SUI-08 : recherche, chaque exercice avec son meilleur résultat et « Dernière fois le 19 nov. ».
- SUI-09 : boutons « Charge max » / « 1RM estimée » qui changent la courbe ; légende « De 50 kg à 62,5 kg en 2 séances » ; blocs de records ; « Dernières séances » qui ouvrent SUI-06.
- SUI-10 : « Répétitions max » ; pas de tonnage ni de 1RM.
- SUI-10b : une seule séance → « Une seule séance pour l'instant », « La courbe apparaîtra dès la 2ᵉ séance. »
- SUI-11 : Distance / Durée / Vitesse ; point pointillé pour la Course inachevée du 7.
- La courbe est aussi lisible sans graphique (tableau des points ou résumé texte pour les lecteurs d'écran).

### Éléments affichés

**SUI-09 :** Charge max · 1RM estimée · « De 50 kg à 62,5 kg en 2 séances » · Charge max 62,5 kg × 8 · 1RM estimée 79 kg (estimation) · Meilleur volume sur une série 8 × 62,5 = 500 kg · Meilleur volume sur une séance 1 760 kg · Plus de répétitions 8 rép. · Séances 2 · Dernières séances
**SUI-10b :** « Une seule séance pour l'instant » · « La courbe apparaîtra dès la 2ᵉ séance. »
**Note 1RM :** « 1RM estimée (formule d'Epley) à partir des séries de 10 répétitions ou moins. »

### États à gérer

#### Aucun exercice réalisé
« Tes exercices apparaîtront ici après ta première séance. »

#### Chargement / Erreur
Comme les autres écrans du Suivi.

### Réponses API attendues

- `GET /api/progress/exercises?search=` : `200`
- `GET /api/progress/exercises/:id` : `200` ; exercice jamais fait : `200` avec liste vide ; exercice d'un autre : `404`

### Hors périmètre

- Records dans le Résumé et notifications (US-40).

### Tâches techniques
- [ ] Backend : `progressRepository.readDoneExercises(userId, search)` (dernière date, groupé par exercice) ; `readExerciseSets(userId, exerciseId)` : séries validées des séances `completed` / `unfinished`, avec date réelle et statut de séance
- [ ] Shared : `estimateOneRepMax(weight, reps)` (Epley, `null` au-delà de 10 rép.), `buildProgressSeries(sets, metric)` (un point par séance, `isPartial` si inachevée), `computeExerciseRecords(sets, profile)`, `getAvailableMetrics(sets)`
- [ ] Outillage : bibliothèque de graphiques (proposition : Recharts, `--ignore-scripts`) avec texte alternatif
- [ ] Frontend : `ExerciseProgressListPage.tsx` (SUI-08), `ExerciseProgressPage.tsx` (SUI-09 à SUI-11), `ProgressChart.tsx`, `RecordGrid.tsx`
- [ ] Tests : unitaires Epley (62,5 × 8 = 79,2), séries > 10 rép. ignorées, série unique, point inachevé ; back : séances d'un autre exclues
- [ ] Tests : E2E fiche → « Ma progression »

### Definition of Done
- [ ] Chiffres de SUI-09 retrouvés sur les données d'exemple
- [ ] Graphique doublé d'un équivalent texte
- [ ] Code relu et fusionné via pull request

## US-40 · Records personnels

EPIC 8 · Progression

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-39, US-46
**Intégration future :** US-37 (recalcul)
**Branche :** `feat/us-40-personal-records`
**Maquettes :** SUI-02 (Records récents), SUI-09, SUI-10, SUI-11, NOT-06
**Règles :** RM-051, RM-055, RM-080

### User story

En tant qu'utilisateur, je veux voir mes records afin de célébrer mes progrès.

### Pourquoi

Un record battu, c'est la meilleure motivation.

### Règles métier

- Calculés à partir des résultats, sans table de records (RM-051).
- Un record n'est affiché que s'il est vérifié sur toutes les séances réalisées de l'exercice ; corrigé à la baisse, il disparaît (RM-080).
- Un nouveau record crée une notification « Record personnel » à la fin de la séance (RM-055), une seule par exercice et par séance.
- La notification n'est créée qu'à partir de résultats réalisés.

### Critères d'acceptation

- SUI-02 « Records récents » : exercice, valeur, date, flèche vers SUI-09 ; carte masquée s'il n'y a pas de record sur la période.
- Terminer une séance avec un nouveau maximum crée la notification NOT-06 « Squat à la barre · 62,5 kg × 8 (charge max) ».
- NOT-06 ouvre SUI-09 avec le bandeau « Nouveau record · 19 nov. ».
- Une correction à la baisse retire le record et sa notification.

### Éléments affichés

**SUI-02 :** Records récents · Squat à la barre · 62,5 kg · 19 nov. ›
**NOT-06 :** Nouveau record · 19 nov. · « Charge max : 62,5 kg × 8 » · « Le record vient des résultats saisis de la séance Jambes du 19 nov. »

### États à gérer

#### Aucun record sur la période
Carte masquée.

### Réponses API attendues

- Records récents dans `GET /api/progress/summary` (US-41)

### Hors périmètre

- Table de records (interdite par RM-051).

### Tâches techniques
- [ ] Backend : à la fin d'une séance (US-34) et après correction (US-37) : `readPreviousBestSets(userId, exerciseIds, excludeSessionId)`, comparaison avec `computeExerciseRecords`, création de la notification (`INSERT`, sans doublon)
- [ ] Backend : `readRecentRecords(userId, from, to)` pour le Résumé
- [ ] Shared : `detectNewRecords(previousSets, sessionSets, profile)` (fonction pure)
- [ ] Tests : unitaires `detectNewRecords` (égalité = pas de record, première séance = pas de notification) ; back : notification unique, correction à la baisse

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-41 · Résumé du suivi (régularité et travail)

EPIC 8 · Progression

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-27, US-35, US-48
**Intégration future :** US-50, US-40
**Branche :** `feat/us-41-tracking-summary`
**Maquettes :** SUI-01, SUI-01b, SUI-01c, SUI-02, SUI-02s, SUI-03, SUI-04
**Règles :** RM-076, RM-077, RM-082

### User story

En tant qu'utilisateur, je veux un résumé de ma semaine, de mon mois ou de mon programme afin de savoir si je tiens mon rythme.

### Pourquoi

La régularité est le premier facteur de progrès.

### Ce qui change

L'onglet Suivi s'ouvre maintenant sur « Résumé » ; l'Historique devient le 2ᵉ onglet.

### Règles métier

- Périodes : Semaine (lundi → dimanche), Mois, Programme ; ‹ › change de période (RM-082).
- « Prévues » = tous les rendez-vous de la période, chacun compté une seule fois : faites · inachevées · à confirmer · manquées · annulées · à venir ; la somme = prévues. Les décalées ↷ sont un indicateur à part, jamais ajouté au total (RM-076).
- Les séances à confirmer comptent dans les prévues.
- Travail : séances faites, temps total, tonnage (affiché seulement s'il y a des charges).
- Mois en cours comparé à la même durée du mois précédent, selon la date consultée (le 20 nov. → 1er-20 oct. ; le 31 mars → 1er-28 fév.) ; libellé dynamique ; pas d'écart sur les prévues (RM-077).
- Écarts écrits en texte (« +3 »), jamais par la couleur seule.
- Mode Programme : Assiduité, Objectifs atteints et Progression du programme.

### Critères d'acceptation

- SUI-01 (semaine) : Régularité « 9 prévues » avec la répartition, barre, « ↷ Décalées : 1 · déjà comptées dans leur statut » ; Travail ; Muscles (US-50) ; Records (US-40).
- SUI-02 (mois) : « 21 prévues », écarts « vs 1er-26 oct. » sur faites, temps et tonnage.
- SUI-03 (programme) : « Semaine 4 sur 8 · du 2 nov. au 27 déc. », assiduité « 2 / 3 séances passées faites », objectifs atteints, courbe de l'exercice principal.
- SUI-04 : aucun entraînement → « Ton suivi commencera après ta première séance » + « Voir mon planning ».
- Les chiffres sont identiques à l'Historique et au Planning pour la même période.

### Éléments affichés

**SUI-01 :** Semaine · Mois · Programme ▾ · « 23 → 29 nov. » · Régularité · 9 prévues · faites · inachevées · à confirmer · manquées · annulées · à venir · « ↷ Décalées : 1 » · Travail · séance faite · durée · « Le tonnage n'apparaît qu'avec des charges. »
**SUI-01c :** « Impossible de charger ton suivi » · « Vérifie ta connexion, puis réessaie. » · Réessayer
**SUI-04 :** « Ton suivi commencera après ta première séance » · « Tes séances faites, tes records et les muscles travaillés apparaîtront ici. » · Voir mon planning

### États à gérer

#### Chargement
Cartes grises de même taille (SUI-01b).

#### Erreur
SUI-01c.

#### Vide
SUI-04.

### Réponses API attendues

- `GET /api/progress/summary?period=week|month|program&date=&program_id=` : `200`
- Paramètres invalides : `400` ; programme d'un autre : `404`

### Hors périmètre

- Muscles (US-50), records (US-40).

### Tâches techniques
- [ ] Backend : `countAppointmentsByStatus(userId, from, to, today)` : une requête avec `SUM(CASE …)` pour chaque catégorie (faites = séance `completed`, inachevées = `unfinished`, à venir = `planned` et date ≥ aujourd'hui…) et `SUM(moved_manually)` pour les décalées
- [ ] Backend : `readWorkTotals(userId, from, to)` : séances faites, somme des durées, tonnage (séries validées)
- [ ] Shared : `getPeriodRange(period, date)`, `getComparisonRange(from, consultedDate)` (même durée, plafonnée au dernier jour du mois précédent), `formatDelta(value)`
- [ ] Frontend : `TrackingSummaryPage.tsx`, `PeriodSelector`, `RegularityCard`, `WorkCard`, `ProgramSummaryCards`
- [ ] Tests : unitaires `getComparisonRange` (20 nov., 31 mars, 29 février) ; back : somme des catégories = prévues, décalées non ajoutées, exemple SUI-02 (21 = 9 + 1 + 2 + 2 + 1 + 6)
- [ ] Tests : E2E ; axe sur SUI-01 à SUI-04

### Definition of Done
- [ ] Exemples SUI-01 et SUI-02 reproduits en tests d'intégration
- [ ] Code relu et fusionné via pull request

## US-50 · Muscles travaillés

EPIC 8 · Progression

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-41
**Intégration future :** vue 3D (V3, hors backlog)
**Branche :** `feat/us-50-worked-muscles`
**Maquettes :** SUI-01, SUI-02, SUI-02s
**Règles :** RM-004, RM-078

### User story

En tant qu'utilisateur, je veux voir les muscles que j'ai travaillés sur une période afin d'équilibrer mon entraînement.

### Pourquoi

On a tendance à toujours travailler les mêmes muscles : la carte le rend visible.

### Règles métier

- Séries par muscle : muscle principal = 1 série, secondaire = ½ série, selon le catalogue ; seules les séries validées comptent (RM-078).
- Les exercices cardio et de mobilité ne comptent pas.
- Les muscles non travaillés sont signalés.
- La carte face et dos suit le choix Femme / Homme (RM-004).

### Critères d'acceptation

- Carte « Muscles » : silhouette face et dos, liste des muscles avec leur nombre de séries (« Quadriceps · 15 », « Fessiers · 14,5 »), « non travaillé » pour les autres.
- La règle est écrite sous la carte : « Principal = 1 série, secondaire = ½ série. »
- Exemple SUI-02 : Quadriceps 15 · Fessiers 14,5 · Abdominaux 12,5 · Obliques 7,5 · …
- Les zones de la carte ont un équivalent texte (la liste).

### Éléments affichés

**Carte :** Muscles · Face · Dos · liste · « Principal = 1 série, secondaire = ½ série. Cardio et mobilité non comptés. »

### États à gérer

#### Aucune série sur la période
« Aucun muscle travaillé sur cette période. »

### Réponses API attendues

- Inclus dans `GET /api/progress/summary` (US-41)

### Décisions

- **D-19** : « cardio » et « mobilité » sont reconnus par le groupe de l'exercice : Cardio et Étirements ne comptent pas.

### Hors périmètre

- Corps en 3D manipulable (V3).

### Tâches techniques
- [ ] Backend : `readMuscleSets(userId, from, to)` : `SUM(CASE em.role WHEN 'primary' THEN 1 ELSE 0.5 END)` par muscle, sur les séries validées des séances `completed` / `unfinished`, en excluant les groupes cardio et étirements
- [ ] Frontend : `MuscleMapCard.tsx` (SVG face / dos, zones par code de muscle, intensité + liste texte)
- [ ] Tests : back : exemple SUI-02 reproduit ; série non validée ignorée

### Definition of Done
- [ ] Exemple SUI-02 vérifié
- [ ] Code relu et fusionné via pull request

# Sprint 12 · Profil et installation

## US-04 · Modifier mon profil

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-03 (page Profil)
**Intégration future :** US-07, US-09, US-50 (illustrations et carte musculaire)
**Branche :** `feat/us-04-edit-profile`
**Maquettes :** PRF-01, PRF-02, PRF-02e, PRF-02s, PRF-05, PRF-05b
**Règles :** RM-003, RM-004, RM-014

### User story

En tant qu'utilisateur, je veux modifier mon pseudo et choisir les illustrations Femme ou Homme afin de personnaliser mon appli.

### Pourquoi

Voir des illustrations qui nous ressemblent rend les exercices plus parlants. Le pseudo doit pouvoir changer sans recréer de compte.

### Règles métier

- L'adresse e-mail n'est pas modifiable (RM-003).
- Le pseudo reste unique et suit les règles de l'inscription.
- Le choix Femme / Homme change seulement les illustrations et la carte musculaire ; ni les exercices, ni les objectifs, ni les mesures (RM-004).
- Si l'illustration choisie manque, on affiche l'autre version ; si aucune n'existe, un emplacement avec le nom de l'exercice (RM-014).
- Le choix s'applique partout : catalogue, fiche exercice, séance, Suivi.

### Critères d'acceptation

- PRF-01 affiche le pseudo, l'adresse, « Modifier le profil », les sections PRÉFÉRENCES (Affichage, Sons et minuteurs, Illustrations d'exercice) et COMPTE (Paramètres du compte, Se déconnecter).
- Le retour ‹ ramène à l'onglet d'origine.
- PRF-02 : le champ Pseudo est modifiable ; l'adresse est affichée avec « non modifiable » et un cadenas ; le choix Femme / Homme est un groupe de deux options.
- « Enregistrer » est inactif tant que rien n'a changé.
- Quitter avec des modifications demande « Quitter sans enregistrer ? ».
- Pseudo pris : message sous le champ, focus dessus. Pseudo vide : « Le pseudo est obligatoire. »
- Erreur réseau : bandeau, saisies conservées, « Réessayer ».
- Succès : retour à PRF-01 avec « ✓ Profil enregistré. » pendant 4 secondes.
- PRF-05 montre un exemple (Squat à la barre) qui change selon le choix.

### Éléments affichés

**PRF-01 :** Mon profil · lucas_m · lucas.martin@exemple.fr · Modifier le profil · PRÉFÉRENCES : Affichage (kg · km · indicateur de l'Accueil), Sons et minuteurs (Sons, vibrations, notifications), Illustrations d'exercice (Femme) · COMPTE : Paramètres du compte (Mot de passe, suppression) · Se déconnecter
**PRF-02 :** Modifier les informations du profil · Pseudo (« Visible par toi seul pour l'instant. Doit être unique. ») · Adresse e-mail · non modifiable · Illustrations des exercices : Femme / Homme (« Sert uniquement à choisir les dessins des exercices. Ne change ni les exercices, ni les objectifs, ni les mesures. ») · Annuler · Enregistrer
**Erreurs :** « ⚠ Ce pseudo est déjà utilisé. Choisis-en un autre. » · « Le pseudo est obligatoire. » · « Enregistrement impossible. Vérifie ta connexion puis réessaie. Tes saisies sont conservées. »
**Succès :** ✓ Profil enregistré.
**PRF-05 :** Illustrations · Afficher les illustrations : Femme / Homme · EXEMPLE · SQUAT À LA BARRE · « Les exercices, objectifs et mesures restent les mêmes. Seuls les dessins et la carte musculaire changent. »
**PRF-05b :** « Pas d'illustration pour cet exercice »

### États à gérer

#### Sans modification
« Enregistrer » inactif.

#### Enregistrement en cours
Bouton désactivé.

#### Erreur
Sous le champ (pseudo) ou bandeau (réseau), saisies conservées.

#### Succès
Confirmation 4 s, annoncée aux lecteurs d'écran.

### Réponses API attendues

- Profil enregistré : `200` + `PublicUser`
- Données invalides (dont tentative de changer l'e-mail : champ ignoré) : `400`
- Pseudo pris : `409`, code `USERNAME_TAKEN`
- Pas connecté : `401`

### Hors périmètre

- Unités et indicateur d'accueil (US-05).
- Mot de passe et suppression (US-47, US-06).

### Tâches techniques
- [ ] Shared : `updateProfileSchema` : `username` (règles de l'inscription), `sex` (`female` / `male`) ; `email` absent du schéma (`.strict()` refuse le champ)
- [ ] Backend : `userRepository.updateUserProfile(userId, username, sex)` ; `ER_DUP_ENTRY` → 409
- [ ] Backend : `PATCH /api/users/me` → `checkOrigin` → `authenticate` → `validate` → `userActions.updateProfile`
- [ ] Frontend : `ProfilePage.tsx` complète (PRF-01), `EditProfilePage.tsx` (PRF-02), `IllustrationSettingsPage.tsx` (PRF-05)
- [ ] Frontend : après succès, `AuthContext` mis à jour : toutes les images changent sans recharger
- [ ] Frontend : `getExerciseImage` (US-07) utilisé partout avec `user.sex`
- [ ] Routing : `/profil`, `/profil/modifier`, `/profil/illustrations`
- [ ] Tests : back : pseudo modifié, pseudo pris → 409, e-mail envoyé → 400, autre utilisateur jamais modifié
- [ ] Tests : front : Enregistrer inactif sans changement, confirmation de sortie, message 4 s
- [ ] Tests : E2E : passer en Homme → l'illustration du catalogue change

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Groupe Femme / Homme accessible (`radiogroup`)
- [ ] Code relu et fusionné via pull request

## US-05 · Régler mes préférences

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-04
**Intégration future :** US-30, US-49 (alertes), US-42 (indicateur d'accueil), tous les affichages de charge et de distance
**Branche :** `feat/us-05-preferences`
**Maquettes :** PRF-03, PRF-04, NOT-08
**Règles :** RM-005, RM-060, RM-062, RM-063, DT-11

### User story

En tant qu'utilisateur, je veux choisir mes unités, mes alertes de minuteur et mon indicateur d'accueil afin d'adapter l'appli à ma pratique.

### Pourquoi

Certains comptent en livres ou en miles ; d'autres s'entraînent sans son ou sans vibration.

### Règles métier

- Unité de poids : kg ou lb. Unité de distance : km ou mi.
- La base garde toujours kg et km (mètres) ; seule l'affichage et la saisie sont convertis (DT-11).
- Sons, vibrations et notifications de minuteur se règlent séparément (RM-062).
- Activer les notifications de minuteur demande l'autorisation du téléphone ; refus → l'interrupteur revient à « Non » avec un message.
- Sur iPhone, la vibration peut ne pas marcher : c'est écrit, rien n'est promis (RM-063).
- Les préférences sont propres à chaque utilisateur et s'appliquent tout de suite (RM-005).
- Les réglages de minuteur ne concernent jamais le centre de notifications (NOT-08).

### Critères d'acceptation

- PRF-03 : Unité de poids, Unité de distance, Indicateur à l'Accueil, et un APERÇU qui change en direct (« Squat à la barre · 4 × 8 · 60 kg », « Tapis de course · 5,2 km »).
- Chaque changement est enregistré tout de suite (pas de bouton Enregistrer).
- En lb, une charge de 60 kg s'affiche « 132,3 lb » ; une saisie de 135 lb est enregistrée 61,235 kg.
- PRF-04 : trois interrupteurs indépendants (Sons, Vibrations, Notifications de minuteur) et la note sur le téléphone.
- Le minuteur de repos respecte les réglages dès la série suivante.
- NOT-08 : le lien « Réglages des alertes › » des notifications ouvre PRF-04 avec la phrase explicative.

### Éléments affichés

**PRF-03 :** Préférences d'affichage · Unité de poids (kg / lb) · Unité de distance (km / mi) · Indicateur à l'Accueil · APERÇU
**PRF-04 :** Sons · « Bips de fin de minuteur et de repos » · Vibrations · « À la fin du minuteur et du repos » · Notifications de minuteur · « Prévenir quand l'app est en arrière-plan » · Note : « Selon ton téléphone. Certaines fonctions dépendent du téléphone et du navigateur. Sur iPhone (Safari), la vibration peut ne pas fonctionner. Les notifications demandent ton autorisation. »
**Refus d'autorisation :** « Ton téléphone a refusé les notifications. Tu peux les autoriser dans ses réglages. »
**NOT-08 :** « Ces réglages ne concernent que les minuteurs pendant la séance. Le centre de notifications (cloche) affiche toujours les séances à confirmer, les séances manquées, les programmes terminés et les records. »

### États à gérer

#### Enregistrement
Interrupteur désactivé le temps de la requête ; en cas d'échec, il revient à sa valeur et un message s'affiche.

#### Navigateur sans notifications
Interrupteur désactivé avec « Non disponible sur ce navigateur ».

### Réponses API attendues

- Préférences enregistrées : `200`
- Valeur invalide : `400`

### Décisions

- **D-04** : indicateurs d'accueil : « Séances faites cette semaine », « Temps d'entraînement de la semaine », « Aucun » (valeur par défaut : « Séances faites cette semaine »).

### Hors périmètre

- Afficher l'indicateur à l'Accueil (US-42).
- Notifications du centre (US-46).

### Tâches techniques
- [ ] BDD : colonnes existantes de `user` : `weight_unit`, `distance_unit`, `sound_enabled`, `vibration_enabled`, `timer_notification_enabled`, `home_metric`
- [ ] Shared : `preferencesSchema` (partiel : un ou plusieurs champs)
- [ ] Shared : `toDisplayWeight(kg, unit)`, `fromDisplayWeight(value, unit)` (1 lb = 0,45359237 kg), `toDisplayDistance(meters, unit)`, `fromDisplayDistance` ; `formatWeight`, `formatDistance` utilisent les préférences
- [ ] Backend : `userRepository.updateUserPreferences(userId, values)` : uniquement les colonnes reçues, liste blanche de colonnes écrite dans le code
- [ ] Backend : `PATCH /api/users/me/preferences`
- [ ] Frontend : `PreferencesPage.tsx` (PRF-03), `SoundSettingsPage.tsx` (PRF-04) ; `usePreferences` (dans `AuthContext`)
- [ ] Frontend : `useTimerAlerts` lit `sound_enabled` et `vibration_enabled` ; `Notification.requestPermission()` à l'activation
- [ ] Frontend : tous les champs de charge et de distance passent par les fonctions de conversion
- [ ] Tests : unitaires : conversions aller-retour (60 kg → lb → kg sans perte au-delà de 3 décimales)
- [ ] Tests : back : une préférence modifiée, colonne inconnue refusée
- [ ] Tests : E2E : passer en lb → la fiche de progression et la saisie affichent des lb

### Definition of Done
- [ ] Critères d'acceptation vérifiés sur Android et iPhone
- [ ] Aucune valeur en lb ou mi stockée en base
- [ ] Code relu et fusionné via pull request

## US-47 · Changer mon mot de passe

EPIC 1 · Compte

**Taille :** S (2 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-04
**Intégration future :** US-06
**Branche :** `feat/us-47-change-password`
**Maquettes :** PRF-06, PRF-06e, PRF-06s
**Règles :** RM-001, RM-002, DT-01, DT-07

### User story

En tant qu'utilisateur, je veux changer mon mot de passe afin de sécuriser mon compte.

### Pourquoi

Un mot de passe peut avoir fuité ou été partagé : il faut pouvoir le changer seul.

### Règles métier

- Mot de passe actuel, nouveau et confirmation sont obligatoires.
- Le mot de passe actuel doit être juste.
- Le nouveau suit les règles de l'inscription (8 caractères minimum, dont un chiffre).
- Le nouveau et la confirmation doivent être identiques.
- Après une erreur, les trois champs sont vidés.
- La session en cours reste ouverte.
- 5 essais par 15 minutes (protection contre la force brute sur le mot de passe actuel).

### Critères d'acceptation

- PRF-06 affiche Pseudo, E-mail, « Créé le · 2 octobre 2026 », la section « Changer le mot de passe » et « Supprimer mon compte ».
- « Changer » est inactif tant que les 3 champs ne sont pas remplis.
- Les mots de passe sont masqués par défaut, avec « Afficher ».
- Chaque erreur s'affiche sous son champ, focus sur le premier en erreur.
- Succès : « ✓ Mot de passe changé. La session en cours reste ouverte. »
- La connexion avec l'ancien mot de passe échoue ensuite ; avec le nouveau, elle réussit.

### Éléments affichés

**Champs :** Mot de passe actuel · Nouveau mot de passe (« Mêmes règles qu'à l'inscription. ») · Confirmer le nouveau mot de passe · bouton Changer
**Erreurs :** « ⚠ Mot de passe actuel incorrect. » · « ⚠ Ne respecte pas les règles de l'inscription. » · « ⚠ Les deux mots de passe ne correspondent pas. »
**Succès :** ✓ Mot de passe changé. · « La session en cours reste ouverte. »

### États à gérer

#### Envoi
Bouton désactivé.

#### Erreur
Champs vidés, messages sous les champs.

### Réponses API attendues

- Changé : `204`
- Règles non respectées ou confirmation différente : `400`
- Mot de passe actuel faux : `422`, code `WRONG_CURRENT_PASSWORD`, champ `current_password`
- Trop d'essais : `429`

### Décisions

- **D-05** : la date de création du compte est affichée (« Créé le · 2 octobre 2026 », depuis `user.created_at`).

### Hors périmètre

- Mot de passe oublié.
- Déconnexion des autres appareils.

### Tâches techniques
- [ ] Shared : `changePasswordSchema` : 3 champs, règles de l'inscription, `refine` sur l'égalité
- [ ] Backend : `userRepository.readUserPasswordHash(userId)`, `updateUserPassword(userId, hash)`
- [ ] Backend : `PUT /api/users/me/password` → `checkOrigin` → `authLimiter` → `authenticate` → `validate` → action (vérifier, hacher, enregistrer, 204)
- [ ] Frontend : `AccountSettingsPage.tsx` (PRF-06), `ChangePasswordForm.tsx`
- [ ] Tests : back : succès, ancien mot de passe faux → 422, confirmation différente → 400, 6ᵉ essai → 429, l'ancien ne marche plus
- [ ] Tests : front : champs vidés après erreur, bouton inactif

### Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Aucun mot de passe dans les logs ni dans les réponses
- [ ] Code relu et fusionné via pull request

## US-06 · Supprimer mon compte

EPIC 1 · Compte

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-47, et toutes les tables remplies par les autres US
**Intégration future :** à mettre à jour à chaque nouvelle table liée à l'utilisateur
**Branche :** `feat/us-06-delete-account`
**Maquettes :** PRF-06, PRF-07, PRF-08, PRF-08e, PRF-08s
**Règles :** RM-006, DT-17

### User story

En tant qu'utilisateur, je veux supprimer mon compte afin d'effacer toutes mes données.

### Pourquoi

C'est le droit à l'effacement du RGPD, obligatoire dès que l'appli accueille de vrais comptes.

### Règles métier

- Confirmation en deux temps : la liste de ce qui sera effacé, puis la saisie du mot de passe (RM-006).
- Toutes les données de l'utilisateur sont supprimées dans une seule transaction, dans l'ordre des dépendances (les clés étrangères sont en `RESTRICT`, DT-17). En cas d'échec, rien n'est supprimé.
- Les exercices du catalogue commun ne sont jamais touchés ; les exercices personnels sont supprimés.
- Après la suppression, la session est fermée, sans retour possible dans l'appli.

### Critères d'acceptation

- PRF-07 liste ce qui sera effacé et « Cette action ne peut pas être annulée. » ; « Annuler » revient à PRF-06, « Continuer » ouvre PRF-08.
- PRF-08 demande le mot de passe ; « SUPPRIMER DÉFINITIVEMENT » est inactif tant que le champ est vide, séparé de « Annuler ».
- Mot de passe faux : « ⚠ Mot de passe incorrect. », champ vidé, rien supprimé.
- Erreur réseau : « La suppression n'a pas pu aboutir. Ton compte est intact. »
- Succès : PRF-08s, cookie effacé ; le retour arrière ne réaffiche rien ; la connexion avec ce compte échoue.
- En base, plus aucune ligne liée à l'utilisateur (vérifié table par table).

### Éléments affichés

**PRF-07 :** Supprimer ton compte ? · « La suppression efface définitivement : ton profil et tes préférences ; tes séances, programmes et résultats ; ton historique, tes records et ta progression ; tes exercices personnels. » · « Cette action ne peut pas être annulée. » · Annuler · Continuer
**PRF-08 :** Confirme la suppression · « Saisis ton mot de passe pour supprimer définitivement le compte lucas_m. » · Mot de passe · 🗑︎ SUPPRIMER DÉFINITIVEMENT · Annuler
**PRF-08s :** Compte supprimé · « Tes données ont été effacées. » · Créer un compte · Retour à la connexion

### États à gérer

#### Suppression en cours
Boutons désactivés, statut annoncé.

#### Échec
Message, compte intact.

#### Succès
Écran final, session fermée.

### Réponses API attendues

- Supprimé : `204` + cookie effacé
- Mot de passe faux : `422`, code `WRONG_PASSWORD`
- Trop d'essais : `429`
- Pas connecté : `401`

### Décisions

- **D-05** : la confirmation finale se fait par la saisie du mot de passe (PRF-08).

### Hors périmètre

- Export des données avant suppression.
- Délai de grâce (suppression immédiate).

### Tâches techniques
- [ ] Backend : `accountRepository` : une fonction `DELETE` par table, dans l'ordre : `notification` → `workout_set` → `workout_exercise` → `workout_block` → `workout_session` → `appointment` → `weekly_schedule` → `program_change` → `program` (enfants avant parents, `source_program_id` remis à `NULL` avant) → `planned_set` → `template_block_exercise` → `template_block` → `session_version` → `session_template` → exercices personnels (`exercise_text`, `exercise_category`, `exercise_muscle`, `exercise_equipment`, `exercise_measure`, puis `exercise`, après avoir remis à `NULL` les `source_exercise_id` qui pointent vers eux) → `user`
- [ ] Backend : chaque `DELETE` filtré par l'utilisateur (jointures jusqu'à `owner_user_id`)
- [ ] Backend : `DELETE /api/users/me` (corps : mot de passe) → `checkOrigin` → `authLimiter` → `authenticate` → `validate` → action dans `withTransaction`, puis `clearAuthCookie`
- [ ] Frontend : `DeleteAccountPage.tsx` (PRF-07, PRF-08, PRF-08s) ; `AuthContext.logout` sans retour possible (`replace`)
- [ ] Tests : back : utilisateur avec séances, programmes, notifications et exercices personnels → plus aucune ligne ; un autre utilisateur intact ; mot de passe faux → rien supprimé ; erreur forcée au milieu → rien supprimé
- [ ] Tests : E2E : suppression complète puis tentative de connexion

### Definition of Done
- [ ] Test « aucune ligne restante » couvrant toutes les tables
- [ ] Code relu et fusionné via pull request

## US-45 · Installer l'appli sur mon téléphone

EPIC 9 · Socle

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-44
**Intégration future :** notifications de minuteur en arrière-plan (US-05)
**Branche :** `feat/us-45-pwa`
**Maquettes :** aucune (icônes et couleurs de la charte)

### User story

En tant qu'utilisateur, je veux installer Fulgora sur l'écran d'accueil de mon téléphone afin de l'ouvrir comme une vraie appli à la salle.

### Pourquoi

À la salle, on veut ouvrir l'appli d'un appui, sans barre d'adresse.

### Règles métier

- L'appli est une PWA (application web installable) : nom, icône, couleurs du thème.
- Elle s'ouvre en plein écran, sans la barre du navigateur.
- Hors connexion, un message clair remplace la page d'erreur du navigateur.
- Aucune donnée personnelle n'est mise en cache pour un usage hors connexion (seulement l'interface).

### Critères d'acceptation

- Le navigateur propose « Ajouter à l'écran d'accueil » ; l'icône Fulgora apparaît.
- L'appli installée s'ouvre en plein écran, avec la couleur de la charte.
- Sans réseau, l'écran « Pas de connexion » s'affiche avec « Réessayer ».
- Lighthouse valide l'installabilité.

### Éléments affichés

**Hors connexion :** « Pas de connexion » · « Fulgora a besoin d'internet pour enregistrer tes séances. » · Réessayer

### Hors périmètre

- Utilisation complète hors connexion (enregistrer une séance sans réseau).

### Tâches techniques
- [ ] Outillage : `vite-plugin-pwa` (`--ignore-scripts`) ou manifeste + service worker écrits à la main (proposition : le plugin)
- [ ] Frontend : `manifest.webmanifest` (nom, icônes 192 et 512, `display: standalone`, `theme_color`, `background_color`), page hors connexion
- [ ] Frontend : le service worker ne met jamais en cache les réponses de `/api`
- [ ] Tests : Lighthouse PWA ; E2E mode hors connexion

### Definition of Done
- [ ] Installation vérifiée sur Android et iPhone
- [ ] Code relu et fusionné via pull request

# Sprint 13 · Blocs chronométrés et exercices personnels

## US-43 · Ajouter un bloc chronométré (Circuit, AMRAP, For Time)

EPIC 3 · Séances modèles

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-13
**Intégration future :** US-31 (minuteur de bloc)
**Branche :** `feat/us-43-timed-blocks`
**Maquettes :** A3, C4 (bloc Circuit)
**Règles :** RM-019, RM-042

### User story

En tant qu'utilisateur, je veux ajouter un bloc Circuit, AMRAP ou For Time afin de varier mes formats d'entraînement.

### Pourquoi

Ces formats sont très utilisés en préparation physique : enchaîner les exercices plutôt que série par série.

### Règles métier

- **Circuit** : exercices enchaînés, un nombre de tours prévu (`planned_rounds`, 1 à 50).
- **AMRAP** : le plus de tours possible dans une durée fixe (`time_limit_seconds`, 1 min à 2 h).
- **For Time** : un travail fixé, fait le plus vite possible ; une durée limite facultative.
- Dans ces blocs, chaque exercice a **un seul objectif par tour** (une série prévue = l'objectif d'un tour).
- Pas de repos par série dans un bloc chronométré : un repos facultatif entre les tours.

### Critères d'acceptation

- Les tuiles Circuit, AMRAP et For Time deviennent disponibles dans « Type de bloc ».
- Circuit : champ « Nombre de tours » obligatoire ; AMRAP : « Durée » obligatoire ; For Time : « Durée limite (facultatif) ».
- C4 affiche le bloc avec ses exercices et « objectif à régler » tant qu'un objectif manque.
- Le résumé affiche « Circuit · 3 tours · 4 exercices », « AMRAP · 12 min », « For Time ».

### Éléments affichés

**C4 :** Bloc Circuit · Nombre de tours · exercices « objectif à régler » · Valider le bloc
**Résumés :** Circuit · 3 tours · AMRAP · 12 min · For Time

### États à gérer

#### Objectif manquant
« objectif à régler » sur l'exercice, « Valider le bloc » désactivé.

### Réponses API attendues

- Circuit sans tours, AMRAP sans durée : `400`

### Décisions

- **D-06** : pendant la séance, un bloc chronométré enregistre un total (tours terminés, répétitions en plus, durée), pas un résultat par tour.

### Hors périmètre

- Minuteur et saisie pendant la séance (US-31).

### Tâches techniques
- [ ] Shared : `BLOCK_TYPES` : `isAvailable` à vrai pour les 3 types ; `sessionDraftSchema` : règles propres à chaque type (`superRefine`)
- [ ] Backend : `createTemplateBlock` enregistre `planned_rounds` et `time_limit_seconds`
- [ ] Frontend : `TimedBlockSettings.tsx` ; `formatBlockSummary`
- [ ] Tests : schéma : circuit sans tours → refusé ; AMRAP sans durée → refusé ; for_time sans durée → accepté

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-31 · Minuteur de bloc (Circuit, AMRAP, For Time)

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-43, US-49
**Intégration future :** US-36 (affichage des tours)
**Branche :** `feat/us-31-block-timer`
**Maquettes :** non maquetté pour l'exécution (voir À PRÉCISER)
**Règles :** RM-042

### User story

En tant qu'utilisateur, je veux un minuteur adapté aux blocs Circuit, AMRAP et For Time afin de suivre leur format.

### Pourquoi

Un AMRAP de 12 minutes se joue contre la montre : il faut le temps et le compte des tours.

### Règles métier

- Le minuteur de bloc ne démarre jamais tout seul avec la séance (RM-042) : bouton « Lancer le bloc ».
- AMRAP : décompte de la durée fixe ; on note les tours terminés et les répétitions en plus.
- For Time : chrono qui monte jusqu'à « Terminé » ; durée limite facultative.
- Circuit : compteur de tours prévu / fait.
- Résultats du bloc : `completed_rounds`, `extra_reps`, `actual_duration_seconds`.

### Critères d'acceptation

- Un bloc chronométré affiche « Lancer le bloc » ; le minuteur suit le type.
- « + 1 tour » incrémente les tours ; les répétitions en plus se saisissent à la fin.
- À la fin, le résultat du bloc est enregistré et visible dans le résumé.

### Éléments affichés

**Bloc :** AMRAP · 12 min · Lancer le bloc · « + 1 tour » · Terminer le bloc
**Résumé :** « AMRAP · 5 tours + 8 rép. » · « For Time · 14:32 » · « Circuit · 3 / 3 tours »

### États à gérer

#### Bloc en cours
Les autres blocs restent accessibles.

### Réponses API attendues

- Résultat enregistré : `PUT /api/workout-blocks/:id` → `200`
- Séance pas en cours : `409`

### Décisions

- **D-06** : un simple total par bloc (tours terminés, répétitions en plus, durée).
- **D-15** : écrans d'exécution à faire maquetter en première tâche.

### Hors périmètre

- Saisie série par série dans un bloc chronométré.

### Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Backend : `updateWorkoutBlockResult(blockId, rounds, extraReps, duration)` (contexte vérifié comme pour une série, `touchWorkoutSession`)
- [ ] Frontend : `BlockTimer.tsx` selon le type ; réutilisation de `useCountdown` / `useStopwatch`
- [ ] Tests : back : résultat enregistré, séance terminée → 409 ; unitaires du compteur de tours

### Definition of Done
- [ ] Écrans maquettés et validés avant le développement
- [ ] Code relu et fusionné via pull request

## US-10 · Créer un exercice personnel

EPIC 2 · Catalogue

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-09
**Intégration future :** US-11, US-14 (sélection), US-39 (progression)
**Branche :** `feat/us-10-personal-exercise`
**Maquettes :** écran 05, état 3a (exercice personnel) ; formulaire de création **non maquetté** (voir À PRÉCISER)
**Règles :** RM-007, RM-008, RM-009, RM-010

### User story

En tant qu'utilisateur, je veux créer mon propre exercice afin d'ajouter ce qui manque au catalogue.

### Pourquoi

175 exercices ne couvrent pas tout : un exercice avec élastique, une machine particulière de sa salle.

### Règles métier

- Nom obligatoire (2 à 160 caractères), difficulté obligatoire.
- Au moins un muscle principal ; des muscles secondaires facultatifs (RM-009).
- Au moins un groupe, un matériel facultatif, plusieurs possibles (RM-008).
- Au moins une mesure à suivre : répétitions, charge, durée, distance, vitesse, résistance, inclinaison, calories (RM-010).
- Instructions, erreurs à éviter et alternatives facultatives (10 lignes max chacune).
- Pas d'illustration : la fiche affiche « Illustration non disponible ».
- L'exercice n'est visible que par son créateur (RM-007).
- Un slug unique est généré à partir du nom (avec un suffixe si besoin).

### Critères d'acceptation

- « + Créer un exercice » est accessible depuis le catalogue.
- Le formulaire valide chaque champ avant l'envoi.
- Après création, la fiche s'ouvre avec le badge « EXERCICE PERSONNEL ».
- L'exercice apparaît dans le catalogue, la recherche et les filtres, et dans le mode sélection.
- Un autre utilisateur ne le voit nulle part, même par son adresse.

### Éléments affichés

**Titre :** Nouvel exercice
**Champs :** Nom · Difficulté · Groupe(s) · Matériel · Muscles principaux · Muscles secondaires · Mesures suivies · Instructions · Erreurs à éviter · Alternatives
**Bouton :** Créer l'exercice
**Erreurs :** « Choisis au moins un muscle principal. » · « Choisis au moins une mesure. » · « Ce champ est obligatoire. »

### États à gérer

#### Envoi
Bouton désactivé.

#### Erreur API
Message + saisie conservée.

### Réponses API attendues

- Créé : `201` + `{ id }`
- Données invalides : `400`
- Muscle, groupe, matériel ou mesure inexistant : `422`

### Décisions

- **D-15** : le formulaire n'est pas maquetté : la première tâche est de le faire dessiner (Claude Design) avec les champs listés, puis de le faire valider.
- Pas de photo personnelle dans cette US.

### Hors périmètre

- Modifier, personnaliser, archiver (US-11).
- Partager un exercice.

### Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Shared : `createExerciseSchema` ; `slugify(name)`
- [ ] Backend : `exerciseRepository.createExercise`, `createExerciseCategories`, `createExerciseMuscles`, `createExerciseEquipments`, `createExerciseMeasures`, `createExerciseTexts` (une fonction = une requête, insertion multiple avec `VALUES ?`)
- [ ] Backend : `readMuscles`, `readMeasures` (listes du formulaire) ; vérification que les identifiants existent
- [ ] Backend : `POST /api/exercises` dans `withTransaction` ; slug unique (`ER_DUP_ENTRY` → suffixe `-2`, `-3`)
- [ ] Frontend : `CreateExercisePage.tsx`, sélecteurs multiples accessibles
- [ ] Tests : back : création complète ; sans muscle principal → 400 ; muscle inexistant → 422 ; invisible pour un autre utilisateur (liste, fiche, sélection)
- [ ] Tests : E2E : créer puis retrouver par la recherche

### Definition of Done
- [ ] Maquette du formulaire validée avant le développement
- [ ] Code relu et fusionné via pull request

## US-11 · Personnaliser ou archiver un exercice

EPIC 2 · Catalogue

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-10
**Intégration future :** US-39 (progression sur l'exercice d'origine ou sa copie)
**Branche :** `feat/us-11-customize-archive-exercise`
**Maquettes :** non maquetté (voir À PRÉCISER)
**Règles :** RM-011, RM-012, RM-013

### User story

En tant qu'utilisateur, je veux adapter un exercice du catalogue ou archiver un des miens afin de garder un catalogue à mon goût.

### Pourquoi

On peut vouloir changer les instructions d'un exercice, ou retirer de sa liste un exercice qu'on ne fait plus, sans perdre son historique.

### Règles métier

- Personnaliser un exercice commun crée une **copie personnelle** ; l'exercice commun n'est jamais modifié (RM-013). La copie garde le lien vers l'original (`source_exercise_id`).
- Un exercice personnel **jamais utilisé** dans une séance réalisée se modifie directement.
- Un exercice personnel **déjà utilisé** dans une séance réalisée : la modification crée une nouvelle copie, l'ancien est archivé (RM-012).
- Archiver retire l'exercice du catalogue et de la sélection, mais il reste dans l'historique et la progression (RM-011).
- Un exercice commun ne s'archive pas (on peut seulement archiver sa copie).
- Un exercice archivé peut être désarchivé.

### Critères d'acceptation

- La fiche d'un exercice commun propose « Personnaliser » ; celle d'un exercice personnel « Modifier » et « Archiver ».
- Personnaliser ouvre le formulaire de l'US-10 pré-rempli ; à l'enregistrement, une copie personnelle apparaît.
- Modifier un exercice déjà fait affiche « Cet exercice est dans ton historique : une nouvelle version sera créée, l'ancienne reste dans tes séances passées. »
- Archiver demande confirmation ; l'exercice disparaît du catalogue ; l'historique l'affiche toujours.
- Un filtre « Archivés » permet de le retrouver et de le désarchiver.

### Éléments affichés

**Boutons :** Personnaliser · Modifier · Archiver · Désarchiver
**Confirmation d'archivage :** « Archiver « Mon tirage élastique » ? Il n'apparaîtra plus dans le catalogue, mais restera dans tes séances passées. » · Archiver · Annuler

### États à gérer

#### Exercice déjà utilisé
Avertissement avant modification.

#### Archivé
Badge « Archivé » sur la fiche.

### Réponses API attendues

- Copie créée : `201` ; modifié : `200` ; archivé / désarchivé : `200`
- Modifier ou archiver un exercice commun : `422`, code `COMMON_EXERCISE_READ_ONLY`
- Exercice d'un autre : `404`

### Décisions

- **D-15** : écrans à faire maquetter en première tâche.
- **D-16** : les séances prévues qui utilisent l'ancien exercice gardent l'exercice d'origine ; seules les nouvelles préparations utilisent la copie.

### Hors périmètre

- Supprimer définitivement un exercice.

### Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Backend : `countExerciseUsage(exerciseId)` : séries réalisées (`workout_exercise` lié à une séance `completed` ou `unfinished`)
- [ ] Backend : `copyExercise` (exercice + liaisons + textes, dans `withTransaction`), `updateExercise`, `archiveExercise`, `unarchiveExercise`
- [ ] Backend : routes : `POST /api/exercises/:id/customize`, `PUT /api/exercises/:id`, `PATCH /api/exercises/:id/archive`, `PATCH /api/exercises/:id/unarchive`
- [ ] Frontend : boutons sur `ExerciseDetailPage`, réutilisation du formulaire de l'US-10, filtre « Archivés »
- [ ] Tests : back : commun jamais modifié ; personnel non utilisé modifié en place ; personnel utilisé → copie + ancien archivé ; archivé absent du catalogue mais présent dans l'historique

### Definition of Done
- [ ] Maquettes validées avant le développement
- [ ] Code relu et fusionné via pull request

# Plus tard

## US-22 · Réutiliser un programme

EPIC 4 · Programmes

**Taille :** M (3 Story Points)
**Priorité :** Could Have (Plus tard)
**Sprint :** Plus tard
**Dépendance principale :** US-18, US-48
**Intégration future :** aucune
**Branche :** `feat/us-22-reuse-program`
**Maquettes :** PRO-12, PRO-07c2, NOT-05
**Règles :** RM-036

### User story

En tant qu'utilisateur, je veux repartir d'un programme existant afin de refaire un cycle sans tout reconstruire.

### Pourquoi

Un cycle qui a marché se refait souvent, avec de nouvelles dates.

### Règles métier

- La copie reprend la semaine type, les séances, blocs, exercices, séries et objectifs (RM-036).
- Elle ne reprend jamais les résultats, records, statuts, déplacements ni annulations.
- La copie est indépendante : nouvelles séances préparées ; modifier l'une ne change jamais l'autre.
- Nom pré-rempli avec « (2) », nouvelles dates obligatoires.
- L'origine est mémorisée (`source_program_id`).

### Critères d'acceptation

- « Réutiliser » est proposé sur un programme terminé, abandonné ou à venir (menu ⋯, PRO-13, NOT-05).
- PRO-12 liste ce qui est copié (✓) et ce qui ne l'est pas.
- « Créer et voir le programme » crée la copie à venir et ouvre son détail.
- « Ajuster les séances avant » ouvre PRO-03f avec la copie, puis « Créer ».

### Éléments affichés

**PRO-12 :** ✓ Semaine type · ✓ Blocs, exercices, séries et objectifs · « Résultats réalisés et records » (non copiés) · « Statuts, déplacements et annulations » (non copiés) · Nom · Début · Fin · Créer et voir le programme · Ajuster les séances avant

### États à gérer

#### Copie en cours
Boutons désactivés.

### Réponses API attendues

- Copie créée : `201` + `{ id }`
- Programme d'un autre : `404`

### Hors périmètre

- Partager un programme avec un autre utilisateur.

### Tâches techniques
- [ ] Backend : `copyProgram` dans `withTransaction` : nouveau programme, pour chaque règle active une nouvelle séance préparée (copie de la dernière version) et une nouvelle règle, puis génération des rendez-vous (US-18)
- [ ] Backend : `POST /api/programs/:id/copy`
- [ ] Frontend : `ReuseProgramPage.tsx`
- [ ] Tests : back : copie indépendante (modifier la copie ne touche pas l'original) ; aucun résultat ni statut copié

### Definition of Done
- [ ] Code relu et fusionné via pull request

## US-42 · Indicateur d'accueil

EPIC 8 · Progression

**Taille :** S (2 Story Points)
**Priorité :** Could Have (Plus tard)
**Sprint :** Plus tard
**Dépendance principale :** US-05, US-41
**Intégration future :** aucune
**Branche :** `feat/us-42-home-metric`
**Maquettes :** écran 03, PRF-03
**Règles :** RM-005, RM-059

### User story

En tant qu'utilisateur, je veux voir mon indicateur favori en arrivant dans l'appli afin d'être motivé.

### Pourquoi

Un chiffre visible chaque jour (« 2 séances cette semaine ») entretient la motivation.

### Règles métier

- L'indicateur se choisit dans les préférences (RM-005).
- « Aucun » masque l'indicateur.
- Il est calculé avec les mêmes règles que le Résumé (US-41).

### Critères d'acceptation

- L'Accueil affiche l'indicateur choisi sous la date.
- Changer l'indicateur dans PRF-03 change l'Accueil tout de suite.

### Éléments affichés

**Exemple :** « 2 séances faites cette semaine »

### Décisions

- **D-04** : indicateurs d'accueil : « Séances faites cette semaine », « Temps d'entraînement de la semaine », « Aucun ».

### Hors périmètre

- Indicateurs personnalisés.

### Tâches techniques
- [ ] Shared : `HOME_METRICS` (code, libellé)
- [ ] Backend : réutilise `GET /api/progress/summary?period=week`
- [ ] Frontend : `HomeMetric.tsx` à l'Accueil
- [ ] Tests : affichage selon la préférence, « Aucun » masque

### Definition of Done
- [ ] Code relu et fusionné via pull request

# Definition of Done commune
**Fonctionnel**
- Tous les critères d'acceptation sont vérifiés dans le navigateur, sur mobile (375 px) et sur ordinateur.
- L'écran correspond aux maquettes citées dans la carte.
- Les textes affichés sont en français, sans faute.

**Accessibilité (RM-064)**
- Contraste d'au moins 4,5 pour 1 pour le texte.
- Tout se fait au clavier, et l'élément sélectionné est bien visible (focus).
- Chaque bouton, champ et image a un libellé compréhensible.
- Les zones à toucher font au moins 44 × 44 px.
- Une alerte sonore ou une vibration a toujours un équivalent visuel (RM-061).

**Sécurité**
- Toutes les données reçues sont vérifiées côté serveur.
- Un utilisateur ne peut lire ou modifier que ses propres données (test 404 sur la donnée d'un autre).
- Aucune requête SQL n'est construite en collant du texte : toujours des paramètres `?`.
- Aucun secret dans le code ni dans les commits.

**Qualité**
- Les routes du serveur ont leurs tests (cas normal et cas d'erreur), et ils passent.
- `npm run check` (Biome) et la vérification TypeScript ne signalent aucune erreur.
- Les conventions de nommage sont respectées (`docs/naming-conventions.md`).

**Livraison**
- Le travail est sur une branche dédiée, fusionné dans `dev` après relecture, puis dans `main` à la livraison d'une version.
- La carte Trello est déplacée dans « Terminé ».
