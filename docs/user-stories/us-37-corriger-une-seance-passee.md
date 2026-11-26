# US-37 · Corriger une séance passée

EPIC 7 · Historique

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-36, US-32
**Intégration future :** US-40 (records recalculés)
**Branche :** `feat/us-37-correct-results`
**Maquettes :** SUI-06 (« Corriger les résultats »), B6, CAL-07d
**Règles :** RM-047, RM-048, RM-049, RM-051, RM-080

## User story

En tant qu'utilisateur, je veux corriger une valeur ou ajouter un oubli afin que mon historique soit exact.

## Pourquoi

Une faute de frappe (80 kg au lieu de 60) fausse toute la progression et les records.

## Ce qui change

Le bouton « Corriger les résultats », masqué en MVP, apparaît sur SUI-06, B6 et CAL-07d.

## Règles métier

- Seules les séances terminées ou inachevées se corrigent (RM-047).
- On corrige les valeurs réalisées ; le prévu copié ne change jamais.
- On peut renseigner une série oubliée (non faite) et ajouter une série ou un exercice oublié.
- Seuls les éléments ajoutés par l'utilisateur peuvent être supprimés (RM-048).
- La première date de validation est conservée ; la date de correction est enregistrée à part (RM-049).
- Les records et la progression sont recalculés à partir des résultats ; un record corrigé à la baisse n'est plus affiché (RM-051, RM-080).

## Critères d'acceptation

- « Corriger les résultats » ouvre la séance en mode correction (mêmes écrans que la saisie, bandeau « Correction »).
- Modifier une série validée met à jour le réalisé ; `updated_at` est rempli, `validated_at` inchangé.
- Renseigner une série non faite la valide (`validated_at` = maintenant).
- « Enregistrer les corrections » revient au détail avec « Résultats corrigés. ».
- Le prévu affiché ne change pas.

## Éléments affichés

**Bandeau :** Correction · « Les objectifs prévus ne changent pas. »
**Boutons :** Enregistrer les corrections · Annuler
**Succès :** Résultats corrigés.

## États à gérer

### Rien n'a changé

« Enregistrer » inactif.

### Erreur

Message, saisies conservées.

## Réponses API attendues

- Corrigé : `PUT /api/workout-sets/:id/correction` → `200`
- Séance en cours : `409` (passer par US-29)
- Supprimer un élément prévu : `422`
- D'un autre : `404`

## Décisions

- **D-18** : pas de distinction entre un élément ajouté pendant la séance et un élément ajouté après coup : les deux sont « ajoutés » (provenance vide) et peuvent être supprimés.

## Hors périmètre

- Modifier le prévu (US-17).

## Tâches techniques

- [x] Backend : `correctWorkoutSet` : `_actual`, `validated_at = COALESCE(validated_at, NOW(3))`, `updated_at = NOW(3)` ; contexte : séance `completed` ou `unfinished` de l'utilisateur
- [x] Backend : ajout et suppression réutilisent US-32 avec le statut de séance terminé autorisé
- [x] Backend : après correction, recalcul des records (US-40) : notification de record supprimée si le record n'existe plus (fait avec l'US-40)
- [x] Frontend : `WorkoutPage` en mode `correction` ; bandeau ; retour au détail
- [x] Tests : back : correction, `validated_at` conservé, `updated_at` rempli, prévu inchangé, séance en cours → 409, record corrigé à la baisse retiré

## Definition of Done

- [ ] Code relu et fusionné via pull request
