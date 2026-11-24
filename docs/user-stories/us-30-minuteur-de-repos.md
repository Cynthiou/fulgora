# US-30 · Minuteur de repos

EPIC 6 · Entraînement

**Taille :** M (3 Story Points)
**Priorité :** Must Have (MVP)
**Sprint :** Sprint 04
**Dépendance principale :** US-29
**Intégration future :** US-05 (réglages son, vibration), US-49 (mêmes alertes)
**Branche :** `feat/us-30-rest-timer`
**Maquettes :** B4
**Règles :** RM-023, RM-060, RM-061, RM-062, RM-063

## User story

En tant qu'utilisateur, je veux un minuteur de repos après chaque série afin de respecter mes temps de récupération sans quitter l'appli.

## Pourquoi

Sans minuteur intégré, il faut ouvrir une autre application à chaque série.

## Règles métier

- Le repos démarre seul après chaque série validée.
- Durée : le repos de la série s'il existe, sinon le repos par défaut de l'exercice, sinon 1 min 30 (RM-023).
- Le temps restant se calcule à partir de l'heure de fin, pas en retirant une seconde à chaque tic : il reste juste si l'appli passe en arrière-plan.
- Bips courts aux 3 dernières secondes ; à 0, un bip long et une vibration si elle est disponible (RM-060). Rien n'est promis sur iPhone (RM-063).
- Changement visuel pendant les 10 dernières secondes ; chaque alerte sonore ou vibrante a un équivalent visuel (RM-061).
- Le minuteur ne crée aucune donnée en base (RM-062).
- Son et vibration sont activés par défaut ; leur réglage arrive avec l'US-05.

## Critères d'acceptation

- Après « Valider la série », l'écran Repos s'affiche avec « Repos · 1 min 30 s par défaut » et le temps restant en gros.
- « − 15 s » et « + 15 s » ajustent le repos en cours (jamais sous 0).
- « Passer le repos » ferme le repos tout de suite.
- « Ensuite : série 3 · prévu 10 rép. · 40 kg » annonce la suite.
- Dans les 10 dernières secondes, l'affichage change (cadre noir) ; 3 bips à 3, 2, 1.
- À 0 : bip long, vibration si possible, puis retour à l'exercice.
- Le temps reste juste après 30 secondes passées sur une autre application.
- Les lecteurs d'écran entendent « 10 secondes » puis « Repos terminé », pas chaque seconde.
- Si l'utilisateur a demandé de réduire les animations, rien ne clignote.

## Éléments affichés

**Titre :** Repos · 1 min 30 s par défaut
**Temps :** 1:12
**Boutons :** − 15 s · + 15 s · Passer le repos
**Suite :** Ensuite : série 3 · prévu 10 rép. · 40 kg
**Annonces :** « 10 secondes » · « Repos terminé »

## États à gérer

### Repos en cours
Temps en gros, boutons actifs.

### 10 dernières secondes
Cadre noir, annonce unique.

### Fin du repos
Alerte, puis retour à l'exercice.

### Navigateur sans son ni vibration
Seul le signal visuel ; aucune erreur.

## Réponses API attendues

Aucune : tout se passe dans le navigateur.

## Hors périmètre

- Réglages son / vibration / notification (US-05).
- Minuteur de durée et chrono cardio (US-49).
- Repos conservé après fermeture de l'appli.

## Tâches techniques
- [ ] Shared : `getRestDuration(set, exercise)` (série → exercice → 90 s)
- [ ] Frontend : `hooks/useCountdown.ts` : `endsAt`, `secondsLeft` calculé à partir de `Date.now()`, `addSeconds`, `skip`, nettoyage de l'intervalle
- [ ] Frontend : `hooks/useTimerAlerts.ts` : bips (Web Audio API, contexte audio créé au premier appui de l'utilisateur), `navigator.vibrate` seulement s'il existe, chaque alerte déclenchée une seule fois
- [ ] Frontend : `components/RestTimer.tsx` : temps `mm:ss`, boutons, zone `aria-live="polite"` pour les deux annonces, `motion-safe` pour l'animation
- [ ] Frontend : `shared/format` : `formatClock(seconds)` (« 1:12 »)
- [ ] Frontend : branchement : la validation d'une série (US-29) appelle `startRest(getRestDuration(...))`
- [ ] Tests : unitaires avec faux minuteurs (`vi.useFakeTimers`) : temps exact après une « veille » simulée ; − 15 s ne descend pas sous 0 ; alertes à 3, 2, 1 et 0 déclenchées une seule fois ; `navigator.vibrate` absent → pas d'erreur
- [ ] Tests : unitaires : `getRestDuration`, `formatClock`
- [ ] Tests : E2E : valider une série → repos → Passer ; axe sur B4

## Definition of Done
- [ ] Critères d'acceptation vérifiés sur un vrai téléphone (Android et iPhone)
- [ ] Aucune information portée par le son seul
- [ ] Code relu et fusionné via pull request
