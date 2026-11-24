# US-47 · Changer mon mot de passe

EPIC 1 · Compte

**Taille :** S (2 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-04
**Intégration future :** US-06
**Branche :** `feat/us-47-change-password`
**Maquettes :** PRF-06, PRF-06e, PRF-06s
**Règles :** RM-001, RM-002, DT-01, DT-07

## User story

En tant qu'utilisateur, je veux changer mon mot de passe afin de sécuriser mon compte.

## Pourquoi

Un mot de passe peut avoir fuité ou été partagé : il faut pouvoir le changer seul.

## Règles métier

- Mot de passe actuel, nouveau et confirmation sont obligatoires.
- Le mot de passe actuel doit être juste.
- Le nouveau suit les règles de l'inscription (8 caractères minimum, dont un chiffre).
- Le nouveau et la confirmation doivent être identiques.
- Après une erreur, les trois champs sont vidés.
- La session en cours reste ouverte.
- 5 essais par 15 minutes (protection contre la force brute sur le mot de passe actuel).

## Critères d'acceptation

- PRF-06 affiche Pseudo, E-mail, « Créé le · 2 octobre 2026 », la section « Changer le mot de passe » et « Supprimer mon compte ».
- « Changer » est inactif tant que les 3 champs ne sont pas remplis.
- Les mots de passe sont masqués par défaut, avec « Afficher ».
- Chaque erreur s'affiche sous son champ, focus sur le premier en erreur.
- Succès : « ✓ Mot de passe changé. La session en cours reste ouverte. »
- La connexion avec l'ancien mot de passe échoue ensuite ; avec le nouveau, elle réussit.

## Éléments affichés

**Champs :** Mot de passe actuel · Nouveau mot de passe (« Mêmes règles qu'à l'inscription. ») · Confirmer le nouveau mot de passe · bouton Changer
**Erreurs :** « ⚠ Mot de passe actuel incorrect. » · « ⚠ Ne respecte pas les règles de l'inscription. » · « ⚠ Les deux mots de passe ne correspondent pas. »
**Succès :** ✓ Mot de passe changé. · « La session en cours reste ouverte. »

## États à gérer

### Envoi

Bouton désactivé.

### Erreur

Champs vidés, messages sous les champs.

## Réponses API attendues

- Changé : `204`
- Règles non respectées ou confirmation différente : `400`
- Mot de passe actuel faux : `422`, code `WRONG_CURRENT_PASSWORD`, champ `current_password`
- Trop d'essais : `429`

## Décisions

- **D-05** : la date de création du compte est affichée (« Créé le · 2 octobre 2026 », depuis `user.created_at`).

## Hors périmètre

- Mot de passe oublié.
- Déconnexion des autres appareils.

## Tâches techniques

- [ ] Shared : `changePasswordSchema` : 3 champs, règles de l'inscription, `refine` sur l'égalité
- [ ] Backend : `userRepository.readUserPasswordHash(userId)`, `updateUserPassword(userId, hash)`
- [ ] Backend : `PUT /api/users/me/password` → `checkOrigin` → `authLimiter` → `authenticate` → `validate` → action (vérifier, hacher, enregistrer, 204)
- [ ] Frontend : `AccountSettingsPage.tsx` (PRF-06), `ChangePasswordForm.tsx`
- [ ] Tests : back : succès, ancien mot de passe faux → 422, confirmation différente → 400, 6ᵉ essai → 429, l'ancien ne marche plus
- [ ] Tests : front : champs vidés après erreur, bouton inactif

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Aucun mot de passe dans les logs ni dans les réponses
- [ ] Code relu et fusionné via pull request
