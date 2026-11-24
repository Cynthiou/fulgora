# US-09 · Voir la fiche d'un exercice

EPIC 2 · Catalogue

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 02
**Dépendance principale :** US-07
**Intégration future :** US-14 (« Ajouter à une séance »), US-39 (« Ma progression »)
**Branche :** `feat/us-09-exercise-detail`
**Maquettes :** écran 05, états 1 à 5
**Règles :** RM-004, RM-007, RM-009, RM-010, RM-014

## User story

En tant qu'utilisateur, je veux voir la fiche complète d'un exercice afin de bien l'exécuter.

## Pourquoi

Savoir quels muscles travaillent, comment faire le mouvement et quelles erreurs éviter, c'est ce qui rend l'exercice sûr et efficace.

## Règles métier

- La fiche n'est visible que pour un exercice du catalogue commun ou un exercice personnel de l'utilisateur (RM-007).
- Muscles principaux et secondaires sont séparés (RM-009) ; « Principal » ou « Principaux » selon le nombre.
- Seules les mesures prévues pour l'exercice sont affichées (RM-010).
- Illustration et carte musculaire suivent le choix Femme / Homme (RM-004, RM-014).
- Un exercice personnel sans alternatives n'affiche pas la section « Exercices alternatifs ».

## Critères d'acceptation

- La fiche affiche : nom, illustration, Groupe, Difficulté, Matériel (plusieurs séparés par « · »), carte musculaire face et dos, muscles principaux et secondaires écrits sous l'image, instructions numérotées, erreurs à éviter, exercices alternatifs (texte non cliquable), mesures suivies.
- Le nom, connu depuis la liste, s'affiche dans l'en-tête pendant le chargement.
- Retour ‹ → catalogue, recherche, filtres et position conservés.
- Un exercice personnel affiche le badge « EXERCICE PERSONNEL » et, sans image, « Illustration non disponible ».
- Ouvrir l'adresse d'un exercice personnel d'un autre utilisateur affiche « Exercice introuvable ».
- « Ajouter à une séance » est en bas, fixe, et désactivé tant que la fiche n'est pas chargée.

## Éléments affichés

**Infos :** Groupe · Jambes · Difficulté · Intermédiaire · Matériel · Barre
**Section :** Muscles sollicités · PRINCIPAUX : Quadriceps · Fessiers · SECONDAIRES : Ischio-jambiers · Mollets
**Sections :** Instructions · Erreurs à éviter · Exercices alternatifs · Mesures suivies
**Bouton :** Ajouter à une séance
**Image absente :** « Illustration non disponible » (texte alternatif : « Mon tirage élastique, illustration non disponible »)

**Erreur :**
> Impossible de charger la fiche
> Vérifie ta connexion internet, puis réessaie.
Bouton « Réessayer »

**Introuvable :** « Exercice introuvable » + bouton « Retour au catalogue »

## États à gérer

### Chargement
Nom dans l'en-tête, contenu gris, bouton d'ajout désactivé, statut annoncé.

### Erreur
Message + « Réessayer » ; le retour reste disponible ; bouton d'ajout masqué.

### Exercice personnel sans illustration
Badge + emplacement réservé avec texte visible.

### Introuvable (404)
Message + retour au catalogue.

## Réponses API attendues

- Fiche : `200`
- Identifiant invalide : `400`
- Absent ou personnel d'un autre : `404`, code `NOT_FOUND`
- Pas connecté : `401`

## Hors périmètre

- « Ajouter à une séance » : le bouton mène au choix de la séance (US-14 / US-23).
- Lien « Ma progression » (US-39) : masqué en MVP.
- Modifier ou personnaliser l'exercice (US-11).

## Tâches techniques
- [ ] Backend : `exerciseRepository.readExercise(id, userId)` : même condition de visibilité que US-07
- [ ] Backend : `readExerciseMuscles(id)` (nom + rôle, principaux d'abord), `readExerciseEquipments(id)`, `readExerciseMeasures(id)` (code + libellé), `readExerciseTexts(id)` (`ORDER BY type, position`), `readExerciseCategories(id)` : une fonction = une requête
- [ ] Backend : `exerciseActions.read` : appelle les 6 fonctions l'une après l'autre, 404 si l'exercice est absent
- [ ] Backend : `GET /api/exercises/:id` → `authenticate` → `validate({ params: idParamSchema })` → action
- [ ] Shared : type `ExerciseDetail` ; `formatMuscleRoleLabel(count)` (« Principal » / « Principaux »)
- [ ] Frontend : `exerciseService.readExercise(id)`, `hooks/useExercise.ts`
- [ ] Frontend : `pages/ExerciseDetailPage.tsx` ; composants `MuscleMap.tsx` (image + texte alternatif listant les muscles), `ExerciseTextList.tsx` (`<ol>` pour les instructions), `MeasureList.tsx`
- [ ] Frontend : bouton « Ajouter à une séance » fixe en bas (mène au choix de séance, voir US-14)
- [ ] Routing : `/catalogue/:id` ; nom passé par l'état de navigation pour l'afficher pendant le chargement
- [ ] Tests : back : fiche complète, exercice personnel d'un autre → 404, identifiant texte → 400, mesures limitées à celles de l'exercice
- [ ] Tests : front : principaux / secondaires, section alternatives masquée si vide, image absente
- [ ] Tests : E2E : liste → fiche → retour (filtres conservés) ; axe sur la fiche complète

## Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] États chargement, erreur, introuvable et exercice personnel testés
- [ ] Mobile-first 375 px ; en-tête et bouton du bas fixes
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
