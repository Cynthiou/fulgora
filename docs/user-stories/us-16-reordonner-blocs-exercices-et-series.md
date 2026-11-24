# US-16 · Réordonner blocs, exercices et séries

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-15
**Intégration future :** US-17, US-18 (mêmes éditeurs)
**Branche :** `feat/us-16-reorder`
**Maquettes :** A6, A8, PRO-03 (poignée ⋮⋮)
**Règles :** RM-024

## User story

En tant qu'utilisateur, je veux changer l'ordre des blocs, des exercices et des séries afin d'ajuster ma séance.

## Pourquoi

On se rend souvent compte après coup qu'on préfère faire le squat avant les fentes.

## Règles métier

- L'ordre se change dans le brouillon (éditeur) ; il est enregistré avec la séance.
- Les positions restent uniques dans leur parent : c'est le serveur qui les numérote à partir de l'ordre des listes (RM-024).
- L'ordre prévu n'impose rien pendant la séance (ordre d'exécution libre).

## Critères d'acceptation

- La poignée ⋮⋮ permet de glisser un bloc, un exercice ou une série, au toucher.
- Au clavier : la poignée prend le focus, Espace pour saisir, flèches pour déplacer, Espace pour poser, Échap pour annuler.
- Le lecteur d'écran annonce « Squat déplacé en position 2 sur 6 ».
- Des boutons « Monter » / « Descendre » existent dans le menu ⋯ (solution de secours).
- L'ordre enregistré est celui affiché.

## Éléments affichés

**Poignée :** ⋮⋮ (libellé « Déplacer Squat à la barre »)
**Menu ⋯ :** Monter · Descendre

## États à gérer

### Glissement en cours

Élément soulevé, emplacement visible.

## Réponses API attendues

Aucune route propre : l'ordre part avec l'enregistrement de la séance.

## Hors périmètre

- Réordonner pendant la séance en cours.

## Tâches techniques

- [ ] Outillage : installer `@dnd-kit/core` et `@dnd-kit/sortable` (`--ignore-scripts`) : accessible au clavier et au toucher
- [ ] Frontend : actions du reducer `moveBlock`, `moveExercise`, `moveSet` (fonctions pures, testées)
- [ ] Frontend : `SortableList.tsx` générique ; annonces `aria-live` en français
- [ ] Tests : reducer : déplacements aux bords (premier, dernier) ; E2E : glisser au clavier

## Definition of Done

- [ ] Testé au toucher, à la souris et au clavier
- [ ] Code relu et fusionné via pull request
