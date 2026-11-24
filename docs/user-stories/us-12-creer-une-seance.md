# US-12 · Créer une séance

EPIC 3 · Séances modèles

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-44
**Intégration future :** US-13, US-14, US-15, US-23
**Branche :** `feat/us-12-session-editor`
**Maquettes :** A1, A2, A8, A9
**Règles :** RM-016, RM-018

## User story

En tant qu'utilisateur, je veux créer une séance avec un nom afin de préparer mon entraînement.

## Pourquoi

Une séance préparée, c'est savoir exactement quoi faire en arrivant à la salle.

## Règles métier

- Le nom est obligatoire (1 à 160 caractères).
- Une séance peut être enregistrée sans bloc (RM-018), mais ne pourra pas démarrer tant qu'elle n'a pas d'exercice.
- À l'enregistrement, la séance reçoit sa version 1 (RM-016).
- Quitter l'éditeur avec un brouillon non enregistré demande confirmation.

## Critères d'acceptation

- L'écran « Nouvelle séance » affiche Séance libre, Date (pré-remplie), Heure (facultatif), Nom de la séance, la section Blocs et « Enregistrer la séance ».
- Sans bloc : « 0 bloc » et « Ajoute un premier bloc pour y mettre des exercices. »
- « Enregistrer la séance » sans nom affiche « Ce champ est obligatoire. »
- L'écran A8 résume la séance avant l'enregistrement ; toucher une carte rouvre le bloc.
- Une séance sans exercice affiche l'avertissement « Cette séance n'a pas encore d'exercice : tu ne pourras pas la démarrer. » mais peut être enregistrée.
- Le retour ‹ ou la fermeture de l'onglet avec un brouillon non enregistré demande confirmation.

## Éléments affichés

**Titre :** Nouvelle séance · étiquette « Séance libre »
**Champs :** Date · Heure (facultatif) « --:-- » · Nom de la séance (Ex. Haut du corps)
**Section :** Blocs · « 0 bloc » · « Ajoute un premier bloc pour y mettre des exercices. »
**Boutons :** Ajouter un bloc · Enregistrer la séance

### Confirmation de sortie

**Titre :** Quitter sans enregistrer ?
**Message :** Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue.
**Actions :** « Quitter » · « Continuer la séance »

## États à gérer

### Brouillon vide

Un seul appel à l'action : « Ajouter un bloc ».

### Brouillon modifié

Confirmation de sortie active.

## Réponses API attendues

Aucune route propre : l'enregistrement est livré par l'US-23.

## Hors périmètre

- Modifier une séance déjà enregistrée (US-17).
- Séance d'un programme (US-18).

## Tâches techniques

- [ ] Shared : `shared/session-template.ts` : types `SessionDraft`, `DraftBlock`, `DraftExercise`, `PlannedSetValues` ; `sessionDraftSchema` (Zod) avec toutes les bornes (voir US-15)
- [ ] Frontend : `features/session-template/hooks/sessionDraftReducer.ts` : fonction pure, actions `setName`, `setDate`, `setTime`, `addBlock`, `removeBlock`, `restoreBlock`, `moveBlock`, `addExercises`, `removeExercise`, `updateExerciseRest`, `addSet`, `duplicateLastSet`, `updateSet`, `removeSet`
- [ ] Frontend : `features/session-template/hooks/useSessionDraft.ts` (`useReducer` + `isDirty`)
- [ ] Frontend : **Notion à expliquer avant de coder** : `useReducer` (un état complexe modifié par une seule fonction pure, testable sans écran)
- [ ] Frontend : `features/session-template/pages/SessionEditorPage.tsx` (A2), `components/SessionReview.tsx` (A8)
- [ ] Frontend : garde de sortie : `beforeunload` + confirmation sur le retour ‹ (React Router `useBlocker`)
- [ ] Routing : `/seances/nouvelle?date=AAAA-MM-JJ` (plein écran, sans onglets)
- [ ] Tests : reducer : chaque action, ordre conservé, `isDirty`
- [ ] Tests : front : nom obligatoire, avertissement « pas d'exercice », confirmation de sortie

## Definition of Done

- [ ] Reducer couvert par des tests unitaires
- [ ] Confirmation de sortie testée (retour ‹ et fermeture)
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
