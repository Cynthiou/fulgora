# US-17 · Modifier une séance

EPIC 3 · Séances modèles

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-23, US-24
**Intégration future :** US-18 (séances de programme), US-14 (« Ajouter à une séance à venir »)
**Branche :** `feat/us-17-edit-session`
**Maquettes :** Modifier une séance 1 à 7, B0 à B3, C0 à C3, CAL-04m, CAL-06, CAL-06b, PRO-09
**Règles :** RM-017, RM-029, RM-030, RM-032, RM-058

## User story

En tant qu'utilisateur, je veux modifier une séance déjà planifiée afin de la faire évoluer sans abîmer mon historique.

## Pourquoi

On ajuste ses séances au fil des semaines (plus de charge, un exercice en plus). Les séances passées doivent rester telles qu'elles ont été faites.

## Règles métier

- Toute modification crée une **nouvelle version** ; l'ancienne n'est jamais modifiée ni supprimée (RM-017).
- Séance libre : pas de choix, l'éditeur s'ouvre directement, seule cette séance change.
- Séance de programme : choix de la portée (RM-029, RM-030) :
  - « Cette séance uniquement » : seul ce rendez-vous pointe vers la nouvelle version ;
  - « Cette séance et les suivantes » : ce rendez-vous et les rendez-vous à venir du même programme et de la même séance, **non commencés**, y compris ceux déplacés à la main (ils gardent leur date).
- « Et les suivantes » n'apparaît que s'il reste des séances du même programme à venir.
- Le prévu et les résultats des séances passées, manquées ou réalisées ne sont jamais réécrits (RM-058).
- Une séance démarrée (en cours, terminée, inachevée) ne se modifie pas par ce parcours (voir US-37 pour corriger les résultats).
- Les conséquences sont affichées avant de valider (CAL-06b).
- Changer le type d'un bloc demande confirmation (voir À PRÉCISER).
- Pour changer une date : « Déplacer » (US-25). Pour changer le jour de toutes les semaines : la règle du programme (US-20).

## Critères d'acceptation

- Le menu ⋯ d'une séance prévue (CAL-04m) propose « Modifier la préparation ».
- Séance de programme : l'écran de portée (CAL-06 / PRO-09) affiche les deux choix avec leurs conséquences (« Seul le jeudi 26 novembre change. », « Les 5 séances « Jambes » à venir du programme changent. », « Les séances déjà réalisées ne changent pas. »).
- L'éditeur s'ouvre pré-rempli avec la version actuelle (mêmes écrans que la création).
- Avant de valider, CAL-06b liste les changements (« + Fentes bulgares · 3 × 8 rép. », « Squat à la barre : 4 × 8 → 5 × 5 rép. »), les dates concernées, la séance déplacée qui garde sa date, et les séances non modifiées.
- « Valider » enregistre ; « Revenir » retourne à l'éditeur.
- Après validation, le détail affiche le nouveau contenu ; l'historique des séances passées est inchangé.
- Depuis le catalogue, « Ajouter à une séance » propose aussi « OU UNE SÉANCE À VENIR » : les exercices arrivent dans un nouveau bloc en fin de séance, puis la portée est demandée à l'enregistrement.

## Éléments affichés

**CAL-06 :** Modifier une séance de programme · « Cette séance fait partie du programme Force 8 semaines. » · Cette séance uniquement (« Seul le jeudi 26 novembre change. ») · Cette séance et les suivantes (« Les 5 séances « Jambes » à venir du programme changent. ») · « Les séances déjà réalisées ne changent pas. » · Continuer
**CAL-06b :** liste des changements · dates concernées · « Ven 25 déc (déplacée manuellement : contenu mis à jour, date conservée) » · « Non modifiées : … » · Valider · Revenir
**Succès :** « Séance modifiée. »

## États à gérer

### Rien n'a changé

« Valider » inactif.

### Rendez-vous démarré entre-temps

Il est retiré de la liste avec un message.

### Erreur API

Message, brouillon conservé.

## Réponses API attendues

- Modification enregistrée : `200` + `{ version_id, updated_appointment_ids }`
- Rendez-vous absent ou d'un autre : `404`
- Rendez-vous démarré, effectué ou annulé : `409`, code `APPOINTMENT_NOT_EDITABLE`
- Portée « suivantes » sur une séance libre : `400`

## Décisions

- **D-03** : en changeant le type d'un bloc, les objectifs compatibles avec le nouveau type sont gardés, les autres sont vidés (avec un résumé avant confirmation). Passer en Note est interdit tant que le bloc contient des exercices : message « Retire d'abord les exercices de ce bloc. »

## Hors périmètre

- Corriger les résultats d'une séance faite (US-37).
- Déplacer (US-25), règle hebdomadaire (US-20).

## Tâches techniques

- [x] Backend : `readVersionTree(versionId)` (blocs, exercices, séries) et conversion en `SessionDraft`
- [x] Backend : `GET /api/appointments/:id/session` : la version actuelle en brouillon + `can_apply_to_following` (toujours faux tant qu'il n'y a pas de programme)
- [x] Backend : `readNextVersionNumber(templateId)` ; `createSessionVersion(templateId, n)` et création de l'arbre (fonctions de l'US-23)
- [ ] Backend : `readFollowingAppointments(programId, templateId, fromDate)` : **repoussé à l'US-18**, aucun programme n'existe encore
- [x] Backend : `updateAppointmentsVersion(ids, versionId)` (avec `query` pour `IN (?)`)
- [x] Backend : `PUT /api/appointments/:id/session` (`{ scope, session }`) dans `withTransaction` ; la trace `program_change` attend l'US-18
- [x] Shared : `diffSessionDrafts(before, after)` : liste lisible des changements (CAL-06b), testée
- [x] Frontend : `SessionEditorPage` en mode édition et `SessionChangesPanel` (CAL-06b) ; l'écran de portée (CAL-06 / PRO-09) attend l'US-18
- [ ] Frontend : `SessionDestinationSheet` : section « OU UNE SÉANCE À VENIR » : **repoussé** (US-14)
- [x] Tests : back : nouvelle version créée, ancienne intacte, « cette séance » → 1 rendez-vous, séance démarrée → 409, portée « suivantes » → 400 ; les cas de programme attendent l'US-18
- [x] Tests : unitaires : `diffSessionDrafts`
- [x] Tests : E2E : modifier « Jambes » depuis le menu ⋯, voir les changements, valider ; séance démarrée non modifiable

## Definition of Done

- [x] Critères d'acceptation vérifiés (séance libre ; les critères de programme attendent l'US-18)
- [ ] Code relu et fusionné via pull request
