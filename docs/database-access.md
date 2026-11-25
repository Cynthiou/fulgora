# Accès à la base de données

Comment Fulgora se connecte à MySQL, et quel compte sert à quoi (DT-08, DT-09).

## Deux besoins, deux niveaux de droits

| Besoin                      | Commandes                                                   | Droits nécessaires                                         |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Faire tourner l'application | `npm run dev`, `npm start`                                  | `SELECT, INSERT, UPDATE, DELETE` sur la base, rien de plus |
| Faire évoluer la base       | `npm run db:migrate`, `npm run db:reset`, `npm run db:seed` | créer, modifier et supprimer la base et ses tables         |

L'application ne doit jamais tourner avec un compte capable de supprimer une table : si une faille permettait d'injecter du SQL, les dégâts resteraient limités aux lignes.

## Créer le compte de l'application

À lancer une fois, connectée à MySQL avec le compte `root` (ou tout compte administrateur). Remplacer `un_mot_de_passe_long` par un vrai mot de passe, puis le mettre dans `server/.env`.

```sql
CREATE USER 'fulgora_app'@'localhost' IDENTIFIED BY 'un_mot_de_passe_long';

GRANT SELECT, INSERT, UPDATE, DELETE ON fulgora.* TO 'fulgora_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fulgora_test.* TO 'fulgora_app'@'localhost';

FLUSH PRIVILEGES;
```

Pour vérifier :

```sql
SHOW GRANTS FOR 'fulgora_app'@'localhost';
```

## Quel compte dans `server/.env` ?

Le fichier `.env` n'a qu'un jeu de variables `DB_USER` / `DB_PASSWORD`, utilisé à la fois par l'application et par les scripts de migration.

- **En développement**, le plus simple est de garder un compte qui a tous les droits sur `fulgora.*` et `fulgora_test.*` : les migrations et les tests en ont besoin.
- **En production**, `DB_USER` est le compte limité `fulgora_app`. Les migrations se lancent à part, avec le compte administrateur passé pour cette seule commande :

```bash
DB_USER=root DB_PASSWORD=... npm run db:migrate
```

`npm run db:reset` est de toute façon refusé quand `NODE_ENV=production`.

## Les transactions

Toute écriture dans plusieurs tables passe par `withTransaction` (`server/src/database/withTransaction.ts`) : soit tout est enregistré, soit rien. Chaque fonction de repository accepte un paramètre `db: Queryable = client`, c'est-à-dire le pool par défaut, ou la connexion de la transaction en cours.
