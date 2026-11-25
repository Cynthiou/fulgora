# T-08 · Données de départ

EPIC 0 · Socle technique

**Taille :** S (2 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-04
**Intégration future :** US-07, US-15, tests E2E
**Branche :** `chore/t-08-seed`

## User story

En tant que développeuse, je veux un catalogue complet et un compte de démonstration afin de développer et tester sur des données réalistes.

## Pourquoi

Les exercices au poids du corps n'ont que la mesure « répétitions » : impossible de saisir un lest (maquette B5a). Il faut aussi des données pour les tests E2E.

## Règles métier

- Le compte de démonstration n'est jamais créé en production.
- Le catalogue commun n'a pas de propriétaire (`owner_user_id` à `NULL`).

## Critères d'acceptation

- Les 42 exercices au poids du corps ont aussi la mesure « charge » (pour le lest).
- Les 24 nouveaux exercices (id 152 à 175) et les 4 nouveaux équipements sont dans le catalogue.
- `npm run db:seed:dev` crée un compte de démonstration et quelques séances, et refuse en production.

## Décisions

- **D-14** : les 24 nouveaux exercices restent sans carte musculaire au départ ; la fiche affiche alors les muscles en texte seulement. Les cartes sont ajoutées dès qu'elles sont dessinées.

## Tâches techniques

- [x] BDD : mettre à jour `catalog.json` (mesure « charge » sur le profil `bodyweight`)
- [x] Backend : `bin/seedDev.ts` : compte de démonstration (mot de passe lu dans l'environnement), une séance libre, refus si `NODE_ENV=production`
- [x] Tests : après seed, `exercise_measure` contient la charge pour Tractions

## Definition of Done

- [x] Seed relancé sur une base vide sans erreur
