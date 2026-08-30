# Forms & Controls — contrat canonique

Ce document est la source canonique des champs texte standards de CleanMyMap.
Il complète les contrats de surfaces, d'actions et de modes d'affichage sans
créer de recette locale par formulaire.

## Primitives

Les contrôles standards utilisent les primitives de
`apps/web/src/components/ui/cmm-field.tsx` :

- `CmmField` associe le label, le contrôle, le hint et l'erreur ;
- `CmmInput` porte les propriétés natives de `input` ;
- `CmmSelect` porte les propriétés natives de `select` ;
- `CmmTextarea` porte les propriétés natives de `textarea`.

Chaque contrôle conserve ses props HTML et ses refs. `CmmField` génère ou
préserve l'identifiant du contrôle, relie le label et les messages via
`for`/`id` et `aria-describedby`, et annonce `required` avec
`aria-required`. Une erreur utilise `aria-invalid` et un message associé.

## Contrat visuel

La géométrie et les états sont définis une seule fois par les classes
`cmm-field-*` dans `apps/web/src/styles/forms.css`, importé par
`apps/web/src/app/globals.css` :

- input/select : hauteur 44 px et padding horizontal 14 px ;
- radius : `var(--radius-sm)` ;
- couleurs sémantiques, placeholder lisible et focus via `--focus-ring` ;
- disabled identifiable, sans perte d'association accessible ;
- aucun gradient, blur ou transform dans la primitive.

Les formulaires peuvent conserver leurs wrappers métier colorés et leurs
espacements de structure, mais ne recopient pas la bordure, le fond, le
padding, le radius, l'ombre ou le focus du contrôle.

## Modes d'affichage

Les trois modes gardent les mêmes contrôles, contenus et fonctionnalités :

| Mode | Surface et motion |
| --- | --- |
| `exhaustif` | surface légèrement enrichie, avec au plus une ombre très légère |
| `minimaliste` | aucune ombre |
| `sobre` | aucune ombre ni motion, contraste renforcé |

La géométrie et le contenu restent identiques. Les tokens de mode sont
appliqués globalement via `data-display-mode`; les composants ne définissent
pas de `font-family` ou de recette visuelle de mode.

## Périmètre de migration

Les inputs, selects et textareas standards des formulaires de déclaration
d'action et de `reports/admin-workflow/step-confirm.tsx` utilisent ces
primitives. Restent hors de ce contrat les checkbox/radio, file inputs,
contrôles cartographiques, éditeurs spécialisés et uploads/media.

Le garde-fou `npm run check:forms` contrôle la primitive et les fichiers
migrés afin d'empêcher le retour de recettes directes ou de contrôles natifs
standards contournant le contrat.
