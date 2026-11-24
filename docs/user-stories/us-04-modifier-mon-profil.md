# US-04 · Modifier mon profil

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-03 (page Profil)
**Intégration future :** US-07, US-09, US-50 (illustrations et carte musculaire)
**Branche :** `feat/us-04-edit-profile`
**Maquettes :** PRF-01, PRF-02, PRF-02e, PRF-02s, PRF-05, PRF-05b
**Règles :** RM-003, RM-004, RM-014

## User story

En tant qu'utilisateur, je veux modifier mon pseudo et choisir les illustrations Femme ou Homme afin de personnaliser mon appli.

## Pourquoi

Voir des illustrations qui nous ressemblent rend les exercices plus parlants. Le pseudo doit pouvoir changer sans recréer de compte.

## Règles métier

- L'adresse e-mail n'est pas modifiable (RM-003).
- Le pseudo reste unique et suit les règles de l'inscription.
- Le choix Femme / Homme change seulement les illustrations et la carte musculaire ; ni les exercices, ni les objectifs, ni les mesures (RM-004).
- Si l'illustration choisie manque, on affiche l'autre version ; si aucune n'existe, un emplacement avec le nom de l'exercice (RM-014).
- Le choix s'applique partout : catalogue, fiche exercice, séance, Suivi.

## Critères d'acceptation

- PRF-01 affiche le pseudo, l'adresse, « Modifier le profil », les sections PRÉFÉRENCES (Affichage, Sons et minuteurs, Illustrations d'exercice) et COMPTE (Paramètres du compte, Se déconnecter).
- Le retour ‹ ramène à l'onglet d'origine.
- PRF-02 : le champ Pseudo est modifiable ; l'adresse est affichée avec « non modifiable » et un cadenas ; le choix Femme / Homme est un groupe de deux options.
- « Enregistrer » est inactif tant que rien n'a changé.
- Quitter avec des modifications demande « Quitter sans enregistrer ? ».
- Pseudo pris : message sous le champ, focus dessus. Pseudo vide : « Le pseudo est obligatoire. »
- Erreur réseau : bandeau, saisies conservées, « Réessayer ».
- Succès : retour à PRF-01 avec « ✓ Profil enregistré. » pendant 4 secondes.
- PRF-05 montre un exemple (Squat à la barre) qui change selon le choix.

## Éléments affichés

**PRF-01 :** Mon profil · lucas_m · lucas.martin@exemple.fr · Modifier le profil · PRÉFÉRENCES : Affichage (kg · km · indicateur de l'Accueil), Sons et minuteurs (Sons, vibrations, notifications), Illustrations d'exercice (Femme) · COMPTE : Paramètres du compte (Mot de passe, suppression) · Se déconnecter
**PRF-02 :** Modifier les informations du profil · Pseudo (« Visible par toi seul pour l'instant. Doit être unique. ») · Adresse e-mail · non modifiable · Illustrations des exercices : Femme / Homme (« Sert uniquement à choisir les dessins des exercices. Ne change ni les exercices, ni les objectifs, ni les mesures. ») · Annuler · Enregistrer
**Erreurs :** « ⚠ Ce pseudo est déjà utilisé. Choisis-en un autre. » · « Le pseudo est obligatoire. » · « Enregistrement impossible. Vérifie ta connexion puis réessaie. Tes saisies sont conservées. »
**Succès :** ✓ Profil enregistré.
**PRF-05 :** Illustrations · Afficher les illustrations : Femme / Homme · EXEMPLE · SQUAT À LA BARRE · « Les exercices, objectifs et mesures restent les mêmes. Seuls les dessins et la carte musculaire changent. »
**PRF-05b :** « Pas d'illustration pour cet exercice »

## États à gérer

### Sans modification
« Enregistrer » inactif.

### Enregistrement en cours
Bouton désactivé.

### Erreur
Sous le champ (pseudo) ou bandeau (réseau), saisies conservées.

### Succès
Confirmation 4 s, annoncée aux lecteurs d'écran.

## Réponses API attendues

- Profil enregistré : `200` + `PublicUser`
- Données invalides (dont tentative de changer l'e-mail : champ ignoré) : `400`
- Pseudo pris : `409`, code `USERNAME_TAKEN`
- Pas connecté : `401`

## Hors périmètre

- Unités et indicateur d'accueil (US-05).
- Mot de passe et suppression (US-47, US-06).

## Tâches techniques
- [ ] Shared : `updateProfileSchema` : `username` (règles de l'inscription), `sex` (`female` / `male`) ; `email` absent du schéma (`.strict()` refuse le champ)
- [ ] Backend : `userRepository.updateUserProfile(userId, username, sex)` ; `ER_DUP_ENTRY` → 409
- [ ] Backend : `PATCH /api/users/me` → `checkOrigin` → `authenticate` → `validate` → `userActions.updateProfile`
- [ ] Frontend : `ProfilePage.tsx` complète (PRF-01), `EditProfilePage.tsx` (PRF-02), `IllustrationSettingsPage.tsx` (PRF-05)
- [ ] Frontend : après succès, `AuthContext` mis à jour : toutes les images changent sans recharger
- [ ] Frontend : `getExerciseImage` (US-07) utilisé partout avec `user.sex`
- [ ] Routing : `/profil`, `/profil/modifier`, `/profil/illustrations`
- [ ] Tests : back : pseudo modifié, pseudo pris → 409, e-mail envoyé → 400, autre utilisateur jamais modifié
- [ ] Tests : front : Enregistrer inactif sans changement, confirmation de sortie, message 4 s
- [ ] Tests : E2E : passer en Homme → l'illustration du catalogue change

## Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] Groupe Femme / Homme accessible (`radiogroup`)
- [ ] Code relu et fusionné via pull request
