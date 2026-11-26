# US-43 · Ajouter un bloc chronométré (Circuit, AMRAP, For Time)

EPIC 3 · Séances modèles

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 13
**Dépendance principale :** US-13
**Intégration future :** US-31 (minuteur de bloc)
**Branche :** `feat/us-43-timed-blocks`
**Maquettes :** A3, C4 (bloc Circuit)
**Règles :** RM-019, RM-042

## User story

En tant qu'utilisateur, je veux ajouter un bloc Circuit, AMRAP ou For Time afin de varier mes formats d'entraînement.

## Pourquoi

Ces formats sont très utilisés en préparation physique : enchaîner les exercices plutôt que série par série.

## Règles métier

- **Circuit** : exercices enchaînés, un nombre de tours prévu (`planned_rounds`, 1 à 50).
- **AMRAP** : le plus de tours possible dans une durée fixe (`time_limit_seconds`, 1 min à 2 h).
- **For Time** : un travail fixé, fait le plus vite possible ; une durée limite facultative.
- Dans ces blocs, chaque exercice a **un seul objectif par tour** (une série prévue = l'objectif d'un tour).
- Pas de repos par série dans un bloc chronométré : un repos facultatif entre les tours.

## Critères d'acceptation

- Les tuiles Circuit, AMRAP et For Time deviennent disponibles dans « Type de bloc ».
- Circuit : champ « Nombre de tours » obligatoire ; AMRAP : « Durée » obligatoire ; For Time : « Durée limite (facultatif) ».
- C4 affiche le bloc avec ses exercices et « objectif à régler » tant qu'un objectif manque.
- Le résumé affiche « Circuit · 3 tours · 4 exercices », « AMRAP · 12 min », « For Time ».

## Éléments affichés

**C4 :** Bloc Circuit · Nombre de tours · exercices « objectif à régler » · Valider le bloc
**Résumés :** Circuit · 3 tours · AMRAP · 12 min · For Time

## États à gérer

### Objectif manquant

« objectif à régler » sur l'exercice, « Valider le bloc » désactivé.

## Réponses API attendues

- Circuit sans tours, AMRAP sans durée : `400`

## Décisions

- **D-06** : pendant la séance, un bloc chronométré enregistre un total (tours terminés, répétitions en plus, durée), pas un résultat par tour.

## Hors périmètre

- Minuteur et saisie pendant la séance (US-31).

## Tâches techniques

- [x] Shared : `BLOCK_TYPES` : `isAvailable` à vrai pour les 3 types ; `sessionDraftSchema` : règles propres à chaque type (`superRefine`)
- [x] Backend : `createTemplateBlock` enregistre `planned_rounds` et `time_limit_seconds`
- [x] Frontend : `TimedBlockSettings.tsx` ; `formatBlockSummary`
- [x] Tests : schéma : circuit sans tours → refusé ; AMRAP sans durée → refusé ; for_time sans durée → accepté

## Definition of Done

- [ ] Code relu et fusionné via pull request
