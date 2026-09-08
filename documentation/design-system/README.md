# Design system — index documentaire

Ce dossier distingue les contrats applicables des références historiques ou
expérimentales. Un README oriente ; il ne remplace pas un contrat spécialisé.

## Contrats `CURRENT`

- [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md) — familles,
  tokens de couleur et hiérarchie des actions.
- [`DISPLAY_MODES_CANONICAL.md`](./DISPLAY_MODES_CANONICAL.md) — modes
  d’affichage réellement disponibles et leurs limites.
- [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md) — motion et transitions.
- [`SURFACES_CARDS.md`](./SURFACES_CARDS.md) — cartes et surfaces.
- [`STATES_FEEDBACK.md`](./STATES_FEEDBACK.md) — états, chargements et retours.
- [`PAGE_HEADER.md`](./PAGE_HEADER.md) — titres principaux et sous-titres.
- [`LAYOUT_SPACING.md`](./LAYOUT_SPACING.md) — shell, layout et rythme.
- [`ACTIONS_BUTTONS.md`](./ACTIONS_BUTTONS.md) — géométrie et actions.
- [`FORMS_CONTROLS.md`](./FORMS_CONTROLS.md) — champs et contrôles.
- [`VISUAL_STORYTELLING.md`](./VISUAL_STORYTELLING.md) — visualisation utile.
- [`theme-visibility-rules.md`](./theme-visibility-rules.md) — contraste,
  lisibilité, thèmes et tokens.
- [`cursor-system.md`](./cursor-system.md) — curseurs effectivement fournis.

Les autres contrats spécialisés (`ICONS.md`, `DISCLOSURE_ACCORDIONS.md`,
`OVERLAYS_DIALOGS.md`, `DATA_DISPLAY_TABLES_KPI.md`, `TEXTURE_SURFACES.md`,
`HOMEPAGE_SECTION_HEADINGS.md`, `ui-score-formatting.md`, etc.) restent les
références de leur responsabilité. Réutiliser les composants existants ; pour
les titres principaux, `PageHeader` reste la référence runtime.

## Documents spécialisés et validations

Les contrats de surfaces, états, page headers et motion sont protégés par les
checks correspondants : `check:surfaces`, `check:states`, `check:page-header`
et `check:motion`. Les helpers Motion communs et les adaptations par mode sont
portés par `motion.css` et `display-modes.css`; `CmmIcon` reste la primitive
canonique pour les glyphes.

## Références non canoniques

- [`ANIMATION_LIBRARY.md`](./ANIMATION_LIBRARY.md) — `PLAN / REFERENCE`,
  recettes Framer Motion optionnelles ; le contrat est
  [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md).
- [`TERRAINK_MAP_CARDS.md`](./TERRAINK_MAP_CARDS.md) — expérimentation actuelle
  non canonique.
- [`display-modes-chartes.md`](./display-modes-chartes.md) et
  [`charte-ui-pro-moderne-futuriste.md`](./charte-ui-pro-moderne-futuriste.md)
  — façades `COMPATIBILITY` conservées pour les anciens liens.

## Compatibilité, historique et généré

- [`display-modes-implementation.md`](./display-modes-implementation.md) est
  `HISTORY` et ne donne aucune instruction `CURRENT`.
- `generated/` contient des sorties générées ; elles ne sont pas des sources
  de vérité.
- Les documents supprimés ou absorbés ne doivent pas être recréés comme
  doublons. Les anciennes références importantes doivent viser une façade
  mince ou le contrat spécialisé correspondant.

## Règles de lecture

Lire le contrat spécialisé de la responsabilité touchée, puis les composants
et checks directement concernés. Ne pas traiter une ancienne charte, une
expérimentation ou une recette comme une obligation runtime.
