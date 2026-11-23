# Catalogue d'exercices Impulsion V2

Fiche de contrôle : ce qu'il y a dans ce dossier, d'où ça vient, et les choix à relire.

## Règle de nommage

Le code est en anglais (noms de fichiers, dossiers, clés du JSON, codes) ; le contenu affiché à l'utilisateur est en français (noms, instructions, erreurs, alternatives).

## Contenu

- `catalog.json` : tout le catalogue (contenu en français, clés en anglais), prêt à être importé en base.
- `images/exercises/` : 302 photos, une version homme et une version femme par exercice (`slug-male.jpg`, `slug-female.jpg`).
- `images/muscle-maps/` : 302 cartes musculaires en SVG, homme et femme (`slug-male.svg`, `slug-female.svg`). Elles s'affichent seulement dans la fiche détail.

Le fichier contient, dans cet ordre : les 3 difficultés, les 8 catégories, les 15 muscles, les 6 équipements, les 8 mesures, puis les 151 exercices.

## Ce que contient chaque exercice

| Champ | Contenu |
|---|---|
| `id`, `slug`, `name` | Identité de l'exercice (id et slug identiques à l'ancien Impulsion) |
| `category_id`, `difficulty_id` | Catégorie par zone et niveau |
| `equipment_ids` | Équipement(s) nécessaire(s) |
| `muscles` | Muscles sollicités, avec le rôle `primary` (principal) ou `secondary` (secondaire) |
| `measure_profile`, `measure_ids` | Les mesures à afficher et à saisir pour cet exercice |
| `instructions` | Les étapes, dans l'ordre |
| `mistakes` | Les erreurs à éviter |
| `alternatives` | Les exercices de remplacement |
| `image_male_url`, `image_female_url` | Les photos |
| `muscle_map_male_url`, `muscle_map_female_url` | Les cartes musculaires |

## D'où viennent les données

- **Ancien Impulsion** (projet P3) : noms, instructions, difficultés, catégories, muscles et équipements, déjà en français.
- **Jeu de données de Marc Mayol** : erreurs à éviter et alternatives (traduites de l'anglais et de l'espagnol), photos homme et femme, cartes musculaires.

Contrôle fait : les 151 slugs, les muscles (avec leur rôle) et les équipements sont identiques entre les deux sources.

## Choix à relire

### 1. Les profils de mesures

Les mesures ont été attribuées par profil, et non une par une. Codes des mesures : `reps` (répétitions), `weight` (charge), `duration` (durée), `distance`, `speed` (vitesse), `resistance` (résistance), `incline` (inclinaison), `calories`.

| Profil | Mesures | Nombre |
|---|---|---|
| `weighted` | répétitions, charge | 87 |
| `bodyweight` | répétitions | 30 |
| `hold` | durée | 6 |
| `stretch` | durée | 9 |
| `mobility` | répétitions | 8 |
| `cardio_bodyweight` | durée | 3 |
| `cardio_machine` | selon la machine (voir plus bas) | 7 |
| `carry` | charge, durée, distance | 1 |

- **Maintien** : gainage, gainage latéral, suspension à la barre, hollow hold, poirier contre le mur, squat profond maintenu.
- **Étirement** : cobra, fléchisseurs de hanche, fessiers (figure 4), ischio-jambiers allongé, flexion avant assis, 90/90 de hanche, mollets au mur, livre ouvert, pectoraux dans l'encadrement de porte.
- **Mobilité** : anges au mur, chat-vache, rétraction du menton, charnière de hanche avec bâton, fente basse avec rotation, dorsiflexion de cheville, extension thoracique, rotation thoracique à quatre pattes.
- **Cardio sans machine** : corde à sauter, jumping jacks, montées de genoux. Les burpees restent en répétitions.
- **Portage** : marche du fermier.
- **Cardio machine** :
  - tapis de course : durée, distance, vitesse, inclinaison, calories ;
  - vélo elliptique, vélo d'appartement, rameur, SkiErg : durée, distance, résistance, calories ;
  - air bike : durée, distance, calories (la résistance dépend de l'effort) ;
  - simulateur d'escalier : durée, calories.

### 2. Les difficultés et les catégories

Elles sont reprises telles quelles de l'ancien Impulsion : 105 débutant, 36 intermédiaire, 10 avancé. La catégorie Étirements (20 exercices) n'existe pas chez Marc Mayol : elle vient de l'ancien Impulsion.

### 3. Les traductions

Les 906 phrases d'erreurs et d'alternatives ont été traduites au tutoiement, comme les instructions de l'ancien Impulsion. Les alternatives restent du texte libre : elles ne pointent pas vers d'autres exercices du catalogue.

## Conséquence pour le MCD

Le catalogue a besoin de trois listes ordonnées par exercice (instructions, erreurs, alternatives) et des cartes musculaires. Il faut donc les prévoir dans le MCD, par exemple :

- `EXERCICE` : ajouter `slug` (unique), `muscle_map_male_url` et `muscle_map_female_url` ;
- une table `EXERCICE_TEXTE`, en anglais `exercise_text` (`exercise_id`, `type` : instruction, mistake ou alternative, `position`, `text`).

## Licence

Les illustrations et les données d'origine appartiennent à Marc Mayol (« Ilustraciones y datos propios »). Avant une mise en ligne publique, il faut vérifier ses conditions d'utilisation ou lui demander l'autorisation. Les cartes musculaires sont dérivées de react-native-body-highlighter, sous licence MIT.
