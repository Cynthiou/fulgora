# Règles métier Fulgora

Ce document contient deux parties :

- **les règles fonctionnelles** (RM-xxx) : ce que l'application doit faire, du point de vue de l'utilisateur ;
- **les décisions techniques** (DT-xx) : comment on le fait, côté sécurité, base de données et architecture.

Les US du backlog (`docs/backlog.md`) renvoient à ces numéros. Le modèle de données est décrit dans `docs/data-model.md`.

## Correspondance des noms

Les règles ont été écrites avec les noms du MCD (en français). Dans le code et la base, les tables portent des noms anglais.

| Nom dans le MCD                       | Table                                        | Rôle                                      |
| ------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| UTILISATEUR                           | `user`                                       | Compte et préférences                     |
| EXERCICE                              | `exercise`                                   | Exercice du catalogue commun ou personnel |
| CATEGORIE, MUSCLE, EQUIPEMENT, MESURE | `category`, `muscle`, `equipment`, `measure` | Listes de référence                       |
| EXERCICE_MESURE                       | `exercise_measure`                           | Mesures à saisir pour un exercice         |
| SEANCE_MODELE                         | `session_template`                           | Séance préparée                           |
| VERSION_SEANCE                        | `session_version`                            | Version figée d'une séance préparée       |
| BLOC_MODELE                           | `template_block`                             | Bloc prévu                                |
| EXERCICE_BLOC_MODELE                  | `template_block_exercise`                    | Exercice prévu dans un bloc               |
| SERIE_PREVUE                          | `planned_set`                                | Série prévue                              |
| PROGRAMME                             | `program`                                    | Programme sur une période                 |
| PLANIFICATION_HEBDOMADAIRE            | `weekly_schedule`                            | Règle « tel jour, telle séance »          |
| HISTORIQUE_MODIFICATION_PROGRAMME     | `program_change`                             | Historique des changements d'un programme |
| RENDEZ_VOUS                           | `appointment`                                | Séance planifiée à une date               |
| SEANCE_REALISEE                       | `workout_session`                            | Séance réellement faite                   |
| BLOC_REALISE                          | `workout_block`                              | Bloc réalisé                              |
| EXERCICE_BLOC_REALISE                 | `workout_exercise`                           | Exercice réalisé                          |
| SERIE_REALISEE                        | `workout_set`                                | Série réalisée                            |
| NOTIFICATION                          | `notification`                               | Alerte interne                            |

---

# Partie 1. Règles fonctionnelles

## Comptes et préférences

- **RM-001** · Inscription : pseudo, e-mail et mot de passe obligatoires ; pseudo et e-mail uniques.
- **RM-002** · Connexion avec pseudo **ou** e-mail et mot de passe ; le mot de passe n'est conservé que sous forme de hachage sécurisé (voir DT-01).
- **RM-003** · L'e-mail n'est pas modifiable dans le profil.
- **RM-004** · Le choix Femme/Homme sélectionne uniquement l'illustration de l'exercice.
- **RM-005** · Les préférences sont propres à chaque utilisateur : indicateur d'accueil, unités et alertes de minuteur.
- **RM-006** · Supprimer son compte demande une confirmation en deux temps et supprime ses données conformément aux règles applicables (RGPD).

## Catalogue

- **RM-007** · Le catalogue commun est partagé ; les exercices personnels ne sont accessibles qu'à leur propriétaire.
- **RM-008** · Un exercice peut être associé à plusieurs catégories, muscles, équipements et mesures.
- **RM-009** · Chaque exercice possède au moins un muscle principal ; les autres peuvent être secondaires.
- **RM-010** · `exercise_measure` définit les champs proposés à la saisie ; les valeurs sont stockées dans les séries.
- **RM-011** · Un exercice déjà utilisé ne disparaît jamais de l'historique : il est archivé plutôt que supprimé.
- **RM-012** · Modifier un exercice personnel déjà utilisé dans une séance réalisée crée une nouvelle copie ; l'ancien est archivé. Un exercice jamais utilisé peut être modifié directement.
- **RM-013** · Personnaliser un exercice commun produit une copie personnelle ; l'exercice commun n'est pas modifié.
- **RM-014** · Les illustrations homme/femme sont facultatives et sont choisies selon le profil.

## Construction de séance

- **RM-015** · Une séance libre a obligatoirement une date ; elle est représentée par un rendez-vous sans programme.
- **RM-016** · Une séance préparée possède une ou plusieurs versions ; chaque version conserve ses blocs, exercices et objectifs prévus.
- **RM-017** · Une version créée n'est jamais modifiée ni supprimée automatiquement ; toute modification du prévu crée une nouvelle version.
- **RM-018** · Une séance préparée peut être enregistrée sans bloc, mais ne peut pas démarrer sans au moins un exercice.
- **RM-019** · Les types de blocs sont `classic`, `circuit`, `amrap`, `for_time`, `warm_up`, `stretching`, `challenge`, `note`.
- **RM-020** · Une séance peut contenir plusieurs blocs du même type ; un bloc `note` ne contient aucun exercice.
- **RM-021** · Un même exercice peut apparaître plusieurs fois, dans un ou plusieurs blocs, avec des séries différentes.
- **RM-022** · Chaque série a ses propres objectifs ; les mesures sportives sont facultatives selon l'exercice.
- **RM-023** · Le repos d'une série, s'il est renseigné, remplace le repos par défaut de l'exercice.
- **RM-024** · Les positions expriment l'ordre prévu ; l'exécution reste libre. Les positions sont uniques dans leur parent.

## Rendez-vous et programmes

- **RM-025** · Un programme a un nom, une période et des règles hebdomadaires ; plusieurs programmes peuvent coexister.
- **RM-026** · Statuts du programme : `programmed`, `in_progress`, `finished`, `abandoned`.
- **RM-027** · Un rendez-vous a sa propre identité, une date, une heure facultative et une origine hebdomadaire facultative.
- **RM-028** · Statuts du rendez-vous : `planned`, `to_confirm`, `missed`, `cancelled`, `attended`.
- **RM-029** · Modifier une séance préparée crée une version ; seuls les rendez-vous futurs, non commencés et concernés pointent vers elle.
- **RM-030** · « Cette séance uniquement » rattache un seul rendez-vous à une version dédiée ; « cette séance et les suivantes » cible les occurrences admissibles.
- **RM-031** · Changer une règle hebdomadaire désactive l'ancienne (avec sa date), crée la nouvelle et replanifie seulement les rendez-vous futurs `planned` non personnalisés.
- **RM-032** · Un rendez-vous déplacé à la main conserve sa date initiale, sa date prévue et l'indicateur de déplacement ; il n'est pas déplacé automatiquement lors d'un changement de règle hebdomadaire.
- **RM-033** · Raccourcir un programme annule tous les rendez-vous futurs `planned` après la nouvelle fin, même déplacés à la main ; un avertissement indique ceux qui seront annulés.
- **RM-034** · Abandonner un programme est interdit si l'une de ses séances est `in_progress` ; quand l'abandon est autorisé, les futures occurrences `planned` passent en `cancelled`.
- **RM-035** · Les rendez-vous annulés restent en base et dans l'historique ; aucune séance déjà commencée n'est modifiée ni supprimée.
- **RM-036** · Réutiliser un programme crée un nouveau programme indépendant, qui copie la structure et les objectifs sans les résultats ; l'origine est mémorisée.
- **RM-037** · Les changements de jours, de dates, de durée et de statut d'un programme sont historisés ; les versions de séances conservent les changements de contenu.

## Exécution et résultats

- **RM-038** · Un rendez-vous a zéro ou une séance réalisée.
- **RM-039** · Démarrer crée une séance réalisée `in_progress`, enregistre la date réelle de début et passe le rendez-vous en `attended`.
- **RM-040** · Un utilisateur ne peut avoir qu'une seule séance `in_progress` ; le serveur protège ce contrôle contre les demandes simultanées.
- **RM-041** · Au démarrage, les blocs, exercices et séries prévus sont copiés ; les valeurs prévues ainsi copiées sont figées.
- **RM-042** · Démarrer la séance ne démarre pas automatiquement les minuteurs des blocs.
- **RM-043** · On peut ajouter des blocs et des exercices pendant l'entraînement, sans supprimer ni modifier le prévu.
- **RM-044** · Les séries sont sauvegardées dès leur validation ; une séance `in_progress` peut être reprise plus tard, dans la limite de RM-065.
- **RM-045** · Abandonner une séance la passe définitivement en `unfinished` et conserve les résultats partiels ; la reprise sans abandon reste possible.
- **RM-046** · Terminer une séance peut laisser des séries non faites ; elles n'ont pas de date de validation.
- **RM-047** · Sur une séance `completed` ou `unfinished`, on peut corriger les valeurs réalisées et ajouter des éléments oubliés, jamais modifier le prévu copié ni supprimer les éléments initiaux.
- **RM-048** · Seuls les éléments ajoutés par l'utilisateur peuvent être supprimés après coup.
- **RM-049** · La date de validation d'une série conserve la première validation ; la date de mise à jour indique la dernière correction. Pour une saisie après coup, la date de validation correspond au moment de la saisie, pas à l'exécution.
- **RM-050** · La date historique de référence est la date réelle de début déclarée dans la séance réalisée ; la date de planification reste indépendante.
- **RM-051** · Les performances et les records sont calculés à partir des résultats réels, sans table de records.
- **RM-065** · Une séance `in_progress` sans aucune action enregistrée pendant **4 heures** est clôturée automatiquement en `unfinished` ; les résultats partiels sont conservés, le rendez-vous reste `attended`. À la prochaine ouverture, l'utilisateur voit : « Cette séance a été clôturée après 4 heures sans activité. Tes résultats ont été conservés. », avec les boutons « Voir le résumé » et « Corriger les résultats ». La séance ne peut pas être reprise comme séance en cours, mais elle peut être corrigée selon RM-047. _(Décision du 23/11/2026, ex-question O-01.)_
- **RM-083** · Saisie d'une durée : « 1:30 » vaut toujours 1 min 30 et « 1:30:00 » 1 h 30. Un nombre seul vaut des **minutes** pour un exercice cardio (course, vélo, rameur, corde…) et des **secondes** pour les autres (gainage, étirements, mobilité). Les boutons − et + avancent d'1 minute en cardio, de 15 secondes ailleurs. Le champ vide montre un exemple adapté (« ex. 30:00 » ou « ex. 0:45 »). Vaut pour la préparation de la séance et pour la saisie du réel. _(Décision du 26/11/2026.)_

## Confirmation, historique et notifications

- **RM-052** · Une séance prévue passée sans réalisation devient `to_confirm`, puis, sans réponse sous 72 heures, `missed` (point de départ exact du délai : voir O-04).
- **RM-053** · La règle des 72 heures n'affecte jamais un rendez-vous `attended`.
- **RM-054** · Un rendez-vous `to_confirm` ou `missed` peut être déclaré effectué sans limite de temps : création de la réalisation et passage à `attended`.
- **RM-055** · Une notification interne peut concerner une séance à confirmer, une séance manquée, un programme terminé ou un record personnel.
- **RM-056** · Pas de notification « séance à confirmer » ou « séance manquée » en double pour un même rendez-vous.
- **RM-057** · La notification de séance manquée est marquée comme lue lors d'une correction après coup.
- **RM-058** · Les rendez-vous passés, manqués ou annulés conservent leur version historique de séance, même si le programme est modifié.
- **RM-059** · L'historique et la progression distinguent les séances complètes, inachevées, manquées et annulées ; l'indicateur favori s'affiche à l'accueil.

## Minuteurs et accessibilité

- **RM-060** · Les trois dernières secondes d'un minuteur déclenchent des bips courts (si le son est activé) ; à zéro, un bip long et une vibration si elle est disponible et autorisée.
- **RM-061** · Le minuteur change visuellement pendant les 10 dernières secondes ; toute alerte sonore ou vibratoire a aussi un signal visuel.
- **RM-062** · Sons, vibrations et notifications de minuteur se règlent séparément ; les signaux instantanés ne créent pas de notification en base à chaque seconde.
- **RM-063** · La vibration et les notifications dépendent du navigateur et de l'appareil ; on ne promet pas la vibration sur iPhone/Safari.
- **RM-064** · Interface mobile d'abord, actions tactiles confortables, navigation au clavier, focus visible, contrastes suffisants, libellés explicites, affichage agrandissable.

## Navigation

- **RM-066** · La navigation principale compte quatre onglets : **Accueil** (séance du jour, reprise d'entraînement, indicateurs), **Calendrier** (séances libres, programmes, rendez-vous), **Suivi** (historique, progression) et **Catalogue** (exercices, recherche, filtres, sélection pour une séance). Le profil s'ouvre depuis l'avatar de l'en-tête. Les écrans de création de séances et de programmes s'ouvrent depuis les parcours concernés. _(Décision du 23/11/2026.)_

## Questions encore ouvertes

Elles ne sont **pas** validées. Elles seront tranchées avant les US concernées.

- **O-02** · Circuit et AMRAP : un simple total ou des résultats par tour ? (US-31, US-43)
- **O-03** · Séries ajoutées après coup : comment garder leur provenance quand l'utilisateur corrige une séance ? (US-37)
- **O-04** · Heures et fuseaux horaires : à partir de quand court le délai des 72 heures ? (US-27)
- **O-05** · Verrouillage MySQL : stratégie exacte pour garantir une seule séance en cours et la cohérence des annulations. (US-28, US-21)
- **O-06** · Version de séance utilisée par plusieurs rendez-vous passés mais non exécutés. (US-38)

_O-01 (inactivité) est tranchée : voir RM-065._

---

# Partie 2. Décisions techniques

## Sécurité

- **DT-01** · Mots de passe hachés avec **Argon2id**. Jamais stockés ni affichés en clair, jamais dans les logs.
- **DT-02** · Session : jeton dans un cookie `httpOnly`, `secure` en HTTPS, `SameSite=Strict`.
- **DT-03** · Protection CSRF : en production, le client et l'API sont servis par le **même domaine**. Les requêtes `POST`, `PUT`, `PATCH` et `DELETE` ne sont acceptées que si l'en-tête `Origin` (ou, à défaut, `Referer`) correspond exactement à une origine autorisée ; sans aucun des deux, elles sont refusées (403). Les requêtes `GET` ne modifient jamais de données.
- **DT-04** · Toutes les requêtes SQL sont **paramétrées** (`?`), jamais construites en collant du texte.
- **DT-05** · Toutes les données reçues sont validées côté serveur par un schéma.
- **DT-06** · Chaque requête sur une donnée privée vérifie que l'utilisateur connecté en est le propriétaire.
- **DT-07** · En-têtes de sécurité HTTP et limitation des tentatives sur les routes sensibles (connexion, inscription).
- **DT-08** · Secrets uniquement dans des variables d'environnement, jamais dans le code ni dans Git.
- **DT-09** · L'application se connecte à MySQL avec un utilisateur qui n'a que les droits nécessaires.

## Base de données

- **DT-10** · Noms techniques en anglais (tables, colonnes, valeurs de statut) ; textes affichés en français.
- **DT-11** · Unités canoniques en base : kg, mètres, secondes, km/h. Les conversions (lb, mi) se font à l'affichage.
- **DT-12** · La difficulté est un `ENUM('beginner','intermediate','advanced')`.
- **DT-13** · Un exercice peut avoir plusieurs catégories (`exercise_category`), même si le catalogue actuel n'en utilise qu'une.
- **DT-14** · `workout_set.updated_at` reste vide (`NULL`) tant qu'il n'y a pas de correction ; c'est le serveur qui le remplit lors d'une correction (RM-049).
- **DT-15** · Une seule séance en cours par utilisateur : garantie par un index unique sur une colonne calculée de `workout_session`, en plus de la vérification du serveur (RM-040).
- **DT-16** · Pas de notification en double : index unique sur une colonne calculée de `notification` (RM-056).
- **DT-17** · Les clés étrangères sont en `ON DELETE RESTRICT` : aucune suppression en cascade accidentelle. La suppression d'un compte (RM-006) supprime les données dans l'ordre, dans une seule transaction.
- **DT-18** · La clôture automatique (RM-065) repose sur `workout_session.last_activity_at`, mis à jour à chaque action enregistrée. Une tâche serveur vérifie toutes les 5 minutes et ne clôture que si la séance est toujours `in_progress` et inactive depuis 4 heures (mise à jour conditionnelle).
- **DT-19** · Évolutions de la base par **migrations incrémentales** numérotées ; jamais d'effacement de la base hors développement.

## Architecture

- **DT-20** · Client React + TypeScript (Vite), serveur Express + TypeScript, MySQL 8, types partagés dans `shared/`.
- **DT-21** · Organisation par famille, du serveur jusqu'à l'écran ; voir `docs/naming-conventions.md`.
