# US-42 · Indicateur d'accueil

EPIC 8 · Progression

**Taille :** S (2 Story Points)
**Priorité :** Could Have (Plus tard)
**Sprint :** Plus tard
**Dépendance principale :** US-05, US-41
**Intégration future :** aucune
**Branche :** `feat/us-42-home-metric`
**Maquettes :** écran 03, PRF-03
**Règles :** RM-005, RM-059

## User story

En tant qu'utilisateur, je veux voir mon indicateur favori en arrivant dans l'appli afin d'être motivé.

## Pourquoi

Un chiffre visible chaque jour (« 2 séances cette semaine ») entretient la motivation.

## Règles métier

- L'indicateur se choisit dans les préférences (RM-005).
- « Aucun » masque l'indicateur.
- Il est calculé avec les mêmes règles que le Résumé (US-41).

## Critères d'acceptation

- L'Accueil affiche l'indicateur choisi sous la date.
- Changer l'indicateur dans PRF-03 change l'Accueil tout de suite.

## Éléments affichés

**Exemple :** « 2 séances faites cette semaine »

## Décisions

- **D-04** : indicateurs d'accueil : « Séances faites cette semaine », « Temps d'entraînement de la semaine », « Aucun ».

## Hors périmètre

- Indicateurs personnalisés.

## Tâches techniques

- [ ] Shared : `HOME_METRICS` (code, libellé)
- [ ] Backend : réutilise `GET /api/progress/summary?period=week`
- [ ] Frontend : `HomeMetric.tsx` à l'Accueil
- [ ] Tests : affichage selon la préférence, « Aucun » masque

## Definition of Done

- [ ] Code relu et fusionné via pull request
