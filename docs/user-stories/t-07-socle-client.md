# T-07 · Socle client

EPIC 0 · Socle technique

**Taille :** M (3 Story Points)
**Priorité :** Must Have (Sprint 0)
**Sprint :** Sprint 0
**Dépendance principale :** T-06
**Intégration future :** toutes les pages
**Branche :** `chore/t-07-client-core`

## User story

En tant que développeuse, je veux des briques communes côté client (appel au serveur, utilisateur connecté, états de chargement) afin que chaque page les réutilise au lieu de les réécrire.

## Pourquoi

Chaque page charge des données, peut échouer et doit afficher un état vide. Sans briques communes, chaque page le ferait à sa façon.

## Règles métier

- Le client ne parle au serveur que par `apiFetch`.
- Une erreur du serveur arrive dans le client avec son `code` et son `message`.
- Une page privée n'est jamais affichée sans utilisateur connecté.
- Pas de bibliothèque de chargement (React Query) : `useState` + `useEffect`, explicables simplement.

## Critères d'acceptation

- `apiFetch` lève une `ApiError(status, code, message, field)` quand la réponse n'est pas OK.
- `AuthContext` charge l'utilisateur au démarrage par `GET /api/auth/me` et expose `user`, `isLoading`, `login`, `logout`.
- `ProtectedRoute` redirige vers `/connexion` sans utilisateur, et revient à la page demandée après connexion.
- Les composants `LoadingState`, `ErrorState` (avec « Réessayer »), `EmptyState` et `StatusBadge` existent.
- `StatusBadge` affiche toujours un symbole **et** un texte.
- Une requête en cours est annulée (`AbortController`) quand la page se ferme.

## Éléments affichés

- Chargement générique : « Chargement… » (lu par les lecteurs d'écran)
- Erreur générique : « Une erreur est survenue. » + bouton « Réessayer »
- Statuts (symbole + texte, repris du Planning) : Planifiée · ✓ Effectuée · Inachevée · À confirmer · × Manquée · / Annulée · ↷ Déplacée

## Hors périmètre

- Barre d'onglets et mise en page (US-44).

## Tâches techniques

- [x] Frontend : `services/apiError.ts` + mise à jour de `apiFetch`
- [x] Frontend : `contexts/AuthContext.tsx` + `hooks/useAuth.ts`
- [x] Frontend : `components/ProtectedRoute.tsx`
- [x] Frontend : `components/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `StatusBadge.tsx`
- [x] Shared : `shared/status.ts` : liste des statuts, libellés et symboles (une seule source pour toutes les pages)
- [x] Tests : `apiFetch` (erreur lue), `ProtectedRoute` (redirection), `StatusBadge` (symbole + texte)

## Definition of Done

- [x] Tests verts
- [x] axe sans violation sur les composants communs
