# US-41 · Résumé du suivi (régularité et travail)

EPIC 8 · Progression

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 11
**Dépendance principale :** US-27, US-35, US-48
**Intégration future :** US-50, US-40
**Branche :** `feat/us-41-tracking-summary`
**Maquettes :** SUI-01, SUI-01b, SUI-01c, SUI-02, SUI-02s, SUI-03, SUI-04
**Règles :** RM-076, RM-077, RM-082

## User story

En tant qu'utilisateur, je veux un résumé de ma semaine, de mon mois ou de mon programme afin de savoir si je tiens mon rythme.

## Pourquoi

La régularité est le premier facteur de progrès.

## Ce qui change

L'onglet Suivi s'ouvre maintenant sur « Résumé » ; l'Historique devient le 2ᵉ onglet.

## Règles métier

- Périodes : Semaine (lundi → dimanche), Mois, Programme ; ‹ › change de période (RM-082).
- « Prévues » = tous les rendez-vous de la période, chacun compté une seule fois : faites · inachevées · à confirmer · manquées · annulées · à venir ; la somme = prévues. Les décalées ↷ sont un indicateur à part, jamais ajouté au total (RM-076).
- Les séances à confirmer comptent dans les prévues.
- Travail : séances faites, temps total, tonnage (affiché seulement s'il y a des charges).
- Mois en cours comparé à la même durée du mois précédent, selon la date consultée (le 20 nov. → 1er-20 oct. ; le 31 mars → 1er-28 fév.) ; libellé dynamique ; pas d'écart sur les prévues (RM-077).
- Écarts écrits en texte (« +3 »), jamais par la couleur seule.
- Mode Programme : Assiduité, Objectifs atteints et Progression du programme.

## Critères d'acceptation

- SUI-01 (semaine) : Régularité « 9 prévues » avec la répartition, barre, « ↷ Décalées : 1 · déjà comptées dans leur statut » ; Travail ; Muscles (US-50) ; Records (US-40).
- SUI-02 (mois) : « 21 prévues », écarts « vs 1er-26 oct. » sur faites, temps et tonnage.
- SUI-03 (programme) : « Semaine 4 sur 8 · du 2 nov. au 27 déc. », assiduité « 2 / 3 séances passées faites », objectifs atteints, courbe de l'exercice principal.
- SUI-04 : aucun entraînement → « Ton suivi commencera après ta première séance » + « Voir mon planning ».
- Les chiffres sont identiques à l'Historique et au Planning pour la même période.

## Éléments affichés

**SUI-01 :** Semaine · Mois · Programme ▾ · « 23 → 29 nov. » · Régularité · 9 prévues · faites · inachevées · à confirmer · manquées · annulées · à venir · « ↷ Décalées : 1 » · Travail · séance faite · durée · « Le tonnage n'apparaît qu'avec des charges. »
**SUI-01c :** « Impossible de charger ton suivi » · « Vérifie ta connexion, puis réessaie. » · Réessayer
**SUI-04 :** « Ton suivi commencera après ta première séance » · « Tes séances faites, tes records et les muscles travaillés apparaîtront ici. » · Voir mon planning

## États à gérer

### Chargement

Cartes grises de même taille (SUI-01b).

### Erreur

SUI-01c.

### Vide

SUI-04.

## Réponses API attendues

- `GET /api/progress/summary?period=week|month|program&date=&program_id=` : `200`
- Paramètres invalides : `400` ; programme d'un autre : `404`

## Hors périmètre

- Muscles (US-50), records (US-40).

## Tâches techniques

- [ ] Backend : `countAppointmentsByStatus(userId, from, to, today)` : une requête avec `SUM(CASE …)` pour chaque catégorie (faites = séance `completed`, inachevées = `unfinished`, à venir = `planned` et date ≥ aujourd'hui…) et `SUM(moved_manually)` pour les décalées
- [ ] Backend : `readWorkTotals(userId, from, to)` : séances faites, somme des durées, tonnage (séries validées)
- [ ] Shared : `getPeriodRange(period, date)`, `getComparisonRange(from, consultedDate)` (même durée, plafonnée au dernier jour du mois précédent), `formatDelta(value)`
- [ ] Frontend : `TrackingSummaryPage.tsx`, `PeriodSelector`, `RegularityCard`, `WorkCard`, `ProgramSummaryCards`
- [ ] Tests : unitaires `getComparisonRange` (20 nov., 31 mars, 29 février) ; back : somme des catégories = prévues, décalées non ajoutées, exemple SUI-02 (21 = 9 + 1 + 2 + 2 + 1 + 6)
- [ ] Tests : E2E ; axe sur SUI-01 à SUI-04

## Definition of Done

- [ ] Exemples SUI-01 et SUI-02 reproduits en tests d'intégration
- [ ] Code relu et fusionné via pull request
