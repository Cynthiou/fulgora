# US-08 · Chercher et filtrer

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-07
**Intégration future :** US-14 (mêmes filtres en mode sélection)
**Branche :** `feat/us-08-exercise-filters`
**Maquettes :** écran 04, états 2, 3 et 4
**Règles :** RM-007

## User story

En tant qu'utilisateur, je veux chercher un exercice par son nom et filtrer par groupe, matériel et difficulté afin de le trouver vite.

## Pourquoi

175 exercices, c'est trop pour faire défiler. À la salle, on cherche « squat » ou « tout ce qui se fait avec des haltères ».

## Règles métier

- La recherche porte sur le nom de l'exercice.
- Trois filtres : Groupe (8 choix), Matériel (10 choix), Difficulté (3 choix).
- Plusieurs choix sont possibles dans un même filtre : un exercice correspond s'il a **au moins un** des choix (OU).
- Les filtres se combinent entre eux : un exercice doit correspondre à **tous** les filtres actifs (ET).
- Le filtrage est immédiat, sans bouton « Appliquer ».
- Les caractères `%` et `_` tapés dans la recherche sont cherchés tels quels.

## Critères d'acceptation

- La liste se met à jour pendant la saisie, 300 ms après la dernière frappe.
- Le terme recherché est en gras dans le nom.
- « × » dans le champ efface la recherche.
- Groupe, Matériel et Difficulté déplient chacun une grille sous la recherche ; un seul déplié à la fois ; un nouvel appui le replie.
- Le nombre de choix actifs s'affiche sur le bouton du filtre.
- Une tuile active a une bordure épaisse, une coche et un libellé en gras (pas seulement la couleur).
- Les filtres actifs apparaissent en étiquettes sous la recherche ; « × » retire un filtre, « Tout effacer » les retire tous.
- « 3 résultats pour « squat » · Jambes » s'affiche et est annoncé aux lecteurs d'écran.
- Sans résultat : message avec le terme, « Effacer la recherche » et, seulement si un filtre est actif, « Réinitialiser les filtres ».
- Recherche et filtres sont gardés dans l'adresse : le retour depuis une fiche et le rechargement les conservent.

## Éléments affichés

**Champ :** Rechercher un exercice
**Boutons filtres :** Groupe · Matériel · Difficulté
**Grille Groupe :** Abdominaux · Bras · Cardio · Dos · Épaules · Étirements · Jambes · Pectoraux · bouton « Effacer le groupe »
**Compteur :** « 18 résultats »
**Lien :** Tout effacer

**Aucun résultat :**

> Aucun exercice trouvé pour « squaat »
> Vérifie l'orthographe ou retire un filtre.
> Boutons « Effacer la recherche » · « Réinitialiser les filtres »

## États à gérer

### Recherche avec résultats

Compteur et terme en gras.

### Aucun résultat

Message avec le terme saisi.

### Chargement

Recherche et filtres restent utilisables.

### Erreur

Comme l'US-07, recherche et filtres conservés.

## Réponses API attendues

- Liste filtrée : `200`
- Recherche de plus de 60 caractères, identifiant de filtre invalide, difficulté inconnue : `400`
- `GET /api/categories`, `GET /api/equipments` : `200` + liste

## Hors périmètre

- Recherche dans les instructions ou les muscles.
- Tri autre que par nom.

## Tâches techniques

- [ ] Backend : `readExercises` et `countExercises` : ajouter des morceaux de SQL **constants**, seulement si le filtre est fourni : `AND e.name LIKE ? ESCAPE '\\'` ; `AND EXISTS (SELECT 1 FROM exercise_category ec WHERE ec.exercise_id = e.id AND ec.category_id IN (?))` ; idem matériel avec `exercise_equipment` ; `AND e.difficulty IN (?)`
- [ ] Backend : utiliser `query` (et non `execute`) pour ces deux fonctions, à cause des tableaux dans `IN (?)`
- [ ] Backend : échapper `\`, `%` et `_` dans la recherche avant de l'entourer de `%`
- [ ] Backend : `exerciseRepository.readCategories`, `readEquipments` ; routes `GET /api/categories`, `GET /api/equipments`
- [ ] Shared : `exerciseQuerySchema` : `search` 0 à 60, `category_ids` / `equipment_ids` tableaux d'entiers positifs (10 max), `difficulties` dans l'énumération
- [ ] Shared : `escapeLike(text)` (fonction pure)
- [ ] Frontend : `features/exercise/components/ExerciseSearch.tsx`, `FilterToggle.tsx`, `FilterGrid.tsx` (tuiles icône + libellé), `ActiveFilterChips.tsx`
- [ ] Frontend : `hooks/useDebouncedValue.ts` (300 ms)
- [ ] Frontend : filtres lus et écrits avec `useSearchParams`
- [ ] Frontend : `HighlightedText.tsx` (terme en gras, sans `dangerouslySetInnerHTML`)
- [ ] Frontend : compteur dans une zone `aria-live="polite"`
- [ ] Tests : unitaires : `escapeLike`, `HighlightedText`
- [ ] Tests : back : « squat » ; « % » ne renvoie pas tout ; deux groupes (OU) ; groupe + matériel (ET) ; difficulté inconnue → 400
- [ ] Tests : E2E : filtrer, ouvrir une fiche, revenir → filtres et position conservés ; axe avec un filtre déplié

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États résultats, aucun résultat, chargement et erreur testés
- [ ] Grilles utilisables au clavier (Tab, Entrée, Espace)
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
