# US-40 · Records personnels

EPIC 8 · Progression

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-39, US-46
**Intégration future :** US-37 (recalcul)
**Branche :** `feat/us-40-personal-records`
**Maquettes :** SUI-02 (Records récents), SUI-09, SUI-10, SUI-11, NOT-06
**Règles :** RM-051, RM-055, RM-080

## User story

En tant qu'utilisateur, je veux voir mes records afin de célébrer mes progrès.

## Pourquoi

Un record battu, c'est la meilleure motivation.

## Règles métier

- Calculés à partir des résultats, sans table de records (RM-051).
- Un record n'est affiché que s'il est vérifié sur toutes les séances réalisées de l'exercice ; corrigé à la baisse, il disparaît (RM-080).
- Un nouveau record crée une notification « Record personnel » à la fin de la séance (RM-055), une seule par exercice et par séance.
- La notification n'est créée qu'à partir de résultats réalisés.

## Critères d'acceptation

- SUI-02 « Records récents » : exercice, valeur, date, flèche vers SUI-09 ; carte masquée s'il n'y a pas de record sur la période.
- Terminer une séance avec un nouveau maximum crée la notification NOT-06 « Squat à la barre · 62,5 kg × 8 (charge max) ».
- NOT-06 ouvre SUI-09 avec le bandeau « Nouveau record · 19 nov. ».
- Une correction à la baisse retire le record et sa notification.

## Éléments affichés

**SUI-02 :** Records récents · Squat à la barre · 62,5 kg · 19 nov. ›
**NOT-06 :** Nouveau record · 19 nov. · « Charge max : 62,5 kg × 8 » · « Le record vient des résultats saisis de la séance Jambes du 19 nov. »

## États à gérer

### Aucun record sur la période

Carte masquée.

## Réponses API attendues

- Records récents dans `GET /api/progress/summary` (US-41)

## Hors périmètre

- Table de records (interdite par RM-051).

## Tâches techniques

- [x] Backend : à la fin d'une séance (US-34) et après correction (US-37) : `readPreviousBestSets(userId, exerciseIds, excludeSessionId)`, comparaison avec `computeExerciseRecords`, création de la notification (`INSERT`, sans doublon)
- [x] Backend : `readRecentRecords(userId, from, to)` pour le Résumé (la carte SUI-02 arrive avec l'US-41)
- [x] Shared : `detectNewRecords(previousSets, sessionSets, profile)` (fonction pure)
- [x] Tests : unitaires `detectNewRecords` (égalité = pas de record, première séance = pas de notification) ; back : notification unique, correction à la baisse

## Definition of Done

- [ ] Code relu et fusionné via pull request
