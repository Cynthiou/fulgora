# T-01 · Outils de qualité et de test

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** aucune
**Intégration future :** toutes les US
**Branche :** `chore/t-01-quality-tools`

## User story

En tant que développeuse, je veux que chaque PR soit vérifiée automatiquement afin de ne jamais fusionner du code cassé dans `dev`.

## Pourquoi

Le projet vise beaucoup de tests (unitaires, intégration, bout en bout) et une PR par US. Sans vérification automatique, une erreur de type, de format ou un test rouge peut passer dans `dev` sans que personne ne le voie.

## Règles métier

- Une PR vers `dev` ne peut pas être fusionnée si Biome, TypeScript ou un test échoue.
- Les tests d'intégration tournent sur une base `fulgora_test`, jamais sur la base de développement.
- Les paquets s'installent toujours avec `--ignore-scripts`.

## Critères d'acceptation

- `npm run check` lance Biome sur tout le dépôt.
- `npm run typecheck` vérifie le client et le serveur.
- `npm test` lance les tests Vitest du serveur et du client.
- `npm run test:e2e` lance Playwright sur l'appli démarrée.
- Un workflow GitHub Actions lance `check`, `typecheck` et `test` à chaque PR vers `dev`, avec un service MySQL 8.
- Une PR avec une erreur Biome est marquée en échec.
- Une PR avec un test rouge est marquée en échec.

## Réponses attendues

- CI verte : la PR peut être relue.
- CI rouge : le nom de l'étape en échec est visible dans la PR.

## Hors périmètre

- Déploiement en production.
- Protection de branche sur GitHub (réglage du dépôt, fait à la main par Cynthia).

## Tâches techniques

- [ ] Outillage : installer `vitest`, `supertest`, `@types/supertest` dans `server` (`--ignore-scripts`)
- [ ] Outillage : installer `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` dans `client`
- [ ] Outillage : installer `@playwright/test` et `@axe-core/playwright` à la racine
- [ ] Outillage : ajouter les scripts `typecheck`, `test`, `test:e2e` à la racine et dans chaque workspace
- [ ] Outillage : `vitest.config.ts` serveur (environnement node) et client (environnement jsdom)
- [ ] Outillage : `playwright.config.ts` : un projet mobile 375 px et un projet ordinateur 1280 px, `webServer` qui lance `npm run dev`
- [ ] CI : `.github/workflows/ci.yml` : `npm ci --ignore-scripts`, `check`, `typecheck`, migration de `fulgora_test`, `test`
- [ ] Tests : un test unitaire témoin par workspace et un test E2E témoin (la page de connexion s'affiche)

## Definition of Done

- [ ] Les 4 scripts fonctionnent en local
- [ ] Une PR de test volontairement cassée est bien refusée par la CI
- [ ] Aucune trace de Claude dans les commits ni dans la PR
