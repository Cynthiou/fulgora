# US-10 · Créer un exercice personnel

EPIC 2 · Catalogue

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-09
**Intégration future :** US-11, US-14 (sélection), US-39 (progression)
**Branche :** `feat/us-10-personal-exercise`
**Maquettes :** écran 05, état 3a (exercice personnel) ; formulaire de création **non maquetté** (voir À PRÉCISER)
**Règles :** RM-007, RM-008, RM-009, RM-010

## User story

En tant qu'utilisateur, je veux créer mon propre exercice afin d'ajouter ce qui manque au catalogue.

## Pourquoi

175 exercices ne couvrent pas tout : un exercice avec élastique, une machine particulière de sa salle.

## Règles métier

- Nom obligatoire (2 à 160 caractères), difficulté obligatoire.
- Au moins un muscle principal ; des muscles secondaires facultatifs (RM-009).
- Au moins un groupe, un matériel facultatif, plusieurs possibles (RM-008).
- Au moins une mesure à suivre : répétitions, charge, durée, distance, vitesse, résistance, inclinaison, calories (RM-010).
- Instructions, erreurs à éviter et alternatives facultatives (10 lignes max chacune).
- Pas d'illustration : la fiche affiche « Illustration non disponible ».
- L'exercice n'est visible que par son créateur (RM-007).
- Un slug unique est généré à partir du nom (avec un suffixe si besoin).

## Critères d'acceptation

- « + Créer un exercice » est accessible depuis le catalogue.
- Le formulaire valide chaque champ avant l'envoi.
- Après création, la fiche s'ouvre avec le badge « EXERCICE PERSONNEL ».
- L'exercice apparaît dans le catalogue, la recherche et les filtres, et dans le mode sélection.
- Un autre utilisateur ne le voit nulle part, même par son adresse.

## Éléments affichés

**Titre :** Nouvel exercice
**Champs :** Nom · Difficulté · Groupe(s) · Matériel · Muscles principaux · Muscles secondaires · Mesures suivies · Instructions · Erreurs à éviter · Alternatives
**Bouton :** Créer l'exercice
**Erreurs :** « Choisis au moins un muscle principal. » · « Choisis au moins une mesure. » · « Ce champ est obligatoire. »

## États à gérer

### Envoi
Bouton désactivé.

### Erreur API
Message + saisie conservée.

## Réponses API attendues

- Créé : `201` + `{ id }`
- Données invalides : `400`
- Muscle, groupe, matériel ou mesure inexistant : `422`

## Décisions

- **D-15** : le formulaire n'est pas maquetté : la première tâche est de le faire dessiner (Claude Design) avec les champs listés, puis de le faire valider.
- Pas de photo personnelle dans cette US.

## Hors périmètre

- Modifier, personnaliser, archiver (US-11).
- Partager un exercice.

## Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Shared : `createExerciseSchema` ; `slugify(name)`
- [ ] Backend : `exerciseRepository.createExercise`, `createExerciseCategories`, `createExerciseMuscles`, `createExerciseEquipments`, `createExerciseMeasures`, `createExerciseTexts` (une fonction = une requête, insertion multiple avec `VALUES ?`)
- [ ] Backend : `readMuscles`, `readMeasures` (listes du formulaire) ; vérification que les identifiants existent
- [ ] Backend : `POST /api/exercises` dans `withTransaction` ; slug unique (`ER_DUP_ENTRY` → suffixe `-2`, `-3`)
- [ ] Frontend : `CreateExercisePage.tsx`, sélecteurs multiples accessibles
- [ ] Tests : back : création complète ; sans muscle principal → 400 ; muscle inexistant → 422 ; invisible pour un autre utilisateur (liste, fiche, sélection)
- [ ] Tests : E2E : créer puis retrouver par la recherche

## Definition of Done
- [ ] Maquette du formulaire validée avant le développement
- [ ] Code relu et fusionné via pull request
