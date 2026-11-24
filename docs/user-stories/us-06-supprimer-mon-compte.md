# US-06 · Supprimer mon compte

EPIC 1 · Compte

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-47, et toutes les tables remplies par les autres US
**Intégration future :** à mettre à jour à chaque nouvelle table liée à l'utilisateur
**Branche :** `feat/us-06-delete-account`
**Maquettes :** PRF-06, PRF-07, PRF-08, PRF-08e, PRF-08s
**Règles :** RM-006, DT-17

## User story

En tant qu'utilisateur, je veux supprimer mon compte afin d'effacer toutes mes données.

## Pourquoi

C'est le droit à l'effacement du RGPD, obligatoire dès que l'appli accueille de vrais comptes.

## Règles métier

- Confirmation en deux temps : la liste de ce qui sera effacé, puis la saisie du mot de passe (RM-006).
- Toutes les données de l'utilisateur sont supprimées dans une seule transaction, dans l'ordre des dépendances (les clés étrangères sont en `RESTRICT`, DT-17). En cas d'échec, rien n'est supprimé.
- Les exercices du catalogue commun ne sont jamais touchés ; les exercices personnels sont supprimés.
- Après la suppression, la session est fermée, sans retour possible dans l'appli.

## Critères d'acceptation

- PRF-07 liste ce qui sera effacé et « Cette action ne peut pas être annulée. » ; « Annuler » revient à PRF-06, « Continuer » ouvre PRF-08.
- PRF-08 demande le mot de passe ; « SUPPRIMER DÉFINITIVEMENT » est inactif tant que le champ est vide, séparé de « Annuler ».
- Mot de passe faux : « ⚠ Mot de passe incorrect. », champ vidé, rien supprimé.
- Erreur réseau : « La suppression n'a pas pu aboutir. Ton compte est intact. »
- Succès : PRF-08s, cookie effacé ; le retour arrière ne réaffiche rien ; la connexion avec ce compte échoue.
- En base, plus aucune ligne liée à l'utilisateur (vérifié table par table).

## Éléments affichés

**PRF-07 :** Supprimer ton compte ? · « La suppression efface définitivement : ton profil et tes préférences ; tes séances, programmes et résultats ; ton historique, tes records et ta progression ; tes exercices personnels. » · « Cette action ne peut pas être annulée. » · Annuler · Continuer
**PRF-08 :** Confirme la suppression · « Saisis ton mot de passe pour supprimer définitivement le compte lucas_m. » · Mot de passe · 🗑︎ SUPPRIMER DÉFINITIVEMENT · Annuler
**PRF-08s :** Compte supprimé · « Tes données ont été effacées. » · Créer un compte · Retour à la connexion

## États à gérer

### Suppression en cours
Boutons désactivés, statut annoncé.

### Échec
Message, compte intact.

### Succès
Écran final, session fermée.

## Réponses API attendues

- Supprimé : `204` + cookie effacé
- Mot de passe faux : `422`, code `WRONG_PASSWORD`
- Trop d'essais : `429`
- Pas connecté : `401`

## Décisions

- **D-05** : la confirmation finale se fait par la saisie du mot de passe (PRF-08).

## Hors périmètre

- Export des données avant suppression.
- Délai de grâce (suppression immédiate).

## Tâches techniques
- [ ] Backend : `accountRepository` : une fonction `DELETE` par table, dans l'ordre : `notification` → `workout_set` → `workout_exercise` → `workout_block` → `workout_session` → `appointment` → `weekly_schedule` → `program_change` → `program` (enfants avant parents, `source_program_id` remis à `NULL` avant) → `planned_set` → `template_block_exercise` → `template_block` → `session_version` → `session_template` → exercices personnels (`exercise_text`, `exercise_category`, `exercise_muscle`, `exercise_equipment`, `exercise_measure`, puis `exercise`, après avoir remis à `NULL` les `source_exercise_id` qui pointent vers eux) → `user`
- [ ] Backend : chaque `DELETE` filtré par l'utilisateur (jointures jusqu'à `owner_user_id`)
- [ ] Backend : `DELETE /api/users/me` (corps : mot de passe) → `checkOrigin` → `authLimiter` → `authenticate` → `validate` → action dans `withTransaction`, puis `clearAuthCookie`
- [ ] Frontend : `DeleteAccountPage.tsx` (PRF-07, PRF-08, PRF-08s) ; `AuthContext.logout` sans retour possible (`replace`)
- [ ] Tests : back : utilisateur avec séances, programmes, notifications et exercices personnels → plus aucune ligne ; un autre utilisateur intact ; mot de passe faux → rien supprimé ; erreur forcée au milieu → rien supprimé
- [ ] Tests : E2E : suppression complète puis tentative de connexion

## Definition of Done
- [ ] Test « aucune ligne restante » couvrant toutes les tables
- [ ] Code relu et fusionné via pull request
