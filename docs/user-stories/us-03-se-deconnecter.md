# US-03 · Se déconnecter

EPIC 1 · Compte

**Taille :** S (2 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-02, US-44 (accès au profil par l'avatar)
**Intégration future :** US-28 (séance en cours)
**Branche :** `feat/us-03-logout`
**Maquettes :** PRF-01, PRF-09
**Règles :** DT-02

## User story

En tant qu'utilisateur connecté, je veux me déconnecter afin de protéger mon compte sur un appareil partagé.

## Pourquoi

Le téléphone peut être prêté, ou l'appli ouverte sur l'ordinateur d'une salle. La déconnexion doit être simple et ne rien effacer.

## Règles métier

- La déconnexion efface le cookie de session. Aucune donnée sportive n'est supprimée.
- Une séance en cours reste en cours : elle pourra être reprise à la prochaine connexion.
- Sans séance en cours, la déconnexion est immédiate. Avec une séance en cours, une confirmation est demandée.
- Après la déconnexion, le bouton « retour » du navigateur ne réaffiche pas une page privée.

## Critères d'acceptation

- Le bouton « Se déconnecter » est dans la page Profil (avatar de l'en-tête).
- Sans séance en cours, un appui déconnecte et mène à la page de connexion.
- Avec une séance en cours, une confirmation s'ouvre ; « Annuler » laisse tout tel quel.
- Après la déconnexion, `GET /api/auth/me` répond 401.
- Le retour arrière ne montre pas de page privée.

## Éléments affichés

**Bouton :** Se déconnecter

### Confirmation (séance en cours)

**Titre :** Te déconnecter ?
**Message :** Ta séance en cours restera enregistrée. Tu pourras la reprendre à ta prochaine connexion.
**Actions :** « Se déconnecter » · « Annuler »

## États à gérer

### Déconnexion en cours

Bouton désactivé.

### Erreur API

Le cookie est quand même effacé côté client par la redirection ; message « Déconnexion impossible. Réessaie. » si le serveur ne répond pas, avec « Réessayer ».

## Réponses API attendues

- Déconnexion réussie : `204 No Content`, cookie expiré dans la réponse
- Pas connecté : `401`
- Origine refusée : `403`

## Décisions

- **D-05** : déconnexion confirmée seulement s'il y a une séance en cours, textes de PRF-09 : titre « Une séance est en cours », message « Haut du corps · commencée à 18:34. Si tu te déconnectes, elle restera en cours et tu pourras la reprendre à ta prochaine connexion. », boutons « Se déconnecter » et « Rester connecté ».

## Hors périmètre

- Déconnexion de tous les appareils (impossible avec un JWT simple, voir T-06).
- Suppression du compte (US-06).

## Tâches techniques

- [x] Backend : `authActions.logout` : `clearAuthCookie(res)` avec les mêmes options que la pose, 204
- [x] Backend : `POST /api/auth/logout` → `checkOrigin` → `authenticate` → action
- [x] Frontend : `authService.logout`
- [x] Frontend : `ProfilePage.tsx` (minimale en MVP : pseudo, adresse, bouton) ; bouton Se déconnecter
- [x] Frontend : avant de déconnecter, `readCurrentWorkoutSession` : s'il y a une séance en cours, ouvrir la confirmation
- [x] Frontend : `AuthContext.logout` : vide l'utilisateur et navigue vers `/connexion` avec `replace: true`
- [x] Tests : back : 204, cookie expiré, `/me` ensuite → 401
- [ ] Tests : E2E : déconnexion sans séance ; déconnexion avec séance en cours (confirmation, puis reprise possible après reconnexion)

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement
- [x] Confirmation accessible (focus piégé dans la modale, Échap ferme)
- [x] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
