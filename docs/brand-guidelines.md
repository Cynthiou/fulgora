# Charte graphique Fulgora

Fulgora vient du latin *fulgur*, l'éclair. La charte reprend celle d'Impulsion : même univers sombre, même orange d'action, même éclair.

## 1. Le logo

| Fichier | Usage |
|---|---|
| `client/src/assets/logo/fulgora-logo-dark-bg.svg` | Sur fond sombre (thème par défaut) |
| `client/src/assets/logo/fulgora-logo-light-bg.svg` | Sur fond clair |
| `client/public/favicon.svg` et `favicon.ico` | Onglet du navigateur, icône d'appli |

- Lettrage : Saira Condensed ExtraBold (800), incliné de 10°, converti en tracés (le SVG n'a pas besoin de la police).
- L'éclair est toujours bleu `#2563EB`, le texte suit le fond (`#F8FAFC` sur sombre, `#0F172A` sur clair).
- On ne déforme pas le logo, on ne change pas ses couleurs, on ne l'utilise pas sur un fond qui le rend illisible.

## 2. Les couleurs

| Rôle | Nom dans le code | Thème sombre | Thème clair | Usage |
|---|---|---|---|---|
| Fond principal | `base-100` | `#0F172A` | `#FFFFFF` | Fond des pages |
| Fond secondaire | `base-200` | `#1E293B` | `#F1F5F9` | Cartes, blocs |
| Bordures | `base-300` | `#334155` | `#E2E8F0` | Séparations |
| Texte | `base-content` | `#F8FAFC` | `#0F172A` | Texte courant |
| Action principale | `primary` | `#FD7240` | `#FD7240` | Bouton principal (une seule action par écran) |
| Marque | `secondary` | `#2563EB` | `#2563EB` | Éclair, liens, actions secondaires |
| Accent | `accent` | `#22D3EE` | `#0891B2` | Badges, mise en avant |
| Information | `info` | `#60A5FA` | `#1D4ED8` | Messages neutres |
| Succès | `success` | `#22C55E` | `#15803D` | Série validée |
| Alerte | `warning` | `#F59E0B` | `#B45309` | Avertissement |
| Erreur | `error` | `#F87171` | `#DC2626` | Erreur, suppression |

Dans le JSX, on utilise le nom et jamais le code couleur : `bg-primary`, `text-base-content`, `btn btn-secondary`. Changer une couleur se fait donc à un seul endroit, `client/src/styles/global.css`.

**Le texte sur le bouton orange est foncé (`#0F172A`), pas blanc.** Le blanc sur `#FD7240` a un contraste de 2,8 pour 1, sous le minimum d'accessibilité (4,5 pour 1). Le foncé atteint 6,5 pour 1 (règle RM-064).

## 3. La typographie

| Usage | Police | Graisse | Classe |
|---|---|---|---|
| Titres, chiffres de séance, logo | Saira Condensed | 800, italique, majuscules | `font-display` (appliqué à `h1`, `h2`, `h3`) |
| Texte, boutons, formulaires | Inter | 400, 600, 700 | `font-sans` (par défaut) |

Les polices sont installées avec le projet (`@fontsource`), sans appel à Google Fonts : aucune donnée envoyée à un tiers, et elles marchent hors connexion.

## 4. Les formes

| Élément | Arrondi |
|---|---|
| Cartes et blocs | `0.75rem` |
| Boutons et champs | `0.5rem` |

## 5. Les thèmes

- **Sombre par défaut** (`fulgora-dark`) : c'est l'usage principal, à la salle, téléphone en main.
- **Clair** (`fulgora-light`) : au choix de l'utilisateur.
- Le thème actif est indiqué par `data-theme` sur la balise `<html>`.

## 6. Les icônes

Les icônes de catégories, d'équipement et de niveaux sont dans `client/src/assets/icons/`. Elles viennent d'Impulsion et ont été dessinées dans Illustrator.

## 7. Crédits

Les illustrations et les données d'exercices sont de Marc Mayol. Sa licence demande un crédit visible dans une rubrique « À propos », avec le lien https://github.com/marcmayol/exercise-api.
