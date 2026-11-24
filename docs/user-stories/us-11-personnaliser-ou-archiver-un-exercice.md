# US-11 · Personnaliser ou archiver un exercice

EPIC 2 · Catalogue

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-10
**Intégration future :** US-39 (progression sur l'exercice d'origine ou sa copie)
**Branche :** `feat/us-11-customize-archive-exercise`
**Maquettes :** non maquetté (voir À PRÉCISER)
**Règles :** RM-011, RM-012, RM-013

## User story

En tant qu'utilisateur, je veux adapter un exercice du catalogue ou archiver un des miens afin de garder un catalogue à mon goût.

## Pourquoi

On peut vouloir changer les instructions d'un exercice, ou retirer de sa liste un exercice qu'on ne fait plus, sans perdre son historique.

## Règles métier

- Personnaliser un exercice commun crée une **copie personnelle** ; l'exercice commun n'est jamais modifié (RM-013). La copie garde le lien vers l'original (`source_exercise_id`).
- Un exercice personnel **jamais utilisé** dans une séance réalisée se modifie directement.
- Un exercice personnel **déjà utilisé** dans une séance réalisée : la modification crée une nouvelle copie, l'ancien est archivé (RM-012).
- Archiver retire l'exercice du catalogue et de la sélection, mais il reste dans l'historique et la progression (RM-011).
- Un exercice commun ne s'archive pas (on peut seulement archiver sa copie).
- Un exercice archivé peut être désarchivé.

## Critères d'acceptation

- La fiche d'un exercice commun propose « Personnaliser » ; celle d'un exercice personnel « Modifier » et « Archiver ».
- Personnaliser ouvre le formulaire de l'US-10 pré-rempli ; à l'enregistrement, une copie personnelle apparaît.
- Modifier un exercice déjà fait affiche « Cet exercice est dans ton historique : une nouvelle version sera créée, l'ancienne reste dans tes séances passées. »
- Archiver demande confirmation ; l'exercice disparaît du catalogue ; l'historique l'affiche toujours.
- Un filtre « Archivés » permet de le retrouver et de le désarchiver.

## Éléments affichés

**Boutons :** Personnaliser · Modifier · Archiver · Désarchiver
**Confirmation d'archivage :** « Archiver « Mon tirage élastique » ? Il n'apparaîtra plus dans le catalogue, mais restera dans tes séances passées. » · Archiver · Annuler

## États à gérer

### Exercice déjà utilisé
Avertissement avant modification.

### Archivé
Badge « Archivé » sur la fiche.

## Réponses API attendues

- Copie créée : `201` ; modifié : `200` ; archivé / désarchivé : `200`
- Modifier ou archiver un exercice commun : `422`, code `COMMON_EXERCISE_READ_ONLY`
- Exercice d'un autre : `404`

## Décisions

- **D-15** : écrans à faire maquetter en première tâche.
- **D-16** : les séances prévues qui utilisent l'ancien exercice gardent l'exercice d'origine ; seules les nouvelles préparations utilisent la copie.

## Hors périmètre

- Supprimer définitivement un exercice.

## Tâches techniques
- [ ] Design : faire maquetter les écrans de cette US (Claude Design) et les faire valider avant tout code
- [ ] Backend : `countExerciseUsage(exerciseId)` : séries réalisées (`workout_exercise` lié à une séance `completed` ou `unfinished`)
- [ ] Backend : `copyExercise` (exercice + liaisons + textes, dans `withTransaction`), `updateExercise`, `archiveExercise`, `unarchiveExercise`
- [ ] Backend : routes : `POST /api/exercises/:id/customize`, `PUT /api/exercises/:id`, `PATCH /api/exercises/:id/archive`, `PATCH /api/exercises/:id/unarchive`
- [ ] Frontend : boutons sur `ExerciseDetailPage`, réutilisation du formulaire de l'US-10, filtre « Archivés »
- [ ] Tests : back : commun jamais modifié ; personnel non utilisé modifié en place ; personnel utilisé → copie + ancien archivé ; archivé absent du catalogue mais présent dans l'historique

## Definition of Done
- [ ] Maquettes validées avant le développement
- [ ] Code relu et fusionné via pull request
