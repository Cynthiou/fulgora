# US-52 · Filtrer l'historique

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-35, US-48
**Intégration future :** NOT-05 (« Voir l'historique du programme »)
**Branche :** `feat/us-52-history-filters`
**Maquettes :** SUI-05, SUI-05f, SUI-05g, SUI-05v
**Règles :** RM-076, RM-082

## User story

En tant qu'utilisateur, je veux filtrer mon historique par période, programme et statut afin de retrouver vite une séance.

## Pourquoi

Après quelques mois, la liste devient longue : « mes séances manquées de novembre » doit se trouver en deux appuis.

## Ce qui change

L'historique du MVP (US-35) reçoit une pastille de filtres et les flèches ‹ › de période (décision D-07).

## Règles métier

- Période : Semaine ou Mois, avec ‹ › comme dans le Résumé ; « Tout » par défaut.
- Programme : chaque programme, et « Séance libre ».
- Statuts : Faites, Inachevées, À confirmer, Manquées, Annulées (plusieurs possibles).
- Les filtres se combinent ; les chiffres sont les mêmes que le Résumé pour la même période.

## Critères d'acceptation

- La pastille ouvre le panneau (SUI-05f) ; « Afficher » applique ; toucher le fond ferme sans appliquer.
- Les filtres actifs apparaissent en noir avec leur valeur ; ✕ retire un filtre, « Effacer » retire tout (SUI-05g).
- Exemple : novembre, manquées + annulées → 3 séances, comme SUI-02.
- Sans résultat : « Aucune séance pour ces filtres » + « Effacer les filtres » (SUI-05v), distinct de l'historique vide (SUI-07).
- Les filtres sont gardés dans l'adresse.

## Éléments affichés

**SUI-05f :** PÉRIODE · « puis ‹ › sur la liste » · Programme · Statuts · Afficher
**SUI-05v :** « Aucune séance pour ces filtres » · « Aucune séance manquée cette semaine. » · Effacer les filtres

## États à gérer

### Aucun résultat

SUI-05v.

## Réponses API attendues

- `GET /api/history?period=&date=&program_id=&statuses=` : `200` ; valeur invalide : `400` ; programme d'un autre : `404`

## Hors périmètre

- Recherche par nom de séance.

## Tâches techniques

- [x] Backend : `readHistory` et `countHistory` reçoivent des morceaux de SQL constants pour la période, le programme (`a.program_id = ?` ou `a.program_id IS NULL` pour « Séance libre ») et les statuts (avec `query` pour `IN (?)`)
- [x] Shared : `historyQuerySchema`, `getPeriodRange` (US-41)
- [x] Frontend : `HistoryFilterSheet.tsx`, `ActiveFilterChips` (réutilisé de l'US-08), `PeriodNavigator`
- [x] Tests : back : combinaisons, « Séance libre », exemple SUI-05g = 3 ; E2E filtre puis retour arrière

## Definition of Done

- [ ] Code relu et fusionné via pull request
