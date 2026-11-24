# US-20 · Modifier le programme (jours, heures, période)

EPIC 4 · Programmes

**Taille :** XL (8 Story Points)
**Priorité :** Should Have (V1)
**Sprint :** Sprint 08
**Dépendance principale :** US-18, US-25 (rendez-vous déplacés)
**Intégration future :** US-21
**Branche :** `feat/us-20-edit-program`
**Maquettes :** PRO-07b, PRO-08
**Règles :** RM-031, RM-032, RM-033, RM-037

## User story

En tant qu'utilisateur, je veux changer le jour, l'heure ou la période de mon programme afin de l'adapter à mon emploi du temps.

## Pourquoi

L'emploi du temps change en cours de cycle : passer la course du samedi au dimanche sans tout recréer.

## Règles métier

- Changer le jour ou l'heure d'une séance désactive l'ancienne règle (avec sa date) et en crée une nouvelle (RM-031).
- Seuls les rendez-vous **à venir, planifiés, non commencés et non déplacés à la main** bougent (RM-031, RM-032).
- Les rendez-vous déplacés à la main gardent leur date (RM-032).
- Les séances passées ne bougent jamais.
- Reculer la date de fin ajoute des semaines (nouveaux rendez-vous) ; l'avancer annule les rendez-vous au-delà, même déplacés à la main (RM-033), après confirmation (US-21).
- Chaque modification est historisée (RM-037).
- Les rendez-vous concernés s'affichent en direct avant de valider.

## Critères d'acceptation

- PRO-07 → ⋯ → « Modifier le programme » ouvre PRO-08 : nom, période, et pour chaque séance de la semaine type son jour et son heure.
- Passer « Course » du samedi au dimanche liste « Sam 28 nov. → Dim 29 nov. · 10:00 », etc.
- La séance déplacée à la main apparaît avec « déplacé manuellement, date conservée ».
- Les autres séances (« Fractionné du jeudi : inchangé ») et les séances passées sont annoncées inchangées.
- « Valider » applique tout et revient à PRO-07 avec un message.
- Le Planning affiche les nouvelles dates.

## Éléments affichés

**PRO-08 :** Modifier le programme · Rendez-vous concernés · « Sam 28 nov. → Dim 29 nov. · 10:00 » · « Ven 4 déc. : déplacé manuellement, date conservée. » · « Fractionné du jeudi : inchangé. » · « Séances passées (5 → 21 nov.) : inchangées. » · « Avancer la fin annule les séances au-delà ; reculer la fin ajoute des semaines. » · Valider
**Succès :** « Programme modifié. »

## États à gérer

### Aucun changement
« Valider » inactif.

### Calcul de l'aperçu
Liste en chargement.

### Séance en cours dans le programme
Elle n'est jamais déplacée.

## Réponses API attendues

- Aperçu : `POST /api/programs/:id/schedule/preview` → `200` + liste des changements
- Application : `PUT /api/programs/:id/schedule` → `200`
- Programme terminé ou abandonné : `409`

## Hors périmètre

- Modifier le contenu d'une séance (US-17).
- Abandonner (US-21).

## Tâches techniques
- [ ] Shared : `planScheduleChange(program, schedules, appointments, changes, today)` : fonction pure qui renvoie les rendez-vous à déplacer, à créer, à annuler et inchangés (utilisée pour l'aperçu et l'application)
- [ ] Backend : `deactivateWeeklySchedule(id, at)`, `createWeeklySchedule`, `readFutureAppointmentsForUpdate(programId, today)` (`FOR UPDATE`), `moveAppointmentsToSchedule`, `createAppointments`, `cancelAppointments`, `createProgramChange(programId, type, old, new)`
- [ ] Backend : `programActions.previewSchedule` et `programActions.updateSchedule` dans `withTransaction`
- [ ] Frontend : `EditProgramPage.tsx` (PRO-08) avec aperçu recalculé à chaque changement (`useDebouncedValue`)
- [ ] Tests : unitaires `planScheduleChange` (déplacé à la main conservé, passé intact, séance en cours intacte, fin reculée, fin avancée) ; back : application = aperçu, trace `program_change`
- [ ] Tests : E2E samedi → dimanche

## Definition of Done
- [ ] L'aperçu et l'application donnent exactement le même résultat (test)
- [ ] Code relu et fusionné via pull request
