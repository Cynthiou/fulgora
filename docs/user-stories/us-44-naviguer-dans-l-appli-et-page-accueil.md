# US-44 · Naviguer dans l'appli et page Accueil

EPIC 9 · Socle

**Taille :** L (5 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 01
**Dépendance principale :** US-02, T-07
**Intégration future :** US-24 (Planning), US-28 (reprendre une séance), US-46 (notifications), US-48 (Mes programmes)
**Branche :** `feat/us-44-navigation-home`
**Maquettes :** écran 03 (5 états), PRF-01
**Règles :** RM-066

## User story

En tant qu'utilisateur, je veux passer facilement d'une partie de l'appli à l'autre et voir ma séance du jour dès l'Accueil afin de lancer mon entraînement sans chercher.

## Pourquoi

À la salle, on a le téléphone dans une main. La séance du jour et la reprise d'une séance en cours doivent être à un seul appui.

## Règles métier

- Quatre onglets en bas de l'écran : Accueil, Planning, Suivi, Catalogue (RM-066).
- Le profil s'ouvre par l'avatar de l'en-tête, jamais par un 5ᵉ onglet.
- Les écrans de création et d'entraînement s'affichent sans la barre d'onglets.
- À l'Accueil, une séance en cours passe avant tout : « Reprendre ma séance » remplace « Démarrer ».
- Plusieurs séances le même jour : triées par heure, « Sans heure » en dernier.
- Une seule séance en cours à la fois (RM-040) : « Démarrer » n'est pas proposé sur une autre séance tant qu'une séance est en cours.

## Critères d'acceptation

- Les 4 onglets sont visibles sur toutes les pages principales, avec une icône et un libellé texte.
- L'onglet actif est visible autrement que par la couleur et porte `aria-current="page"`.
- L'avatar ouvre le Profil ; le retour ‹ ramène à l'onglet d'origine.
- Une adresse privée ouverte sans être connecté mène à la connexion, puis revient à cette adresse.
- Une adresse inconnue affiche la page « Page introuvable ».
- L'Accueil affiche la date du jour (« Jeudi 26 novembre »).
- Sans séance aujourd'hui : « Aucune séance prévue » + « Créer ma première séance » (ou « Créer une séance » si l'utilisateur en a déjà).
- Avec une ou plusieurs séances aujourd'hui : un sélecteur « 4 aujourd'hui › » et la carte de la séance choisie (heure, programme, nom, nombre de blocs et d'exercices) avec « ▶ Démarrer la séance ».
- Avec une séance en cours : carte « ● EN COURS », « Commencée à 07:04 · 6 / 11 séries » et « Reprendre ma séance », sélectionnée par défaut.
- Actions rapides : « Créer une séance », « Voir mon planning », « Voir mon historique » (« Créer une séance » est retiré quand c'est déjà l'action principale).
- La section « Mes programmes » affiche « Aucun programme en cours… » en MVP (les programmes arrivent en V1).
- Tout fonctionne au clavier seul.

## Éléments affichés

### Onglets
Accueil · Planning · Suivi · Catalogue

### Accueil, utilisateur débutant
**Section :** Séance du jour
**Texte :** Aucune séance prévue
**Aide :** Crée ta première séance : choisis tes blocs et tes exercices, puis lance-la quand tu veux.
**Bouton :** Créer ma première séance
**Section :** Mes programmes · « Aucun programme en cours. Un programme planifie tes séances sur plusieurs semaines. »
**Actions rapides :** Voir mon planning · Voir mon historique

### Accueil, utilisateur actif
**Sélecteur :** « 4 aujourd'hui › »
**Carte :** 07:00 · FORCE 8 SEM. · S4/8 · Jambes · 1 bloc · 3 exercices
**Bouton :** ▶ Démarrer la séance

### Accueil, séance démarrée
**Carte :** ● EN COURS · Jambes · Commencée à 07:04 · 6 / 11 séries
**Bouton :** Reprendre ma séance

### Erreur
**Titre :** Impossible de charger tes séances
**Texte :** Vérifie ta connexion internet, puis réessaie.
**Bouton :** Réessayer

### Page introuvable
**Titre :** Page introuvable · **Bouton :** Retour à l'accueil

## États à gérer

### Chargement
Blocs gris à l'emplacement du contenu, la structure ne bouge pas ; en-tête et onglets utilisables ; statut annoncé « Chargement de l'accueil ».

### Erreur
Message unique à la place de « Séance du jour » et « Mes programmes » ; actions rapides et onglets restent disponibles.

### Séance du jour sans exercice
Le bouton devient « Ajouter des exercices » (RM-018).

### Séance déjà en cours
« Démarrer » n'apparaît sur aucune autre carte.

## Réponses API attendues

- `GET /api/appointments?from=&to=` : `200` + liste ; plage invalide ou de plus de 62 jours : `400` ; pas connecté : `401`
- `GET /api/workout-sessions/current` : `200` + séance en cours ou `null`

## Décisions

- **D-01** : notifications par une cloche dans l'en-tête (pas de pastille sur l'avatar). En MVP, la cloche n'est pas affichée (elle arrive avec l'US-46).

## Hors périmètre

- Page Planning complète (US-24) : en MVP, l'onglet Planning affiche les séances à venir en liste simple pour pouvoir démarrer et créer.
- Page « Mes programmes » (US-48).
- Indicateur d'accueil choisi (US-42).
- Notifications (US-46).

## Tâches techniques
- [ ] Backend : `appointmentRepository.readAppointmentsBetween(userId, from, to)` : rendez-vous + nom de séance + programme + séance réalisée liée (`LEFT JOIN workout_session`), `WHERE a.owner_user_id = ? AND a.planned_date BETWEEN ? AND ?`, tri `planned_date, planned_time IS NULL, planned_time, id`
- [ ] Backend : `appointmentRepository.countVersionContent(versionIds)` : nombre de blocs et d'exercices par version (pour « 1 bloc · 3 exercices »)
- [ ] Backend : `appointmentActions.browse` ; `GET /api/appointments` → `authenticate` → `validate({ query: dateRangeSchema })` (62 jours max)
- [ ] Backend : `GET /api/workout-sessions/current` (livré avec US-28 ; en attendant, renvoie `null`)
- [ ] Shared : `dateRangeSchema` ; `formatLongDate` (« Jeudi 26 novembre ») ; `sortDayAppointments` (heure puis sans heure)
- [ ] Frontend : `components/AppLayout.tsx` (en-tête : titre, avatar), `components/TabBar.tsx` (4 `NavLink`, `aria-current`), `pages/NotFoundPage.tsx`
- [ ] Frontend : `App.tsx` : routes publiques (`/inscription`, `/connexion`), routes privées dans `ProtectedRoute` + `AppLayout`, routes plein écran (`/seances/nouvelle`, `/entrainement/:id`) sans `AppLayout`
- [ ] Frontend : `features/appointment/services/appointmentService.ts` : `readAppointments(from, to)`
- [ ] Frontend : `features/appointment/hooks/useTodayAppointments.ts`, `features/workout-session/hooks/useCurrentWorkoutSession.ts`
- [ ] Frontend : `pages/HomePage.tsx` : `TodaySessionCard`, `TodaySelector`, `QuickActions`, `ProgramsSummary` (vide en MVP)
- [ ] Frontend : états chargement / erreur / vide ; statut `aria-live`
- [ ] Tests : back : plage de dates, séances d'un autre exclues, tri sans heure en dernier
- [ ] Tests : front : `TabBar` met `aria-current` sur le bon onglet ; Accueil débutant / actif / en cours
- [ ] Tests : E2E : navigation au clavier entre les 4 onglets ; page privée sans connexion → connexion → retour ; axe sur les 5 états de l'Accueil

## Definition of Done
- [ ] Critères d'acceptation vérifiés manuellement
- [ ] 5 états de l'Accueil implémentés et testés
- [ ] Mobile-first 375 px, onglets à 44 px, vérifié sur tablette et ordinateur
- [ ] Code relu et fusionné via pull request, aucune erreur Biome / TypeScript / console
