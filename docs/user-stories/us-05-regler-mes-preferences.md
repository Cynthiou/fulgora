# US-05 · Régler mes préférences

EPIC 1 · Compte

**Taille :** M (3 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 12
**Dépendance principale :** US-04
**Intégration future :** US-30, US-49 (alertes), US-42 (indicateur d'accueil), tous les affichages de charge et de distance
**Branche :** `feat/us-05-preferences`
**Maquettes :** PRF-03, PRF-04, NOT-08
**Règles :** RM-005, RM-060, RM-062, RM-063, DT-11

## User story

En tant qu'utilisateur, je veux choisir mes unités, mes alertes de minuteur et mon indicateur d'accueil afin d'adapter l'appli à ma pratique.

## Pourquoi

Certains comptent en livres ou en miles ; d'autres s'entraînent sans son ou sans vibration.

## Règles métier

- Unité de poids : kg ou lb. Unité de distance : km ou mi.
- La base garde toujours kg et km (mètres) ; seule l'affichage et la saisie sont convertis (DT-11).
- Sons, vibrations et notifications de minuteur se règlent séparément (RM-062).
- Activer les notifications de minuteur demande l'autorisation du téléphone ; refus → l'interrupteur revient à « Non » avec un message.
- Sur iPhone, la vibration peut ne pas marcher : c'est écrit, rien n'est promis (RM-063).
- Les préférences sont propres à chaque utilisateur et s'appliquent tout de suite (RM-005).
- Les réglages de minuteur ne concernent jamais le centre de notifications (NOT-08).

## Critères d'acceptation

- PRF-03 : Unité de poids, Unité de distance, Indicateur à l'Accueil, et un APERÇU qui change en direct (« Squat à la barre · 4 × 8 · 60 kg », « Tapis de course · 5,2 km »).
- Chaque changement est enregistré tout de suite (pas de bouton Enregistrer).
- En lb, une charge de 60 kg s'affiche « 132,3 lb » ; une saisie de 135 lb est enregistrée 61,235 kg.
- PRF-04 : trois interrupteurs indépendants (Sons, Vibrations, Notifications de minuteur) et la note sur le téléphone.
- Le minuteur de repos respecte les réglages dès la série suivante.
- NOT-08 : le lien « Réglages des alertes › » des notifications ouvre PRF-04 avec la phrase explicative.

## Éléments affichés

**PRF-03 :** Préférences d'affichage · Unité de poids (kg / lb) · Unité de distance (km / mi) · Indicateur à l'Accueil · APERÇU
**PRF-04 :** Sons · « Bips de fin de minuteur et de repos » · Vibrations · « À la fin du minuteur et du repos » · Notifications de minuteur · « Prévenir quand l'app est en arrière-plan » · Note : « Selon ton téléphone. Certaines fonctions dépendent du téléphone et du navigateur. Sur iPhone (Safari), la vibration peut ne pas fonctionner. Les notifications demandent ton autorisation. »
**Refus d'autorisation :** « Ton téléphone a refusé les notifications. Tu peux les autoriser dans ses réglages. »
**NOT-08 :** « Ces réglages ne concernent que les minuteurs pendant la séance. Le centre de notifications (cloche) affiche toujours les séances à confirmer, les séances manquées, les programmes terminés et les records. »

## États à gérer

### Enregistrement

Interrupteur désactivé le temps de la requête ; en cas d'échec, il revient à sa valeur et un message s'affiche.

### Navigateur sans notifications

Interrupteur désactivé avec « Non disponible sur ce navigateur ».

## Réponses API attendues

- Préférences enregistrées : `200`
- Valeur invalide : `400`

## Décisions

- **D-04** : indicateurs d'accueil : « Séances faites cette semaine », « Temps d'entraînement de la semaine », « Aucun » (valeur par défaut : « Séances faites cette semaine »).

## Hors périmètre

- Afficher l'indicateur à l'Accueil (US-42).
- Notifications du centre (US-46).

## Tâches techniques

- [ ] BDD : colonnes existantes de `user` : `weight_unit`, `distance_unit`, `sound_enabled`, `vibration_enabled`, `timer_notification_enabled`, `home_metric`
- [ ] Shared : `preferencesSchema` (partiel : un ou plusieurs champs)
- [ ] Shared : `toDisplayWeight(kg, unit)`, `fromDisplayWeight(value, unit)` (1 lb = 0,45359237 kg), `toDisplayDistance(meters, unit)`, `fromDisplayDistance` ; `formatWeight`, `formatDistance` utilisent les préférences
- [ ] Backend : `userRepository.updateUserPreferences(userId, values)` : uniquement les colonnes reçues, liste blanche de colonnes écrite dans le code
- [ ] Backend : `PATCH /api/users/me/preferences`
- [ ] Frontend : `PreferencesPage.tsx` (PRF-03), `SoundSettingsPage.tsx` (PRF-04) ; `usePreferences` (dans `AuthContext`)
- [ ] Frontend : `useTimerAlerts` lit `sound_enabled` et `vibration_enabled` ; `Notification.requestPermission()` à l'activation
- [ ] Frontend : tous les champs de charge et de distance passent par les fonctions de conversion
- [ ] Tests : unitaires : conversions aller-retour (60 kg → lb → kg sans perte au-delà de 3 décimales)
- [ ] Tests : back : une préférence modifiée, colonne inconnue refusée
- [ ] Tests : E2E : passer en lb → la fiche de progression et la saisie affichent des lb

## Definition of Done

- [ ] Critères d'acceptation vérifiés sur Android et iPhone
- [ ] Aucune valeur en lb ou mi stockée en base
- [ ] Code relu et fusionné via pull request
