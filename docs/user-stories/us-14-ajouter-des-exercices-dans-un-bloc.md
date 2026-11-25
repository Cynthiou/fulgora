# US-14 · Ajouter des exercices dans un bloc

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-13, US-08
**Intégration future :** US-16 (réordonner), US-17 (ajouter à une séance existante)
**Branche :** `feat/us-14-block-exercises`
**Maquettes :** A5, A5b, A6, écran 04 états 5 et 5b, écran 05 bouton « Ajouter à une séance »
**Règles :** RM-007, RM-021, RM-024

## User story

En tant qu'utilisateur, je veux choisir des exercices dans le catalogue pour les mettre dans un bloc afin de composer ma séance.

## Pourquoi

On construit sa séance avec les mêmes outils que pour chercher un exercice : recherche, filtres, fiches.

## Règles métier

- Le catalogue s'ouvre en mode sélection : on sélectionne plusieurs exercices d'un coup.
- L'ordre de sélection devient l'ordre des exercices dans le bloc.
- Un même exercice peut être ajouté plusieurs fois (RM-021).
- Seuls les exercices visibles par l'utilisateur et non archivés sont acceptés (RM-007).
- Chaque exercice arrive avec 1 série pré-remplie (voir US-15) et le repos par défaut de 1 min 30.
- 30 exercices au maximum par bloc.
- Depuis le catalogue (hors éditeur), « Ajouter à une séance » propose en MVP seulement « Nouvelle séance libre » ; les exercices arrivent dans un bloc Classique.

## Critères d'acceptation

- « Ajouter des exercices » ouvre « Sélection pour le bloc 1 » avec recherche et filtres (US-08).
- Toucher une carte la sélectionne : fond inversé et numéro d'ordre (1, 2, 3…) ; toucher à nouveau la désélectionne et les numéros se recalent.
- Le lecteur d'écran annonce « Squat, sélectionné, 1 sur 3 ».
- L'œil ouvre la fiche ; la sélection est conservée au retour.
- Le bouton « Ajouter au bloc · 6 » est désactivé à 0 sélection.
- De retour dans le bloc (A6) : « Force · 6 exercices », chaque ligne avec son résumé (« 1 série · 10 rép. · 40 kg »).
- Toucher une ligne ouvre sa configuration (US-15) ; « Retirer » enlève l'exercice avec « Annuler » pendant 5 s.
- Depuis le catalogue en mode normal : « Sélectionner » → « Annuler », compteur, « Tout désélectionner », « Ajouter à une séance » → choix « Nouvelle séance libre · Tu choisiras la date ensuite » → éditeur avec les exercices dans un bloc Classique.

## Éléments affichés

**Titre :** Sélection pour le bloc 1
**Bouton :** Ajouter au bloc · 6
**Mode sélection depuis le catalogue :** « Annuler » · « 3 sélectionnés » · « Tout désélectionner » · « Ajouter à une séance »
**Choix de la séance :** Ajouter 3 exercices · Nouvelle séance libre · « Tu choisiras la date ensuite » · Continuer vers l'éditeur
**Ligne d'exercice :** Développé couché · 1 série · 10 rép. · 40 kg

## États à gérer

### Aucune sélection

Bouton d'ajout désactivé.

### Limite atteinte

Au-delà de 30 exercices dans le bloc : « 30 exercices au maximum par bloc », cartes non sélectionnables.

### Exercice devenu indisponible

Refusé à l'enregistrement (US-23) avec son nom.

## Réponses API attendues

Validation dans la route de l'US-23 :

- Exercice d'un autre utilisateur, archivé ou inexistant : `422`, code `EXERCISE_NOT_AVAILABLE`, avec le nom ou l'identifiant
- Plus de 30 exercices dans un bloc : `400`

## Hors périmètre

- Ajouter à une séance déjà enregistrée (« OU UNE SÉANCE À VENIR », US-17).
- Réordonner par glisser-déposer ⋮⋮ (US-16).
- Créer un exercice personnel depuis la sélection (US-10).

## Tâches techniques

- [ ] Backend : `exerciseRepository.readAvailableExerciseIds(userId, ids)` (avec `query`) : `SELECT id FROM exercise WHERE id IN (?) AND is_archived = FALSE AND (owner_user_id IS NULL OR owner_user_id = ?)`
- [ ] Frontend : `ExerciseListPage` reçoit `selectionMode` (`"block"` ou `"catalog"`) ; `useExerciseSelection` (liste ordonnée d'identifiants, `toggle`, `clear`)
- [ ] Frontend : `components/SelectableExerciseCard.tsx` (`aria-pressed`, libellé « sélectionné, 1 sur 3 »)
- [ ] Frontend : `components/SessionDestinationSheet.tsx` (MVP : nouvelle séance libre seulement)
- [ ] Frontend : sélection transmise à l'éditeur par l'état de navigation ; reducer `addExercises(blockIndex, exercises)` crée 1 série pré-remplie selon le profil (US-15)
- [ ] Frontend : `components/BlockExerciseRow.tsx` avec `formatSetSummary` (shared)
- [ ] Tests : unitaires : `useExerciseSelection` (ordre, recalage des numéros)
- [ ] Tests : back (dans US-23) : exercice personnel d'un autre → 422, archivé → 422
- [ ] Tests : E2E : bloc → sélection de 3 exercices → retour, ordre respecté ; catalogue → Sélectionner → Ajouter à une séance → éditeur

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Sélection utilisable au clavier et au lecteur d'écran
- [ ] Code relu et fusionné via pull request
