# T-06 · Authentification : socle

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-02, T-03
**Intégration future :** US-01, US-02, US-03 et toutes les routes privées
**Branche :** `chore/t-06-auth-core`
**Règles :** DT-01, DT-02, DT-06

## User story

En tant qu'utilisatrice, je veux que mon mot de passe soit protégé et que l'appli sache qui je suis à chaque requête afin que personne d'autre ne voie mes données.

## Pourquoi

Les US Compte ont besoin de hacher les mots de passe, de créer un jeton et de protéger les routes. On prépare ces outils une fois pour toutes.

## Règles métier

- Mot de passe haché avec Argon2id, jamais stocké, renvoyé ni écrit dans les logs.
- Jeton signé (JWT, HS256) avec un secret d'au moins 32 caractères lu dans `JWT_SECRET`, valable 7 jours.
- Jeton dans un cookie `fulgora_token` : `httpOnly`, `secure` en production, `sameSite: "strict"`, `path: "/"`.
- Une route privée sans jeton valide répond 401.
- L'identifiant de l'utilisateur vient **toujours** du jeton, jamais du corps de la requête.

## Critères d'acceptation

- `hashPassword` produit un hachage qui commence par `$argon2id$`.
- `verifyPassword` renvoie vrai pour le bon mot de passe, faux sinon.
- `authenticate` place `req.userId` quand le jeton est valide.
- Jeton absent, expiré ou signé avec un autre secret : 401.
- Au démarrage, le serveur refuse de se lancer si `JWT_SECRET` fait moins de 32 caractères.

## Réponses API attendues

- Pas connecté : `401 Unauthorized`, code `UNAUTHENTICATED`, message « Connecte-toi pour continuer. »

## Décisions

- **D-13** : jeton signé (JWT) dans un cookie, plus simple à expliquer. Limite assumée et documentée : il ne se révoque pas avant son expiration (7 jours). Évolution possible : table de sessions.

## Hors périmètre

- Pages d'inscription et de connexion (US-01, US-02).

## Tâches techniques
- [ ] Outillage : installer `argon2` et `jsonwebtoken` (+ `@types/jsonwebtoken`) (`--ignore-scripts` puis construction du module natif d'argon2 vérifiée)
- [ ] Backend : `utils/password.ts` : Argon2id, mémoire 19 456 Kio, 2 passes, parallélisme 1
- [ ] Backend : `utils/token.ts` : `signToken(userId)`, `verifyToken(token)`
- [ ] Backend : `utils/authCookie.ts` : `setAuthCookie(res, token)`, `clearAuthCookie(res)` avec les mêmes options
- [ ] Backend : `middlewares/authenticate.ts` ; type Express étendu pour `req.userId`
- [ ] Backend : contrôle de `JWT_SECRET` au démarrage dans `main.ts`
- [ ] Tests : unitaires (hachage, vérification, jeton expiré) ; intégration d'une route témoin protégée

## Definition of Done
- [ ] Tests verts
- [ ] Aucun mot de passe ni jeton dans les logs
