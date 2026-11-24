# US-07 · Parcourir le catalogue

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-44, T-08
**Intégration future :** US-08 (filtres), US-09 (fiche), US-14 (mode sélection)
**Branche :** `feat/us-07-exercise-list`
**Maquettes :** écran 04, états 1, 6 et 7
**Règles :** RM-007, RM-014

## User story

En tant qu'utilisateur, je veux voir la liste des exercices afin de choisir ceux de mes séances.

## Pourquoi

Le catalogue est le point de départ de toute séance : 175 exercices illustrés, classés par groupe musculaire, matériel et difficulté.

## Règles métier

- On voit le catalogue commun et ses propres exercices, jamais les exercices personnels des autres (RM-007).
- Un exercice archivé n'apparaît pas dans le catalogue.
- Tri par nom, de A à Z.
- 20 exercices sont chargés à la fois ; les suivants arrivent en approchant du bas de la liste.
- L'illustration suit le choix Femme / Homme du profil ; si elle manque, on prend l'autre ; si aucune n'existe, un emplacement « Illustration non disponible » (RM-014).

## Critères d'acceptation

- L'onglet Catalogue affiche « 175 exercices » (le total réel) et la liste.
- Chaque carte affiche l'illustration, le nom, « Groupe · Difficulté » et le matériel, et un œil « Fiche ».
- Toute la carte, ou l'œil, ouvre la fiche (US-09).
- En approchant du bas, les 20 suivants se chargent ; « Chargement… » s'affiche en fin de liste ; à la fin, plus rien ne se charge.
- Un exercice personnel d'un autre utilisateur n'apparaît jamais, même en trafiquant la requête.
- Le retour depuis une fiche conserve la position dans la liste.

## Éléments affichés

**Titre :** Catalogue
**Compteur :** « 175 exercices »
**Carte :** illustration · Squat à la barre · « Jambes · Intermédiaire » · « Barre » · œil « Fiche »
**Bouton en haut :** Sélectionner (mode sélection, US-14)

**Erreur :**

> Impossible de charger les exercices
> Vérifie ta connexion internet, puis réessaie.
> Bouton « Réessayer »

## États à gérer

### Chargement de la liste

Cartes grises de la même hauteur que les vraies ; statut annoncé « Chargement des exercices ».

### Chargement progressif

Une seule carte grise ajoutée en bas.

### Erreur de chargement

Message + « Réessayer » ; si l'erreur arrive pendant le chargement progressif, les cartes déjà affichées restent et « Réessayer » remplace la ligne de chargement.

## Réponses API attendues

- Liste : `200` + `{ items, total, next_offset }` (`next_offset` à `null` à la fin)
- Paramètre invalide : `400`
- Pas connecté : `401`

## Hors périmètre

- Recherche et filtres (US-08).
- Fiche (US-09).
- Mode sélection (US-14).
- Créer un exercice personnel (US-10).

## Tâches techniques

- [ ] BDD : s'appuyer sur `exercise`, `exercise_category`, `category`, `exercise_equipment`, `equipment`
- [ ] Backend : `exerciseRepository.readExercises(userId, filters, limit, offset)` : colonnes `id, slug, name, difficulty, image_female_url, image_male_url, (owner_user_id IS NOT NULL) AS is_personal` + sous-requête du premier groupe (`category_name`) + sous-requête du matériel (`GROUP_CONCAT` des noms séparés par « · »), `WHERE (e.owner_user_id IS NULL OR e.owner_user_id = ?) AND e.is_archived = FALSE`, `ORDER BY e.name LIMIT ? OFFSET ?` (limit et offset en chaînes)
- [ ] Backend : `exerciseRepository.countExercises(userId, filters)` : même `WHERE`, `COUNT(*)`
- [ ] Backend : `exerciseActions.browse` : calcule `next_offset` (`offset + 20 < total` sinon `null`)
- [ ] Backend : `exerciseRouter.ts` : `GET /api/exercises` → `authenticate` → `validate({ query: exerciseQuerySchema })` → action
- [ ] Shared : `shared/catalog.ts` : `exerciseQuerySchema` (`offset` ≥ 0, `limit` fixé à 20 côté serveur), type `ExerciseListItem`, `getExerciseImage(exercise, sex)` (choix, autre version, sinon `null`)
- [ ] Frontend : `features/exercise/services/exerciseService.ts` : `readExercises(query)`
- [ ] Frontend : `features/exercise/hooks/useExercises.ts` : premier chargement, `loadMore`, `isLoadingMore`, `hasMore`, erreur
- [ ] Frontend : `features/exercise/components/ExerciseCard.tsx`, `ExerciseCardSkeleton.tsx`
- [ ] Frontend : `features/exercise/pages/ExerciseListPage.tsx` : chargement progressif avec `IntersectionObserver` sur une sentinelle en bas de liste, plus un bouton « Charger plus » de secours (clavier, lecteurs d'écran)
- [ ] Frontend : position de défilement conservée au retour (état gardé dans la page parente ou `sessionStorage` dans un `try/catch`)
- [ ] Routing : `/catalogue`
- [ ] Tests : back : utilisateur A ne voit jamais l'exercice personnel de B ; exercice archivé absent ; `next_offset` exact sur 175 exercices (8 appels, le dernier renvoie `null`)
- [ ] Tests : unitaires : `getExerciseImage` (4 cas)
- [ ] Tests : front : cartes affichées, état d'erreur, chargement suivant au clic sur « Charger plus »
- [ ] Tests : E2E : faire défiler jusqu'au bout ; axe sur les états liste, chargement, erreur

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États chargement, chargement progressif et erreur implémentés et testés
- [ ] Mobile-first 375 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
