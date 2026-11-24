# US-49 · Chronométrer un exercice en durée ou en cardio

EPIC 6 · Entraînement

**Taille :** L (5 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 10
**Dépendance principale :** US-29, US-30
**Intégration future :** US-31
**Branche :** `feat/us-49-exercise-timers`
**Maquettes :** B5b, B5c, B5d, B5e, B5f (B5h : US-51)
**Règles :** RM-060, RM-061, RM-063

## User story

En tant qu'utilisateur, je veux un minuteur pour un exercice en durée et un chrono pour le cardio afin de ne pas chronométrer à côté.

## Pourquoi

Un gainage d'une minute ou une étape de tapis de 10 minutes se chronomètre ; le faire dans l'appli évite un deuxième téléphone.

## Ce qui change

En MVP, la durée se saisissait à la main (US-29). Elle se mesure maintenant, et reste modifiable.

## Règles métier

- Exercice en durée : choix **Minuteur ↓** (décompte depuis l'objectif) ou **Chrono ↑** (monte).
- Minuteur : 10 dernières secondes en cadre noir, bips à 3, 2, 1 ; à 0, **la série se valide seule** avec la durée prévue.
- « ■ Arrêter » avant la fin enregistre le temps tenu ; « ‖ Pause » met en pause.
- Cardio : on voit les paramètres de l'étape, « ▶ Lancer l'étape » démarre le chrono, un bip à l'objectif, il continue jusqu'à « Arrêter » ; le relevé de la machine s'ouvre alors, durée remplie par le chrono, le reste pré-rempli avec le prévu.
- Mêmes alertes et réglages que le repos (US-30, US-05).
- Le temps se calcule à partir de l'heure de départ (juste en arrière-plan).

## Critères d'acceptation

- B5b : « Minuteur · prévu 1 min · 1:00 · ▶ Lancer le minuteur » et le choix Minuteur / Chrono.
- B5c : « Fin dans 7 s · bip à 3, 2, 1 », « ‖ Pause », « ■ Arrêter » ; à 0, série validée puis repos.
- B5d / B5e : « Chrono · objectif 10 min », le chrono monte, bip à 10:00.
- B5f : le relevé s'ouvre seul à l'arrêt, durée « 10:12 » remplie.

## Éléments affichés

**B5b :** Minuteur ↓ · Chrono ↑ · « Minuteur · prévu 1 min » · ▶ Lancer le minuteur
**B5c :** « Fin dans 7 s · bip à 3, 2, 1 » · ‖ Pause · ■ Arrêter
**B5e :** « Chrono · objectif 10 min »
**B5f :** Étape 2 · Durée 10:12 · Distance (km) · Vitesse moy. (km/h) · Inclinaison moy. (%) · Calories · Valider l'étape 2

## États à gérer

### Pause
Temps figé, bouton « Reprendre ».

### Retour d'arrière-plan
Temps recalculé ; si le minuteur est arrivé à 0 pendant ce temps, la série est validée.

## Réponses API attendues

Validation par la route de l'US-29.

## Décisions

- **D-02** : B5h (minuteur gauche puis droite) est traité par l'US-51.
- **D-17** : US en V1 (en MVP, la durée se saisit à la main).

## Hors périmètre

- Minuteur de bloc (US-31).

## Tâches techniques
- [ ] Frontend : `useStopwatch` (chrono à partir de l'heure de départ, pause cumulée), réutilisation de `useCountdown` et `useTimerAlerts`
- [ ] Frontend : `DurationTimer.tsx` (B5b, B5c), `CardioStepTimer.tsx` (B5d, B5e), ouverture automatique de `CardioReadingSheet` (B5f)
- [ ] Tests : unitaires faux minuteurs : pause / reprise, arrêt avant la fin, validation à 0 une seule fois
- [ ] Tests : E2E gainage 1 min accéléré (faux temps)

## Definition of Done
- [ ] Vérifié sur un vrai téléphone, écran verrouillé puis rouvert
- [ ] Code relu et fusionné via pull request
