# US-50 · Muscles travaillés

EPIC 8 · Progression

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-41
**Intégration future :** vue 3D (V3, hors backlog)
**Branche :** `feat/us-50-worked-muscles`
**Maquettes :** SUI-01, SUI-02, SUI-02s
**Règles :** RM-004, RM-078

## User story

En tant qu'utilisateur, je veux voir les muscles que j'ai travaillés sur une période afin d'équilibrer mon entraînement.

## Pourquoi

On a tendance à toujours travailler les mêmes muscles : la carte le rend visible.

## Règles métier

- Séries par muscle : muscle principal = 1 série, secondaire = ½ série, selon le catalogue ; seules les séries validées comptent (RM-078).
- Les exercices cardio et de mobilité ne comptent pas.
- Les muscles non travaillés sont signalés.
- La carte face et dos suit le choix Femme / Homme (RM-004).

## Critères d'acceptation

- Carte « Muscles » : silhouette face et dos, liste des muscles avec leur nombre de séries (« Quadriceps · 15 », « Fessiers · 14,5 »), « non travaillé » pour les autres.
- La règle est écrite sous la carte : « Principal = 1 série, secondaire = ½ série. »
- Exemple SUI-02 : Quadriceps 15 · Fessiers 14,5 · Abdominaux 12,5 · Obliques 7,5 · …
- Les zones de la carte ont un équivalent texte (la liste).

## Éléments affichés

**Carte :** Muscles · Face · Dos · liste · « Principal = 1 série, secondaire = ½ série. Cardio et mobilité non comptés. »

## États à gérer

### Aucune série sur la période
« Aucun muscle travaillé sur cette période. »

## Réponses API attendues

- Inclus dans `GET /api/progress/summary` (US-41)

## Décisions

- **D-19** : « cardio » et « mobilité » sont reconnus par le groupe de l'exercice : Cardio et Étirements ne comptent pas.

## Hors périmètre

- Corps en 3D manipulable (V3).

## Tâches techniques
- [ ] Backend : `readMuscleSets(userId, from, to)` : `SUM(CASE em.role WHEN 'primary' THEN 1 ELSE 0.5 END)` par muscle, sur les séries validées des séances `completed` / `unfinished`, en excluant les groupes cardio et étirements
- [ ] Frontend : `MuscleMapCard.tsx` (SVG face / dos, zones par code de muscle, intensité + liste texte)
- [ ] Tests : back : exemple SUI-02 reproduit ; série non validée ignorée

## Definition of Done
- [ ] Exemple SUI-02 vérifié
- [ ] Code relu et fusionné via pull request
