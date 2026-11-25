# T-03 · Validation des données reçues

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-02
**Intégration future :** toutes les routes qui reçoivent des données
**Branche :** `chore/t-03-validation`
**Règles :** DT-05

## User story

En tant que développeuse, je veux que chaque donnée reçue soit vérifiée par un schéma avant d'arriver dans l'action afin que l'action ne travaille que sur des données propres.

## Pourquoi

Le client peut être contourné : n'importe qui peut envoyer une requête à la main. Le serveur doit vérifier lui-même le type, la longueur et les bornes de chaque valeur.

## Règles métier

- Les schémas vivent dans `shared/`, pour que le client et le serveur utilisent les mêmes règles.
- Une donnée invalide ne va jamais jusqu'à l'action.
- Les champs inconnus sont retirés.
- Les chaînes sont nettoyées de leurs espaces au début et à la fin.

## Critères d'acceptation

- Le middleware `validate({ body, params, query })` accepte un schéma Zod par partie de la requête.
- Après validation, `req.body` (ou `params`, `query`) contient la version nettoyée.
- Une donnée invalide répond 400 avec la liste des champs fautifs.
- `idParamSchema` refuse `0`, `-1`, `1.5`, `abc`.

## Réponses API attendues

- Données invalides : `400 Bad Request`, code `VALIDATION_ERROR`, avec `fields: [{ field, message }]`.

## Hors périmètre

- Les schémas propres à chaque US (écrits dans chaque US).

## Tâches techniques

- [ ] Outillage : installer `zod` dans `shared` (`--ignore-scripts`)
- [ ] Shared : créer `shared/validation.ts` : `idParamSchema`, `dateSchema` (AAAA-MM-JJ, date réelle), `timeSchema` (HH:MM)
- [ ] Backend : créer `server/src/middlewares/validate.ts`
- [ ] Tests : unitaires des schémas communs ; intégration d'une route témoin (400 avec le détail des champs)

## Definition of Done

- [ ] Tests verts
- [ ] Messages d'erreur en français, affichables tels quels
