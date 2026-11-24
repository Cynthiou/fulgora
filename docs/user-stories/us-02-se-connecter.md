# US-02 · Se connecter

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-01
**Intégration future :** US-03, US-44
**Branche :** `feat/us-02-login`
**Maquettes :** écran 02, états 1 à 5
**Règles :** RM-002, DT-01, DT-02, DT-07

## User story

En tant qu'utilisateur inscrit, je veux me connecter avec mon pseudo ou mon adresse e-mail afin de retrouver mes séances et mes programmes.

## Pourquoi

À la salle, il faut retrouver ses données vite, sur n'importe quel appareil. Le pseudo est plus court à taper que l'adresse e-mail.

## Règles métier

- On se connecte avec le pseudo **ou** l'adresse e-mail, et le mot de passe (RM-002).
- Le message d'erreur ne dit jamais lequel des deux est faux.
- Un compte inconnu et un mot de passe faux répondent de la même façon, en un temps comparable.
- À l'ouverture de l'appli, une session encore valide mène directement à l'Accueil.
- La connexion est gardée 7 jours dans un cookie sécurisé.

## Critères d'acceptation

- Le formulaire affiche « Pseudo ou adresse e-mail » et « Mot de passe ».
- « Entrée » sur le mot de passe envoie le formulaire.
- Un champ vide affiche « Ce champ est obligatoire. » sous le champ.
- Connexion par pseudo réussie → Accueil (ou la page privée demandée avant la connexion).
- Connexion par adresse e-mail réussie, même tapée en majuscules.
- Identifiants faux : un seul message en haut, aucun champ marqué en erreur, pseudo conservé, mot de passe vidé et focus dessus.
- Recharger la page après connexion garde l'utilisateur connecté.
- Ouvrir `/connexion` déjà connecté mène à l'Accueil.
- Pendant l'envoi, le bouton est désactivé.

## Éléments affichés

**Titre :** Se connecter
**Texte :** Retrouve tes séances et tes programmes.
**Champs :** Pseudo ou adresse e-mail * (Ex. lea.m ou nom@exemple.fr) · Mot de passe * (Ton mot de passe)
**Bouton :** Se connecter
**Lien :** Pas encore de compte ? Créer un compte

**Erreur d'identifiants :** « Identifiants incorrects. Vérifie ta saisie et réessaie. »
**Échec réseau :** « Connexion impossible. Réessaie. »
**Trop d'essais :** « Trop de tentatives. Réessaie dans quelques minutes. »

## États à gérer

### Connexion initiale
Formulaire vide, mot de passe masqué.

### Erreur d'identifiants
Message unique en haut, icône + texte + bordure, annoncé aux lecteurs d'écran ; mot de passe vidé, focus dessus.

### Chargement
Bouton désactivé, statut annoncé « Connexion en cours ».

### Échec réseau
Même emplacement que l'erreur, données conservées.

### Session déjà valide
Pas de formulaire : redirection vers l'Accueil.

## Réponses API attendues

- Connexion réussie : `200` + `PublicUser` + cookie
- Champs manquants : `400`, code `VALIDATION_ERROR`
- Identifiants faux (compte inconnu ou mauvais mot de passe) : `401`, code `INVALID_CREDENTIALS`
- Trop de tentatives : `429`
- `GET /api/auth/me` sans session : `401`, code `UNAUTHENTICATED`

## Hors périmètre

- Mot de passe oublié.
- Connexion Google / Apple.
- « Se souvenir de moi » (la durée est fixe : 7 jours).

## Tâches techniques
- [ ] Shared : `loginSchema` : `identifier` (1 à 254 caractères), `password` (1 à 128)
- [ ] Backend : `userRepository.readUserByIdentifier` : `SELECT id, username, email, sex, password_hash FROM user WHERE email = ? OR username = ? LIMIT 1` (même valeur deux fois, mise en minuscules pour l'e-mail)
- [ ] Backend : `userRepository.readUser(id)` : l'utilisateur sans hachage, pour `/me`
- [ ] Backend : `authActions.login` : compte absent → vérifier quand même un hachage factice (même durée de réponse) puis 401 ; mauvais mot de passe → 401 ; sinon cookie + 200
- [ ] Backend : `authActions.readMe` : renvoie l'utilisateur de `req.userId`
- [ ] Backend : `authRouter.ts` (dans `modules/user`) : `POST /api/auth/login` → `checkOrigin` → `authLimiter` → `validate` → action ; `GET /api/auth/me` → `authenticate` → action
- [ ] Frontend : `features/user/services/authService.ts` : `login`, `readMe`
- [ ] Frontend : `features/user/hooks/useLogin.ts`
- [ ] Frontend : `features/user/pages/LoginPage.tsx` : `autocomplete` `username` et `current-password`, e-mail pré-rempli depuis l'inscription (paramètre d'adresse)
- [ ] Frontend : après succès : `AuthContext.login`, retour à la page demandée ou Accueil
- [ ] Routing : `/connexion` (publique)
- [ ] Tests : back : connexion par pseudo, par e-mail en majuscules, mauvais mot de passe → 401, compte inconnu → même 401 et même message, 6ᵉ essai → 429, `/me` sans cookie → 401, réponse sans hachage
- [ ] Tests : front : message unique, mot de passe vidé, double clic = un envoi
- [ ] Tests : E2E : connexion puis rechargement → toujours connectée ; page privée → connexion → retour sur la page privée

## Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement sur la branche
- [ ] États connexion, erreur, chargement et échec réseau implémentés et testés
- [ ] Mobile-first 375 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
