# T-04 · Migrations de la base

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-01
**Intégration future :** toute évolution de la base
**Branche :** `chore/t-04-migrations`
**Règles :** DT-19

## User story

En tant que développeuse, je veux faire évoluer la base avec des migrations numérotées afin de ne jamais perdre de données et de savoir exactement dans quel état est chaque base.

## Pourquoi

`migrate.ts` crée aujourd'hui la base depuis `schema.sql`. Dès qu'il y aura de vraies données, il faudra ajouter des colonnes sans tout effacer.

## Règles métier

- Chaque migration a un numéro et ne s'applique qu'une fois.
- `db:reset` est refusé quand `NODE_ENV=production`.
- Les identifiants viennent uniquement de l'environnement.

## Critères d'acceptation

- `server/database/migrations/` contient `001_initial_schema.sql`, `002_appointment_cancelled_at.sql`, `003_program_draft_status.sql`, `004_user_terms_and_auto_closed.sql`.
- La table `schema_migration (version INT PRIMARY KEY, applied_at DATETIME(3))` garde la trace des migrations appliquées.
- `npm run db:migrate` n'applique que les migrations manquantes, dans l'ordre.
- Relancer `db:migrate` ne fait rien et ne plante pas.
- `npm run db:reset` en production affiche un refus et s'arrête.

## Décisions

- **D-02** : migration 005 pour les exercices « chaque côté » (US-51).
- **D-11** : la migration 004 contient aussi `user.timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris'` (D-12) et `workout_session.declared_afterwards BOOLEAN NOT NULL DEFAULT FALSE` (US-38).

## Hors périmètre

- Données de départ (T-08).

## Tâches techniques

- [ ] BDD : `001` = le schéma actuel de `schema.sql`
- [ ] BDD : `002` : `appointment.cancelled_at` + contrainte `ck_appointment_cancelled_at`
- [ ] BDD : `003` : `program.status` avec `draft`
- [ ] BDD : `004` : `user.terms_accepted_at DATETIME(3) NOT NULL` et `workout_session.auto_closed BOOLEAN NOT NULL DEFAULT FALSE`
- [ ] Backend : réécrire `server/bin/migrate.ts` : crée `schema_migration`, lit les fichiers dans l'ordre, applique les manquants, enregistre chaque version
- [ ] Backend : `--reset` : refusé si `NODE_ENV=production`, sinon supprime et recrée la base puis applique tout
- [ ] Tests : base vide → 4 versions ; relance → rien ; reset en production → refus

## Definition of Done

- [ ] Base de développement et base de test migrées sans erreur
- [ ] `schema.sql` mis à jour pour refléter l'état final (documentation)
