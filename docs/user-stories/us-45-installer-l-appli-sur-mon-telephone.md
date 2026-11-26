# US-45 · Installer l'appli sur mon téléphone

EPIC 9 · Socle

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-44
**Intégration future :** notifications de minuteur en arrière-plan (US-05)
**Branche :** `feat/us-45-pwa`
**Maquettes :** aucune (icônes et couleurs de la charte)

## User story

En tant qu'utilisateur, je veux installer Fulgora sur l'écran d'accueil de mon téléphone afin de l'ouvrir comme une vraie appli à la salle.

## Pourquoi

À la salle, on veut ouvrir l'appli d'un appui, sans barre d'adresse.

## Règles métier

- L'appli est une PWA (application web installable) : nom, icône, couleurs du thème.
- Elle s'ouvre en plein écran, sans la barre du navigateur.
- Hors connexion, un message clair remplace la page d'erreur du navigateur.
- Aucune donnée personnelle n'est mise en cache pour un usage hors connexion (seulement l'interface).

## Critères d'acceptation

- Le navigateur propose « Ajouter à l'écran d'accueil » ; l'icône Fulgora apparaît.
- L'appli installée s'ouvre en plein écran, avec la couleur de la charte.
- Sans réseau, l'écran « Pas de connexion » s'affiche avec « Réessayer ».
- Lighthouse valide l'installabilité.

## Éléments affichés

**Hors connexion :** « Pas de connexion » · « Fulgora a besoin d'internet pour enregistrer tes séances. » · Réessayer

## Hors périmètre

- Utilisation complète hors connexion (enregistrer une séance sans réseau).

## Tâches techniques

- [x] Outillage : `vite-plugin-pwa` (`--ignore-scripts`) ou manifeste + service worker écrits à la main (proposition : le plugin)
- [x] Frontend : `manifest.webmanifest` (nom, icônes 192 et 512, `display: standalone`, `theme_color`, `background_color`), page hors connexion
- [x] Frontend : le service worker ne met jamais en cache les réponses de `/api`
- [ ] Tests : Lighthouse PWA (à lancer dans Chrome sur le build) ; [x] E2E mode hors connexion et manifeste

## Definition of Done

- [ ] Installation vérifiée sur Android et iPhone
- [ ] Code relu et fusionné via pull request
