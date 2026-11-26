# US-35 · Voir mon historique

EPIC 7 · Historique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 05
**Dépendance principale :** US-28, US-33, US-34
**Intégration future :** US-27 (statut « à confirmer »), US-41 (onglet Résumé), US-39 (onglet Exercices), US-52 (filtres)
**Branche :** `feat/us-35-history-list`
**Maquettes :** SUI-05, SUI-07 (filtres SUI-05f, SUI-05g, SUI-05v : US-52)
**Règles :** RM-050, RM-059, RM-082

## User story

En tant qu'utilisateur, je veux voir la liste de mes séances passées afin de mesurer ma régularité.

## Pourquoi

L'historique répond à « qu'est-ce que j'ai fait, et quand ? », y compris les séances manquées ou annulées, pour une image honnête.

## Règles métier

- L'historique montre les séances terminées, inachevées, à confirmer, manquées et annulées (RM-059).
- Les séances à venir et la séance en cours n'apparaissent pas.
- Classement du plus récent au plus ancien : par **date de réalisation** pour une séance faite ou inachevée, par **date prévue** pour les autres (RM-050, RM-082).
- Regroupement par semaine, du lundi au dimanche (« SEMAINE DU 23 NOV. »).
- Mêmes statuts et mêmes symboles que le Planning, toujours symbole + texte.
- Une séance faite un autre jour que prévu indique « Prévue le 19 » ; une séance déplacée indique « ↷ déplacée du 21 ».
- 20 séances chargées à la fois.
- « Aujourd'hui » est calculé en `Europe/Paris` par le serveur.

## Critères d'acceptation

- L'onglet Suivi ouvre l'Historique (en MVP, les onglets Résumé et Exercices ne sont pas affichés).
- Chaque ligne affiche le jour (« JEU 26 »), le symbole, le nom de la séance, « Statut · Programme » (ou « Séance libre ») et une flèche ›.
- Une séance prévue le 19 et faite le 17 est rangée au 17, avec « Prévue le 19 ».
- Une séance annulée dans le futur n'apparaît pas.
- La séance en cours n'apparaît pas.
- Toucher une ligne ouvre le détail (US-36).
- « Charger plus » (ou le défilement) ajoute les 20 suivantes ; à la fin, plus rien ne se charge.
- Sans aucune séance passée : l'écran SUI-07.
- Une séance d'un autre utilisateur n'apparaît jamais.

## Éléments affichés

**Onglets :** Résumé · Historique · Exercices (seul Historique en MVP)
**Groupe :** SEMAINE DU 23 NOV.
**Lignes :**

- JEU 26 · ✓ Réveil musculaire · Effectuée · Séance libre ›
- MAR 24 · Dos · À confirmer · Séance libre · ↷ déplacée du 21 ›
- SAM 21 · × Course · Manquée · Cardio base ›
- MAR 17 · ✓ Haut du corps · Effectuée · Séance libre · Prévue le 19 ›
- SAM 14 · / Course · Annulée · Cardio base ›

**Vide (SUI-07) :**

> Aucune séance passée
> Tes séances apparaîtront ici dès qu'elles seront faites, manquées ou annulées.

**Erreur :** « Impossible de charger ton historique. » + « Réessayer »

## États à gérer

### Chargement

Lignes grises de la même hauteur.

### Vide

Écran SUI-07.

### Erreur

Message + « Réessayer ».

### Chargement des suivantes

Une ligne grise en bas ; en cas d'erreur, les lignes affichées restent et « Réessayer » apparaît en bas.

## Réponses API attendues

- Liste : `200` + `{ items, has_more }`
- Paramètre invalide : `400`
- Pas connecté : `401`

## Décisions

- **D-07** : les filtres de l'historique (SUI-05f, SUI-05g, SUI-05v) sont traités par l'US-52. En MVP, la liste suffit.

## Hors périmètre

- Onglets Résumé (US-41) et Exercices (US-39).
- Filtres (US-52).
- Passage automatique en « à confirmer » et « manquée » (US-27) : en MVP, une séance passée non faite reste « planifiée » et n'apparaît donc pas.

## Tâches techniques

- [x] Backend : `historyRepository.readHistory(userId, today, limit, offset)` : rendez-vous + nom de séance + programme + séance réalisée (`LEFT JOIN workout_session`) ; condition `ws.status IN ('completed','unfinished') OR (ws.id IS NULL AND a.status IN ('to_confirm','missed','cancelled') AND a.planned_date < ?)` ; colonne calculée `COALESCE(DATE(ws.started_at), a.planned_date) AS history_date` ; `ORDER BY history_date DESC, a.id DESC LIMIT ? OFFSET ?` (en chaînes)
- [x] Backend : vérifier avec `EXPLAIN` que l'index `ix_appointment_calendar` est utilisé (vérifié le 27/11 : `type: ref`, `key: ix_appointment_calendar`)
- [x] Backend : `historyActions.browse` (demande 21 lignes pour savoir s'il en reste : `has_more`)
- [x] Backend : `historyRouter.ts` : `GET /api/history?offset=` → `authenticate` → `validate` → action
- [x] Shared : `shared/history.ts` : `getHistoryStatus(row)` (`completed`, `unfinished`, `to_confirm`, `missed`, `cancelled`), `groupByWeek(rows)` (lundi → dimanche), `formatWeekLabel` (« SEMAINE DU 23 NOV. »), `formatDayBadge` (« JEU 26 »)
- [x] Shared : `todayInParis()` (déjà créé pour US-23)
- [x] Frontend : `features/history/services/historyService.ts`, `hooks/useHistory.ts`
- [x] Frontend : `pages/TrackingPage.tsx` (onglet Suivi, Historique seul en MVP), `components/HistoryWeekGroup.tsx`, `components/HistoryRow.tsx` (avec `StatusBadge`)
- [x] Routing : `/suivi` et `/suivi/historique`
- [x] Tests : unitaires : `getHistoryStatus`, `groupByWeek` (un dimanche reste dans la semaine du lundi précédent), `formatWeekLabel`
- [x] Tests : back : ordre par date réelle (prévue le 19, faite le 17 → rangée au 17) ; séance en cours absente ; annulée future absente ; séance d'un autre absente ; `has_more` exact
- [x] Tests : E2E : historique vide, puis après une séance terminée ; axe sur SUI-05 et SUI-07

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [x] États chargement, vide, erreur et chargement des suivantes testés
- [ ] Mobile-first 375 px
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
