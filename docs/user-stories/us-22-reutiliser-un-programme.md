# US-22 · Réutiliser un programme

EPIC 4 · Programmes

**Taille :** M (3 Story Points)
**Priorité :** Could Have (Plus tard)
**Sprint :** Plus tard
**Dépendance principale :** US-18, US-48
**Intégration future :** aucune
**Branche :** `feat/us-22-reuse-program`
**Maquettes :** PRO-12, PRO-07c2, NOT-05
**Règles :** RM-036

## User story

En tant qu'utilisateur, je veux repartir d'un programme existant afin de refaire un cycle sans tout reconstruire.

## Pourquoi

Un cycle qui a marché se refait souvent, avec de nouvelles dates.

## Règles métier

- La copie reprend la semaine type, les séances, blocs, exercices, séries et objectifs (RM-036).
- Elle ne reprend jamais les résultats, records, statuts, déplacements ni annulations.
- La copie est indépendante : nouvelles séances préparées ; modifier l'une ne change jamais l'autre.
- Nom pré-rempli avec « (2) », nouvelles dates obligatoires.
- L'origine est mémorisée (`source_program_id`).

## Critères d'acceptation

- « Réutiliser » est proposé sur un programme terminé, abandonné ou à venir (menu ⋯, PRO-13, NOT-05).
- PRO-12 liste ce qui est copié (✓) et ce qui ne l'est pas.
- « Créer et voir le programme » crée la copie à venir et ouvre son détail.
- « Ajuster les séances avant » ouvre PRO-03f avec la copie, puis « Créer ».

## Éléments affichés

**PRO-12 :** ✓ Semaine type · ✓ Blocs, exercices, séries et objectifs · « Résultats réalisés et records » (non copiés) · « Statuts, déplacements et annulations » (non copiés) · Nom · Début · Fin · Créer et voir le programme · Ajuster les séances avant

## États à gérer

### Copie en cours

Boutons désactivés.

## Réponses API attendues

- Copie créée : `201` + `{ id }`
- Programme d'un autre : `404`

## Hors périmètre

- Partager un programme avec un autre utilisateur.

## Tâches techniques

- [ ] Backend : `copyProgram` dans `withTransaction` : nouveau programme, pour chaque règle active une nouvelle séance préparée (copie de la dernière version) et une nouvelle règle, puis génération des rendez-vous (US-18)
- [ ] Backend : `POST /api/programs/:id/copy`
- [ ] Frontend : `ReuseProgramPage.tsx`
- [ ] Tests : back : copie indépendante (modifier la copie ne touche pas l'original) ; aucun résultat ni statut copié

## Definition of Done

- [ ] Code relu et fusionné via pull request
