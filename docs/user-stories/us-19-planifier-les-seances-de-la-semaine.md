# US-19 · Planifier les séances de la semaine

EPIC 4 · Programmes

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 07
**Dépendance principale :** US-18
**Intégration future :** US-20
**Branche :** `feat/us-19-weekly-sessions`
**Maquettes :** PRO-02, PRO-03a, PRO-03b, PRO-03c, PRO-03d
**Règles :** RM-025, RM-027, RM-075

## User story

En tant qu'utilisateur, je veux associer mes séances à des jours et des heures afin que mon programme remplisse mon Planning.

## Pourquoi

Exemple : Jambes le jeudi à 07:00, Fractionné le jeudi à 12:30 et Course le samedi sans heure.

## Règles métier

- Plusieurs séances sont possibles le même jour ; chacune a son heure facultative.
- Ajouter une séance un jour ajoute un rendez-vous par semaine (le total est recalculé et affiché).
- Décocher un jour qui a des séances affiche ce qui sera retiré (séances, blocs, exercices) et le nouveau total.
- Retirer une séance propose « Annuler » quelques secondes ; si c'était la seule du jour, le jour est décoché.
- Il faut au moins une séance pour créer le programme.
- Tant que le programme n'est pas créé, rien n'est dans le Planning : aucun rendez-vous à annuler.

## Critères d'acceptation

- « + Autre séance le lundi » ouvre PRO-03a : nom obligatoire, heure facultative, « Créer et ajouter les exercices » ou « Créer sans exercice pour l'instant ».
- Le message « Ajoute 6 rendez-vous de plus (1 par semaine) : le total passe de 24 à 30. » s'affiche.
- PRO-03b : décocher le samedi affiche « Samedi décoché : 2 séances seront retirées » et le nouveau total.
- Après enregistrement, le bandeau « Samedi retiré · 2 séances supprimées · Annuler » s'affiche.
- Glisser une séance vers la gauche → « Retirer » (PRO-03c) ; « Annuler » la remet (PRO-03d) ; les compteurs se mettent à jour.
- Quand le champ de nom est actif sur mobile, le panneau remonte au-dessus du clavier.

## Éléments affichés

**PRO-03a :** « Le lundi aura 2 séances : « Haut du corps » à 18:30 et celle-ci. » · Créer et ajouter les exercices · Créer sans exercice pour l'instant
**PRO-03b :** « Samedi décoché : 2 séances seront retirées » · « « Cardio » et « Mobilité », avec leurs blocs et exercices. Le programme passe de 24 à 12 rendez-vous. »
**PRO-03d :** « Séance « Mobilité » retirée. » · Annuler

## États à gérer

### Retrait annulable

Toast 5 s, `aria-live`.

## Réponses API attendues

Enregistrées avec le brouillon (US-18).

## Hors périmètre

- Changer un jour après la création (US-20).

## Tâches techniques

- [x] Frontend : `AddSessionOnDaySheet.tsx` (PRO-03a), `EditProgramInfoPage` en mode brouillon (PRO-03b), retrait par glissement + bouton poubelle, `UndoToast`
- [x] Shared : `countProgramAppointments(start, end, sessions)` utilisé pour tous les compteurs
- [x] Tests : unitaires compteurs (24 → 30, 24 → 12) ; front : retrait + annulation, décocher le dernier jour d'une séance

## Definition of Done

- [x] Compteurs vérifiés sur l'exemple de la maquette
- [ ] Code relu et fusionné via pull request
