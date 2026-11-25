# US-01 · S'inscrire

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** T-02, T-03, T-04, T-06, T-07
**Intégration future :** US-02 (connexion), US-44 (Accueil)
**Branche :** `feat/us-01-signup`
**Maquettes :** écran 01, états 1 à 5
**Règles :** RM-001, RM-002, DT-01, DT-07

## User story

En tant que visiteur, je veux créer un compte afin de garder mes séances et ma progression.

## Pourquoi

Toutes les données de Fulgora sont personnelles : séances, programmes, résultats. Sans compte, rien ne peut être retrouvé d'une visite à l'autre ni d'un appareil à l'autre.

## Règles métier

- Pseudo, adresse e-mail, mot de passe et acceptation des CGU sont obligatoires (RM-001).
- Le pseudo et l'adresse e-mail sont uniques (sans tenir compte des majuscules).
- Le pseudo fait 3 à 30 caractères : lettres, chiffres, `.`, `_`, `-`.
- L'adresse e-mail est enregistrée en minuscules.
- Le mot de passe fait au moins 8 caractères (128 au plus) et contient au moins un chiffre.
- Le mot de passe est haché avec Argon2id et n'est jamais enregistré, renvoyé ni écrit dans les logs (RM-002, DT-01).
- La date d'acceptation des CGU est enregistrée (`terms_accepted_at`).
- Après l'inscription, la session est ouverte directement : pas besoin de se reconnecter.

## Critères d'acceptation

- Le formulaire affiche Pseudo, Adresse e-mail, Mot de passe et la case CGU, décochée par défaut.
- Le mot de passe est masqué par défaut ; « Afficher » / « Masquer » bascule sa visibilité.
- Les liens CGU et Politique de confidentialité s'ouvrent sans perdre la saisie.
- « Entrée » sur le dernier champ envoie le formulaire.
- Un champ vide affiche « Ce champ est obligatoire. » sous le champ.
- Un pseudo déjà pris affiche « Ce pseudo est déjà utilisé. Choisis-en un autre. »
- Une adresse déjà utilisée affiche « Un compte existe déjà avec cette adresse. » avec le lien « Se connecter », qui ouvre la connexion avec l'adresse pré-remplie.
- Après une erreur, le pseudo, l'adresse et la case restent remplis ; le mot de passe est vidé.
- Le résumé des erreurs en haut est annoncé aux lecteurs d'écran et le focus va sur le premier champ en erreur.
- Pendant l'envoi, le bouton est désactivé et les champs sont en lecture seule (un seul envoi possible).
- Après succès, l'écran « Compte créé » s'affiche, puis l'Accueil.
- En base, le hachage commence par `$argon2id$` et `terms_accepted_at` est rempli.

## Éléments affichés

### Formulaire

**Titre :** Créer mon compte
**Texte :** Crée ton compte pour planifier tes séances et suivre ta progression.
**Champs :** Pseudo * (Ex. lea.m) · Adresse e-mail * (nom@exemple.fr) · Mot de passe * (8 caractères minimum)
**Aide :** 8 caractères minimum, dont un chiffre.
**Case :** J'accepte les Conditions générales d'utilisation et la Politique de confidentialité *
**Bouton :** Créer mon compte
**Lien :** Déjà un compte ? Se connecter

### Messages d'erreur

- Résumé : « 3 champs à corriger. Le compte n'a pas été créé. » (le nombre s'adapte)
- « Ce champ est obligatoire. »
- « Adresse e-mail invalide. »
- « 8 caractères minimum, dont un chiffre. »
- « Ce pseudo est déjà utilisé. Choisis-en un autre. »
- « Un compte existe déjà avec cette adresse. Se connecter »
- « Pour ta sécurité, ressaisis ton mot de passe. »
- « Tu dois accepter les conditions pour créer ton compte. »

### Succès

**Titre :** Compte créé
**Texte :** Bienvenue lea.m. Ton compte est prêt.

## États à gérer

### Formulaire vide

Bouton actif ; la validation se fait à l'envoi.

### Erreur de validation

Résumé en haut + message sous chaque champ, icône + texte + bordure (jamais la couleur seule). Mot de passe vidé.

### Inscription en cours

Bouton « Création du compte… » désactivé, champs en lecture seule, statut annoncé « Création du compte en cours ».

### Échec réseau

« Connexion impossible. Réessaie. » en haut, données conservées.

### Succès

Écran « Compte créé », puis Accueil.

## Réponses API attendues

- Compte créé : `201 Created` + `{ id, username }` + cookie de session
- Données invalides : `400`, code `VALIDATION_ERROR`
- Pseudo déjà pris : `409`, code `USERNAME_TAKEN`, champ `username`
- Adresse déjà utilisée : `409`, code `EMAIL_TAKEN`, champ `email`
- Trop de tentatives : `429`, code `TOO_MANY_REQUESTS`
- Requête venue d'un autre site : `403`, code `FORBIDDEN_ORIGIN`

## Hors périmètre

- Vérification de l'adresse e-mail par lien.
- Connexion Google / Apple.
- Mot de passe oublié.
- Pages CGU et Politique de confidentialité (contenu à rédiger à part).

## Tâches techniques

- [x] BDD : utiliser `user` avec `terms_accepted_at` (migration 004) ; unicité par `uq_user_username` et `uq_user_email`
- [x] Shared : `shared/user.ts` : `signupSchema` (règles ci-dessus, `terms_accepted` doit valoir `true`) et type `PublicUser` (sans hachage)
- [x] Backend : `userRepository.createUser` : `INSERT INTO user (username, email, password_hash, terms_accepted_at) VALUES (?, ?, ?, NOW(3))`
- [x] Backend : ne pas faire de `SELECT` avant l'`INSERT` pour tester l'unicité : laisser l'index refuser (deux inscriptions simultanées) et lire `ER_DUP_ENTRY` pour savoir quel index (`uq_user_username` ou `uq_user_email`) a refusé
- [x] Backend : `userActions.create` : hacher, créer, poser le cookie (`setAuthCookie`), répondre 201 sans le hachage
- [x] Backend : `userRouter.ts` : `POST /api/users` → `checkOrigin` → `authLimiter` → `validate({ body: signupSchema })` → action
- [x] Frontend : `features/user/services/userService.ts` : `createUser(data)`
- [x] Frontend : `features/user/hooks/useSignup.ts` : envoi, `isSubmitting`, erreurs par champ à partir de `ApiError.field`
- [x] Frontend : `features/user/pages/SignupPage.tsx` : formulaire contrôlé, `autocomplete` (`username`, `email`, `new-password`), `type="email"`, bouton Afficher
- [x] Frontend : résumé d'erreurs `role="alert"`, focus sur le premier champ en erreur, mot de passe vidé
- [x] Frontend : après succès : `AuthContext.login(user)`, écran « Compte créé », puis Accueil
- [x] Routing : `/inscription` (publique) ; un utilisateur déjà connecté est envoyé vers l'Accueil
- [x] Tests : schéma : mot de passe sans chiffre, 7 caractères, pseudo avec espace, CGU non cochée, e-mail mis en minuscules
- [x] Tests : back : 201 + cookie `httpOnly`, 409 pseudo pris, 409 e-mail pris (même en majuscules), 400 champs vides, hachage `$argon2id$`, réponse sans hachage
- [x] Tests : front : erreurs par champ, mot de passe vidé, double clic = un seul envoi
- [x] Tests : E2E : inscription complète → Accueil ; axe sans violation sur les 5 états
- [x] Sécurité : limiteur de tentatives actif ; aucun mot de passe dans les logs

## Definition of Done

- [ ] Critères d'acceptation vérifiés manuellement sur la branche
- [x] États formulaire, erreur, envoi, échec réseau et succès implémentés et testés
- [ ] Développé en mobile-first : conçu à 375 px puis élargi, vérifié sur tablette et ordinateur
- [ ] Accessibilité : focus visible, erreurs annoncées, zones de 44 px, aucune information par la couleur seule
- [x] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
