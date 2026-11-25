# US-13 · Ajouter un bloc

EPIC 3 · Séances modèles

**Taille :** S (2 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 03
**Dépendance principale :** US-12
**Intégration future :** US-43 (blocs chronométrés), US-17 (changer le type)
**Branche :** `feat/us-13-session-blocks`
**Maquettes :** A3, A4, A8
**Règles :** RM-019, RM-020, RM-024

## User story

En tant qu'utilisateur, je veux organiser ma séance en blocs afin de séparer l'échauffement, le travail et le retour au calme.

## Pourquoi

Une séance se pense en parties : on s'échauffe, on travaille, on s'étire. Les blocs reproduisent cette organisation.

## Règles métier

- En MVP, 5 types sont disponibles : Classique, Échauffement, Étirements, Défi, Note. Ils fonctionnent tous comme un bloc Classique, seule l'étiquette change (RM-019).
- Circuit, AMRAP et For Time sont affichés mais indisponibles (« Bientôt ») : ils arrivent avec l'US-43.
- Un bloc Note contient un texte libre et aucun exercice (RM-020).
- Plusieurs blocs du même type sont possibles (RM-020).
- L'intitulé est facultatif ; sans intitulé, on affiche « Classique · Bloc 1 ».
- 20 blocs au maximum.
- L'ordre des blocs est l'ordre d'affichage (RM-024).

## Critères d'acceptation

- « Ajouter un bloc » ouvre le panneau « Type de bloc » avec les 8 types et leur description.
- Choisir un type ajoute un bloc vide et ouvre son écran (A4).
- Le bloc affiche « Bloc 1 · Haut du corps », « Intitulé (facultatif) », « Changer », « Exercices · 0 exercice », « Ajouter des exercices », « Enregistrer le bloc ».
- Un bloc Note affiche un champ texte (2 000 caractères max) à la place des exercices.
- Dans le résumé (A8), « Retirer » supprime le bloc et propose « Annuler » pendant 5 secondes.
- Avec 20 blocs, « Ajouter un bloc » est désactivé avec l'explication « 20 blocs au maximum ».

## Éléments affichés

### Panneau « Type de bloc »

- Classique · Exercices et séries, avec objectifs et repos
- Circuit · Exercices enchaînés, nombre de tours (Bientôt)
- AMRAP · Maximum de tours dans une durée fixe (Bientôt)
- For Time · Travail fixe, le plus vite possible (Bientôt)
- Échauffement · Mise en route
- Étirements · Retour au calme
- Défi · Objectif ponctuel
- Note · Texte libre

### Bloc vide

**Champ :** Intitulé (facultatif) (Ex. Force) · **Lien :** Changer
**Texte :** 0 exercice · « Choisis tes exercices dans le catalogue. »
**Boutons :** Ajouter des exercices · Enregistrer le bloc

### Retrait

Toast « Bloc retiré » + bouton « Annuler » (5 s)

## États à gérer

### Type indisponible

Tuile grisée avec « Bientôt » en texte, non sélectionnable, annoncée comme indisponible.

### Bloc Note

Pas de section Exercices.

## Réponses API attendues

Validation dans la route de l'US-23 :

- Bloc Note avec exercices : `400`
- Type inconnu ou chronométré : `400`
- Plus de 20 blocs : `400`

## Décisions

- **D-03** : en MVP, « Changer » n'est proposé que sur un bloc vide. Le changement de type d'un bloc rempli est traité par l'US-17.

## Hors périmètre

- Blocs chronométrés (US-43).
- Réordonner par glisser-déposer (US-16) : en MVP, l'ordre est celui de création.

## Tâches techniques

- [ ] Shared : `BLOCK_TYPES` (code, libellé, description, `isAvailable`) dans `shared/session-template.ts`
- [ ] Shared : `sessionDraftSchema` : `block_type` limité aux 5 types MVP, note sans exercice (`superRefine`), 20 blocs max, `name` 0 à 160, `instructions` 0 à 2 000
- [ ] Frontend : `components/BlockTypePicker.tsx` (panneau, une colonne, tuiles indisponibles)
- [ ] Frontend : `components/BlockEditor.tsx` (A4), `components/BlockCard.tsx` (résumé A8)
- [ ] Frontend : `components/UndoToast.tsx` (« Annuler » pendant 5 s, `aria-live`)
- [ ] Frontend : `getBlockLabel(block, index)` (« Classique · Bloc 1 ») dans `shared/`
- [ ] Tests : schéma : note avec exercice refusée, 21 blocs refusés, type `amrap` refusé
- [ ] Tests : front : ajout, retrait + annulation, tuile indisponible non sélectionnable

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Panneau utilisable au clavier, focus rendu au bouton à la fermeture
- [ ] Code relu et fusionné via pull request
