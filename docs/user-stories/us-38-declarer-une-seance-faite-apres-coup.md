# US-38 · Déclarer une séance faite après coup

EPIC 7 · Historique

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 09
**Dépendance principale :** US-27, US-28
**Intégration future :** US-41
**Branche :** `feat/us-38-declare-afterwards`
**Maquettes :** CAL-08, CAL-08b, NOT-03, NOT-04
**Règles :** RM-049, RM-050, RM-054, RM-057, RM-058

## User story

En tant qu'utilisateur, je veux enregistrer une séance que je n'ai pas notée sur le moment afin de ne rien perdre.

## Pourquoi

On a fait la séance sans l'appli : elle doit compter quand même.

## Règles métier

- Possible pour une séance à confirmer ou manquée, sans limite de temps (RM-054).
- Le contenu vient de la version d'origine de la séance (RM-058).
- La date réelle est saisie à part ; la date prévue reste (RM-050).
- Les valeurs sont pré-remplies avec le prévu mais **pas validées** : « À vérifier ». Une série non confirmée reste non réalisée.
- « Tout s'est passé comme prévu » valide tout d'un coup.
- Après enregistrement : séance « Effectuée » (terminée), mention « déclarée après coup », notification manquée ou à confirmer marquée lue (RM-057).
- La date de validation est le moment de la saisie (RM-049).

## Critères d'acceptation

- « Je l'ai faite » ouvre CAL-08b avec la date réelle (pré-remplie : date prévue) et les exercices « 3 séries prévues · à vérifier ».
- Ouvrir un exercice permet de confirmer ou modifier chaque série.
- « Tout s'est passé comme prévu » confirme toutes les séries.
- « Enregistrer » → résumé B6 avec « déclarée après coup ».
- La séance apparaît dans l'historique à sa date réelle.

## Éléments affichés

**CAL-08b :** Déclarer une séance après coup · Date réelle · « Exercices · 3 séries prévues chacun » · « à vérifier » · « Non renseigné » · Tout s'est passé comme prévu · Enregistrer
**Résumé :** « Déclarée après coup »

## États à gérer

### Aucune série confirmée

« Enregistrer » demande : « Aucune série n'est confirmée. Enregistrer quand même comme inachevée ? »

## Réponses API attendues

- Enregistré : `POST /api/appointments/:id/declare-done` → `201`
- Statut incompatible : `409`
- Date réelle dans le futur : `400`

## Hors périmètre

- Déclarer une séance qui n'était pas prévue (créer d'abord une séance libre à la date passée, US-23).

## Tâches techniques

- [ ] Backend : `declareDone` dans `withTransaction` : verrou, statut, `createWorkoutSession` avec `started_at` déclaré et statut `completed` (ou `unfinished`), copie du prévu (US-28), mise à jour des séries confirmées, rendez-vous `attended`, notifications lues
- [ ] Backend : colonne ou drapeau « déclarée après coup » : à décider (proposition : `workout_session.declared_afterwards BOOLEAN`, migration)
- [ ] Frontend : `DeclareAfterwardsPage.tsx` (CAL-08b)
- [ ] Tests : back : séance créée à la date réelle, séries non confirmées non validées, notifications lues, déjà effectuée → 409

## Definition of Done

- [ ] Code relu et fusionné via pull request
