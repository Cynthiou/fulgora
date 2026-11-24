# Charte graphique Fulgora

Fulgora vient du latin *fulgur*, l'éclair. Version 2 de la charte (modèle « maquette claire sans halo ») : thème clair par défaut, un seul bouton orange par écran, l'éclair bleu.

## 1. Le logo

| Fichier | Usage |
|---|---|
| `client/src/assets/logo/fulgora-logo-light-bg.svg` | Sur fond clair (thème par défaut) |
| `client/src/assets/logo/fulgora-logo-dark-bg.svg` | Sur fond sombre |
| `client/public/favicon.svg` et `favicon.ico` | Onglet du navigateur, icône d'appli |

- Lettrage : Saira Condensed ExtraBold (800), incliné de 10°, converti en tracés (le SVG n'a pas besoin de la police).
- L'éclair est toujours bleu `#2563EB`, le texte suit le fond (`#0B1220` sur clair, `#F8FAFC` sur sombre).
- On ne déforme pas le logo, on ne change pas ses couleurs, on ne l'utilise pas sur un fond qui le rend illisible.

## 2. Les couleurs

Dans le JSX, on utilise le nom et jamais le code couleur (`bg-primary`, `text-muted`). Changer une couleur se fait à un seul endroit : `client/src/styles/global.css`.

| Rôle | Classe | Clair | Sombre | Usage |
|---|---|---|---|---|
| Fond d'écran | `bg-base-200` | `#ECEFF3` | `#0B1220` | Fond des pages |
| Surface | `bg-base-100` | `#FFFFFF` | `#141E33` | Cartes, champs, barre d'onglets |
| Zone secondaire | `bg-soft` | `#F3F5F8` | `#1E293B` | Zones secondaires, pastilles |
| Bordure | `border-base-300` | `#E2E5EA` | `#26324A` | Séparations |
| Texte principal | `text-base-content` | `#0B1220` | `#F8FAFC` | Texte courant |
| Texte secondaire | `text-muted` | `#5B6576` | `#94A3B8` | Aides, dates |
| Texte tertiaire | `text-faint` | `#8A93A3` | `#64748B` | Icônes inactives seulement (contraste trop faible pour du texte) |
| Action | `bg-primary` | `#FF6B35` | `#FF6B35` | Le bouton principal, l'élément en cours |
| Marque | `secondary` | `#2563EB` | `#60A5FA` | Logo, onglet actif, progression, liens |
| Accent | `accent` | `#0E7490` | `#22D3EE` | Sur-titres et étiquettes de champ |
| Effectuée | `status-done` / `success` | `#16A34A` | `#16A34A` | Statut effectuée |
| À confirmer | `status-pending` / `warning` | `#D97706` | `#D97706` | Statut à confirmer |
| Manquée, erreur | `status-missed` / `error` | `#DC2626` | `#DC2626` | Manquée, erreur, action destructive |
| Annulée | `status-cancelled` | `#64748B` | `#64748B` | Statut annulée |

**Contrastes (RM-064)**
- Texte sur le bouton orange : bleu nuit `#0B1220` (6,6 pour 1), jamais blanc (2,8 pour 1).
- Vert `#16A34A` et ambre `#D97706` : 3,3 et 3,2 pour 1 sur blanc, donc jamais pour du texte courant. On les utilise pour un symbole ou un fond, avec un texte bleu nuit.
- Gris tertiaire `#8A93A3` : 3,1 pour 1, réservé aux icônes inactives.

## 3. La typographie

| Usage | Police | Style | Classe |
|---|---|---|---|
| Titres, chiffres, logo | Saira Condensed | 800, italique, majuscules | `font-display` (appliqué à `h1`, `h2`, `h3`) |
| Sur-titres et étiquettes de champ | Inter | 11 px, gras, majuscules, espacé | `text-overline uppercase text-accent` |
| Texte, boutons, formulaires | Inter | 400, 600, 700 | `font-sans` (par défaut) |

Tailles des titres : `text-display-sm` (24 px), `-md` (32 px), `-lg` (44 px), `-xl` (58 px).

Les polices sont installées avec le projet (`@fontsource`), sans appel à Google Fonts : aucune donnée envoyée à un tiers, et elles marchent hors connexion.

## 4. Les formes et les tailles

| Élément | Classe | Valeur |
|---|---|---|
| Étiquette | `rounded-chip` | 4 px |
| Petit contrôle | `rounded-ctl` | 6 px |
| Bouton, champ | `rounded-btn` | 8 px |
| Carte | `rounded-card` | 10 px |
| Grand bloc | `rounded-hero` | 12 px |
| Zone tactile minimum | `size-tap` | 44 px |
| Hauteur d'un bouton principal | `h-btn` | 56 px |
| Hauteur d'un champ | `h-field` | 54 px |
| Barre d'onglets | `h-nav` | 62 px |
| Onglet actif (bouton flottant) | `size-nav-fab` | 52 px |

Ombres : `shadow-card` (suit le thème), `shadow-action` (bouton orange), `shadow-nav-active` (onglet actif).

## 5. Les recettes

| Élément | Classes |
|---|---|
| Bouton principal | `h-btn rounded-btn bg-primary text-primary-content font-extrabold uppercase tracking-wide shadow-action` |
| Bouton secondaire | `h-12 rounded-btn bg-base-100 border border-base-300 font-semibold` |
| Carte | `rounded-card bg-base-100 border border-base-300 shadow-card p-4` |
| Champ | `h-field rounded-btn bg-base-100 border border-base-300 px-4` ; en erreur : `border-[1.5px] border-status-missed` |
| Sur-titre, étiquette | `text-overline uppercase text-accent` |
| Titre | `font-display italic font-extrabold uppercase text-display-lg` |
| Lien | `font-semibold text-secondary` (jamais souligné) |
| Onglet actif | `size-nav-fab rounded-full bg-secondary text-secondary-content -translate-y-[18px] shadow-nav-active ring-[6px] ring-base-200 transition-all duration-[400ms] ease-bounce` |
| Progression | `bg-secondary` (semaine en cours : `bg-secondary/40 ring-1 ring-secondary`) |

## 6. Les règles

- **Un seul bouton orange par écran** ; l'orange signifie « action » ou « en cours ».
- Pas de dégradé sur les boutons, pas de tache orange en fond, pas de liseré coloré sur le bord des cartes.
- **Statut = couleur + symbole + libellé**, jamais la couleur seule.
- Zones tactiles d'au moins 44 px.

## 7. Les thèmes

- **Clair par défaut** (`fulgora-light`).
- **Sombre** (`fulgora-dark`) : appliqué automatiquement quand le téléphone est en mode sombre.
- Le thème actif est indiqué par `data-theme` sur la balise `<html>`.

## 8. Les icônes

Les icônes de catégories, d'équipement et de niveaux sont dans `client/src/assets/icons/`. Elles viennent d'Impulsion et ont été dessinées dans Illustrator.

## 9. Crédits

Les illustrations et les données d'exercices sont de Marc Mayol. Sa licence demande un crédit visible dans une rubrique « À propos », avec le lien https://github.com/marcmayol/exercise-api.
