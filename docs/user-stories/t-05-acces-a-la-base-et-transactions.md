# T-05 · Accès à la base et transactions

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-04
**Intégration future :** US-23, US-28 et toute écriture dans plusieurs tables
**Branche :** `chore/t-05-transactions`
**Règles :** DT-09, DT-17

## User story

En tant que développeuse, je veux un outil simple pour écrire dans plusieurs tables d'un coup afin que l'appli n'enregistre jamais une donnée à moitié.

## Pourquoi

Créer une séance écrit dans 6 tables. Si la 4ᵉ écriture échoue, les 3 premières doivent être annulées.

## Règles métier

- Une transaction est soit entièrement enregistrée, soit entièrement annulée.
- Une connexion empruntée au pool est toujours rendue, même en cas d'erreur.
- L'utilisateur MySQL de l'appli n'a que `SELECT, INSERT, UPDATE, DELETE` sur la base.

## Critères d'acceptation

- `withTransaction(async (connection) => …)` valide si tout réussit, annule si une erreur est levée, et rend la connexion dans les deux cas.
- Chaque fonction de repository accepte un paramètre `db: Queryable = client` (le pool ou la connexion de la transaction).
- Une transaction qui lève une erreur au milieu ne laisse aucune ligne.

## Hors périmètre

- Verrous propres à chaque US (`FOR UPDATE`), écrits dans l'US concernée.

## Tâches techniques

- [ ] Backend : `database/client.ts` : exporter le type `Queryable`
- [ ] Backend : créer `database/withTransaction.ts` (`getConnection`, `beginTransaction`, `commit`, `rollback`, `release` dans `finally`)
- [ ] BDD : documenter dans `docs/` la création de l'utilisateur MySQL à droits limités (commande à lancer par Cynthia)
- [ ] Tests : transaction réussie ; erreur au milieu → aucune ligne ; connexion rendue (le pool ne s'épuise pas après 20 échecs)

## Definition of Done

- [ ] Tests verts
- [ ] La notion de transaction est expliquée en commentaire en tête du fichier
