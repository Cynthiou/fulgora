# Backlog Fulgora

42 user stories réparties en 8 epics. Chaque US renvoie aux règles métier (RM-xxx) du document « Règles métier et contraintes ».

**Priorités**
- **MVP** : la plus petite version utile, de bout en bout. Je prépare une séance, je la fais à la salle, je la retrouve dans mon historique.
- **V1** : ce qui rend l'appli complète (programmes, agenda, corrections, progression).
- **Plus tard** : utile, mais pas indispensable.

**Ordre de réalisation du MVP** : Compte (01 à 03), Catalogue (07 à 09), Séances modèles (12 à 15), Agenda (23), Entraînement (28 à 30, 33, 34), Historique (35, 36).

| Epic | US | MVP | V1 | Plus tard |
|---|---|---|---|---|
| 1. Compte | 01 à 06 | 3 | 2 | 1 |
| 2. Catalogue | 07 à 11 | 3 | 2 | 0 |
| 3. Séances modèles | 12 à 17 | 4 | 2 | 0 |
| 4. Programmes | 18 à 22 | 0 | 4 | 1 |
| 5. Agenda | 23 à 27 | 1 | 4 | 0 |
| 6. Entraînement | 28 à 34 | 5 | 2 | 0 |
| 7. Historique | 35 à 38 | 2 | 2 | 0 |
| 8. Progression | 39 à 42 | 0 | 3 | 1 |
| **Total** | **42** | **18** | **21** | **3** |

---

## Epic 1. Compte

### US-01 · S'inscrire · MVP
En tant que visiteur, je veux créer un compte afin de garder mes séances.
- Pseudo, e-mail et mot de passe sont obligatoires (RM-001).
- Un pseudo ou un e-mail déjà utilisé est refusé avec un message clair.
- Le mot de passe est enregistré haché, jamais en clair (RM-002).

### US-02 · Se connecter · MVP
En tant qu'utilisateur, je veux me connecter avec mon pseudo ou mon e-mail afin de retrouver mes données.
- Pseudo ou e-mail, au choix, avec le mot de passe (RM-002).
- En cas d'erreur, le message ne dit pas lequel des deux est faux.
- La connexion est gardée dans un cookie sécurisé.

### US-03 · Se déconnecter · MVP
En tant qu'utilisateur connecté, je veux me déconnecter afin de protéger mon compte sur un appareil partagé.
- Le cookie est supprimé et je reviens à l'écran de connexion.
- Les pages privées ne sont plus accessibles.

### US-04 · Modifier mon profil · V1
En tant qu'utilisateur, je veux modifier mon pseudo et choisir Femme ou Homme afin de personnaliser mon appli.
- L'e-mail n'est pas modifiable (RM-003).
- Le choix Femme/Homme change seulement les illustrations des exercices (RM-004).

### US-05 · Régler mes préférences · V1
En tant qu'utilisateur, je veux choisir mes unités, mes alertes de minuteur et mon indicateur d'accueil afin d'adapter l'appli à ma pratique.
- Unités : kg ou lb, km ou mi. La base garde toujours kg et km (conversion à l'affichage).
- Son, vibration et notification de minuteur se règlent séparément (RM-062).
- Les préférences sont propres à chaque utilisateur (RM-005).

### US-06 · Supprimer mon compte · Plus tard
En tant qu'utilisateur, je veux supprimer mon compte afin d'effacer mes données.
- Confirmation en deux temps (RM-006).
- Toutes mes données sont supprimées dans une seule transaction.

## Epic 2. Catalogue

### US-07 · Parcourir le catalogue · MVP
En tant qu'utilisateur, je veux voir la liste des exercices afin de choisir ceux de mes séances.
- Chaque carte affiche le nom, l'illustration, la catégorie et la difficulté.
- La liste est paginée.
- Je vois le catalogue commun et mes exercices personnels, jamais ceux des autres (RM-007).

### US-08 · Chercher et filtrer · MVP
En tant qu'utilisateur, je veux chercher un exercice par son nom et filtrer par catégorie, équipement et difficulté afin de le trouver vite.
- Les filtres se combinent.
- Un message s'affiche quand aucun exercice ne correspond.

### US-09 · Voir la fiche d'un exercice · MVP
En tant qu'utilisateur, je veux voir la fiche complète d'un exercice afin de bien l'exécuter.
- Illustration, carte musculaire, muscles principaux et secondaires, équipement.
- Instructions dans l'ordre, erreurs à éviter, alternatives.
- L'illustration suit mon choix Femme/Homme (RM-004).

### US-10 · Créer un exercice personnel · V1
En tant qu'utilisateur, je veux créer mon propre exercice afin d'ajouter ce qui manque au catalogue.
- Au moins un muscle principal (RM-009).
- Je choisis les mesures à saisir : répétitions, charge, durée... (RM-010).
- Il n'est visible que par moi (RM-007).

### US-11 · Personnaliser ou archiver un exercice · V1
En tant qu'utilisateur, je veux adapter un exercice du catalogue ou archiver un des miens afin de garder un catalogue à mon goût.
- Personnaliser un exercice commun crée une copie personnelle, l'original ne change pas (RM-013).
- Modifier un exercice déjà utilisé crée une copie, l'ancien est archivé (RM-012).
- Un exercice archivé reste dans l'historique (RM-011).

## Epic 3. Séances modèles

### US-12 · Créer une séance modèle · MVP
En tant qu'utilisateur, je veux créer une séance avec un nom afin de préparer mon entraînement.
- La séance peut être enregistrée vide (RM-018).
- Elle crée automatiquement sa version 1 (RM-016).

### US-13 · Ajouter un bloc · MVP
En tant qu'utilisateur, je veux ajouter des blocs à ma séance afin de l'organiser.
- MVP : bloc classique. V1 : circuit, AMRAP, for time, échauffement, étirements, défi, note (RM-019).
- Plusieurs blocs du même type sont possibles (RM-020).

### US-14 · Ajouter un exercice dans un bloc · MVP
En tant qu'utilisateur, je veux ajouter des exercices du catalogue dans un bloc afin de composer ma séance.
- Un même exercice peut apparaître plusieurs fois (RM-021).
- Je peux régler un temps de repos par défaut pour l'exercice.

### US-15 · Définir les séries prévues · MVP
En tant qu'utilisateur, je veux définir mes séries et leurs objectifs afin de savoir quoi faire à la salle.
- Seules les mesures de l'exercice sont proposées (RM-010, RM-022).
- Le repos d'une série remplace le repos par défaut de l'exercice (RM-023).

### US-16 · Réordonner · V1
En tant qu'utilisateur, je veux changer l'ordre des blocs, des exercices et des séries afin d'ajuster ma séance.
- Les positions restent uniques dans leur parent (RM-024).
- Fonctionne au toucher sur mobile.

### US-17 · Modifier une séance modèle · V1
En tant qu'utilisateur, je veux modifier une séance déjà planifiée afin de la faire évoluer sans abîmer mon historique.
- Toute modification crée une nouvelle version, l'ancienne n'est jamais modifiée (RM-017).
- Je choisis « cette séance uniquement » ou « cette séance et les suivantes » (RM-029, RM-030).

## Epic 4. Programmes

### US-18 · Créer un programme · V1
En tant qu'utilisateur, je veux créer un programme avec une date de début et de fin afin de suivre un cycle d'entraînement.
- La date de fin ne peut pas être avant la date de début.
- Plusieurs programmes peuvent coexister (RM-025).

### US-19 · Planifier les séances de la semaine · V1
En tant qu'utilisateur, je veux associer une séance à des jours de la semaine afin de générer mes rendez-vous.
- Exemple : Push le lundi et le jeudi à 18 h.
- Les rendez-vous sont créés sur toute la période du programme.

### US-20 · Changer un jour d'entraînement · V1
En tant qu'utilisateur, je veux modifier une règle hebdomadaire afin d'adapter mon programme à mon emploi du temps.
- L'ancienne règle est désactivée avec sa date (RM-031).
- Seuls les rendez-vous futurs prévus et non déplacés à la main bougent (RM-031, RM-032).

### US-21 · Raccourcir ou abandonner un programme · V1
En tant qu'utilisateur, je veux raccourcir ou abandonner un programme afin d'arrêter un cycle qui ne me convient plus.
- Un avertissement liste les rendez-vous qui seront annulés (RM-033).
- Abandon impossible si une séance est en cours (RM-034).
- Les rendez-vous annulés restent dans l'historique (RM-035).

### US-22 · Réutiliser un programme · Plus tard
En tant qu'utilisateur, je veux repartir d'un programme terminé afin de refaire un cycle.
- Le nouveau programme copie la structure et les objectifs, pas les résultats (RM-036).

## Epic 5. Agenda

### US-23 · Planifier une séance libre · MVP
En tant qu'utilisateur, je veux planifier une séance à une date afin de m'entraîner sans programme.
- Une date est obligatoire, l'heure est facultative (RM-015, RM-027).

### US-24 · Voir mon agenda · V1
En tant qu'utilisateur, je veux voir mes séances de la semaine afin de savoir quand je m'entraîne.
- Chaque rendez-vous affiche son statut : prévue, à confirmer, manquée, annulée, faite (RM-028).

### US-25 · Déplacer une séance · V1
En tant qu'utilisateur, je veux déplacer une séance à un autre jour afin de m'adapter à un imprévu.
- La date d'origine est gardée (RM-032).
- Une séance déplacée à la main ne bouge plus quand la règle hebdomadaire change.

### US-26 · Annuler une séance · V1
En tant qu'utilisateur, je veux annuler une séance prévue afin de garder un agenda juste.
- La séance passe en « annulée » et reste dans l'historique (RM-035).

### US-27 · Confirmer une séance passée · V1
En tant qu'utilisateur, je veux dire si j'ai fait une séance passée afin que mon historique soit juste.
- Une séance passée non faite devient « à confirmer », puis « manquée » après 72 heures (RM-052).
- Je peux la déclarer faite à tout moment (RM-054).
- Une notification me prévient, sans doublon (RM-055, RM-056).

## Epic 6. Entraînement

### US-28 · Démarrer une séance · MVP
En tant qu'utilisateur, je veux démarrer une séance prévue afin de noter ce que je fais.
- Le contenu prévu est copié et figé (RM-041).
- Une seule séance en cours à la fois (RM-040).
- Impossible de démarrer sans au moins un exercice (RM-018).

### US-29 · Valider une série · MVP
En tant qu'utilisateur, je veux saisir et valider ce que j'ai réellement fait sur une série afin de suivre ma performance.
- Les objectifs prévus sont pré-remplis et modifiables.
- La série est sauvegardée tout de suite (RM-044).
- L'ordre d'exécution est libre (RM-024).

### US-30 · Minuteur de repos · MVP
En tant qu'utilisateur, je veux un minuteur de repos après chaque série afin de respecter mes temps de récupération.
- Bips aux trois dernières secondes, bip long et vibration à zéro si activés (RM-060).
- Changement visuel dans les 10 dernières secondes (RM-061).
- Pas de promesse de vibration sur iPhone (RM-063).

### US-31 · Minuteur de bloc · V1
En tant qu'utilisateur, je veux un minuteur pour les blocs AMRAP, for time et circuit afin de suivre leur format.
- Il ne démarre pas tout seul avec la séance (RM-042).
- Je note les tours réalisés.

### US-32 · Ajouter un exercice en cours de séance · V1
En tant qu'utilisateur, je veux ajouter un exercice ou une série pendant ma séance afin de m'adapter sur le moment.
- Le prévu n'est ni modifié ni supprimé (RM-043).

### US-33 · Abandonner une séance · MVP
En tant qu'utilisateur, je veux arrêter une séance avant la fin afin de ne pas la laisser ouverte.
- Elle passe en « inachevée », les séries faites sont gardées (RM-045).
- Après 4 heures sans activité, elle est clôturée automatiquement de la même façon (O-01).

### US-34 · Terminer une séance · MVP
En tant qu'utilisateur, je veux terminer ma séance afin de voir mon récapitulatif.
- Des séries peuvent rester non faites (RM-046).
- Le récapitulatif affiche la durée, les séries faites et le volume.

## Epic 7. Historique

### US-35 · Voir mon historique · MVP
En tant qu'utilisateur, je veux voir la liste de mes séances passées afin de mesurer ma régularité.
- Triée par date réelle, de la plus récente à la plus ancienne (RM-050).
- Distingue les séances complètes, inachevées, manquées et annulées (RM-059).

### US-36 · Voir le détail d'une séance passée · MVP
En tant qu'utilisateur, je veux revoir une séance passée afin de comparer le prévu et le réalisé.
- Prévu et réalisé côte à côte, série par série.

### US-37 · Corriger une séance passée · V1
En tant qu'utilisateur, je veux corriger une valeur ou ajouter un oubli afin que mon historique soit exact.
- Le prévu copié ne change jamais (RM-047).
- Seuls les éléments que j'ai ajoutés peuvent être supprimés (RM-048).
- La date de correction est enregistrée à part de la date de validation (RM-049).

### US-38 · Saisir une séance après coup · V1
En tant qu'utilisateur, je veux enregistrer une séance que je n'ai pas notée sur le moment afin de ne rien perdre.
- Je déclare la date réelle de la séance (RM-050).
- Pour une séance manquée, le contenu vient de sa version d'origine (RM-058).

## Epic 8. Progression

### US-39 · Courbe d'un exercice · V1
En tant qu'utilisateur, je veux voir l'évolution de ma charge sur un exercice afin de constater mes progrès.
- Calculée à partir des séries réellement faites (RM-051).

### US-40 · Records personnels · V1
En tant qu'utilisateur, je veux voir mes records afin de célébrer mes progrès.
- Calculés à partir des résultats, sans table de records (RM-051).
- Un nouveau record crée une notification (RM-055).

### US-41 · Régularité · V1
En tant qu'utilisateur, je veux voir combien de séances prévues j'ai faites afin de savoir si je tiens mon programme.
- Séances faites, manquées et annulées sur une période.

### US-42 · Indicateur d'accueil · Plus tard
En tant qu'utilisateur, je veux voir mon indicateur favori en arrivant dans l'appli afin d'être motivé.
- Je choisis l'indicateur dans mes préférences (RM-005, RM-059).
