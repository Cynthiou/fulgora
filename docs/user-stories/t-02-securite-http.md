# T-02 · Sécurité HTTP

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-01
**Intégration future :** toutes les routes
**Branche :** `chore/t-02-http-security`
**Règles :** DT-03, DT-07

## User story

En tant qu'utilisatrice, je veux que l'appli refuse les requêtes venues d'autres sites et les attaques par force brute afin que mon compte reste protégé.

## Pourquoi

Le jeton de connexion est dans un cookie : le navigateur l'envoie tout seul. Sans contrôle d'origine, un site malveillant pourrait déclencher une action à la place de l'utilisatrice (attaque CSRF). Sans limite de tentatives, un robot pourrait essayer des milliers de mots de passe.

## Règles métier

- Toute requête `POST`, `PUT`, `PATCH` ou `DELETE` doit venir d'une origine autorisée.
- L'origine est lue dans l'en-tête `Origin`, sinon dans `Referer`. Sans aucun des deux : refus.
- La comparaison est exacte (pas de « commence par »).
- Les origines autorisées viennent de la variable d'environnement `ALLOWED_ORIGINS`.
- Connexion et inscription : 5 essais par 15 minutes et par adresse IP.
- Une erreur imprévue ne renvoie jamais de détail technique.

## Critères d'acceptation

- `X-Powered-By` n'apparaît plus dans les réponses.
- Helmet ajoute ses en-têtes de sécurité à toutes les réponses.
- Un corps JSON de plus de 100 Ko est refusé.
- Un POST sans `Origin` ni `Referer` répond 403.
- Un POST avec l'origine d'un autre site répond 403.
- Un POST avec la bonne origine passe.
- Un GET n'est pas concerné par le contrôle d'origine.
- La 6ᵉ tentative de connexion en 15 minutes répond 429.
- Toutes les erreurs suivent le format `{ "error": { "code", "message", "field" } }`.

## Réponses API attendues

- Origine refusée : `403 Forbidden`, code `FORBIDDEN_ORIGIN`
- Trop de tentatives : `429 Too Many Requests`, code `TOO_MANY_REQUESTS`, message « Trop de tentatives. Réessaie dans quelques minutes. »
- Erreur imprévue : `500`, code `INTERNAL_ERROR`, message « Une erreur est survenue. Réessaie plus tard. »

## Hors périmètre

- Authentification (T-06).
- Validation des données (T-03).

## Tâches techniques
- [ ] Outillage : installer `helmet` et `express-rate-limit` (`--ignore-scripts`)
- [ ] Backend : `app.ts` : `app.disable("x-powered-by")`, `helmet()`, `express.json({ limit: "100kb" })`
- [ ] Backend : créer `server/src/utils/httpError.ts` : classe `HttpError(status, code, message, field?)`
- [ ] Backend : créer `server/src/middlewares/checkOrigin.ts` : méthodes concernées, lecture `Origin` puis `Referer` (origine extraite avec `new URL`), comparaison exacte avec `ALLOWED_ORIGINS`
- [ ] Backend : créer `server/src/middlewares/rateLimiters.ts` : `authLimiter` (5 / 15 min) et `apiLimiter` (300 / 15 min), réponse au format commun
- [ ] Backend : remplacer le gestionnaire d'erreurs de `app.ts` : `HttpError` → son statut et son JSON ; autre erreur → log serveur + 500 générique
- [ ] Backend : ajouter `ALLOWED_ORIGINS` dans `.env.sample` (jamais dans `.env` versionné)
- [ ] Tests : 403 sans origine, 403 mauvaise origine, 200 bonne origine, GET non bloqué, 429 au 6ᵉ essai, `X-Powered-By` absent, 500 sans détail

## Definition of Done
- [ ] Tous les tests de la checklist passent
- [ ] Aucun secret ni origine en dur dans le code
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript
