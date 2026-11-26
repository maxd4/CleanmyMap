# Design system — index documentaire

Ce dossier distingue les contrats applicables des références historiques ou
expérimentales. Un README oriente ; il ne remplace pas un contrat spécialisé.

## Routage Codex — source spécialisée par invariant

| Invariant | Owner documentaire | Code à confronter |
|---|---|---|
| Couleurs par famille | `BLOC_COLOR_SYSTEM_PREMIUM.md` | Tokens CSS et configuration |
| Modes d'affichage | `DISPLAY_MODES_CANONICAL.md` | `apps/web/src/lib/ui/preferences.ts`, `display-modes.css` |
| Layout et densité | `LAYOUT_SPACING.md` | Shell et CSS layout |
| Ruban de navigation | `NAVIGATION_RIBBON.md` | Shell, dock classic et dropdowns |
| Titres de page | `PAGE_HEADER.md` | Composant PageHeader |
| Concision des textes UI Web et Mobile | `UI_COPY_CONCISION.md` | Textes visibles des deux applications |
| Mouvement | `MOTION_TRANSITIONS.md` | `motion.css` et préférences |
| Contraste | `theme-visibility-rules.md` | CSS et états réels |
| Exceptions | `UI_EXCEPTION_PAGES.md` | Runtime et fiche route protégée |

Les états `PLAN`, `COMPATIBILITY`, `HISTORY` et `EXPERIMENTATION` n'impliquent aucune fonctionnalité active. Ne pas copier les tokens ni les listes de routes dans cet index.

## Contrats `CURRENT`

- [`Design-system.md`](./Design-system.md) — vue transversale `CURRENT` qui
  relie les primitives et les modes sans remplacer leurs contrats spécialisés.
- [`UI_COPY_CONCISION.md`](./UI_COPY_CONCISION.md) — règle `CURRENT` unique pour
  la concision des textes visibles Web et Mobile.

- [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md) — familles,
  tokens de couleur et hiérarchie des actions.
- [`DISPLAY_MODES_CANONICAL.md`](./DISPLAY_MODES_CANONICAL.md) — modes
  d’affichage réellement disponibles et leurs limites.
- [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md) — motion et transitions.
- [`NAVIGATION_RIBBON.md`](./NAVIGATION_RIBBON.md) — contrat du ruban central
  desktop canonique et de ses dropdowns.
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
- [`BRAND.md`](./BRAND.md) — assets, variantes sémantiques et primitive de
  marque web CleanMyMap.

Les autres contrats spécialisés (`ICONS.md`, `DISCLOSURE_ACCORDIONS.md`,
`OVERLAYS_DIALOGS.md`, `INDICATORS_BADGES.md`, `DATA_DISPLAY_TABLES_KPI.md`, `TEXTURE_SURFACES.md`,
`HOMEPAGE_SECTION_HEADINGS.md`, `ui-score-formatting.md`, etc.) restent les
références de leur responsabilité. Réutiliser les composants existants ; pour
les titres principaux, `PageHeader` reste la référence runtime.

## Documents spécialisés et validations

Les contrats de surfaces, états, page headers et motion sont protégés par les
checks correspondants : `check:surfaces`, `check:states`, `check:page-header`
et `check:motion`. Le contrat de glyphes est protégé par `check:icons`. Les
helpers Motion communs et les adaptations par mode sont portés par `motion.css`
et `display-modes.css`; `CmmIcon` reste la primitive canonique pour les glyphes.

## Références non canoniques

- [`GAMIFICATION_BADGES_VISUAL_DIRECTION.md`](./GAMIFICATION_BADGES_VISUAL_DIRECTION.md) — direction visuelle `PLAN` pour les badges, progressions, jalons, gemmes et le marqueur `New`; les assets finaux restent différés.
- [`ANIMATION_LIBRARY.md`](./ANIMATION_LIBRARY.md) — `PLAN / REFERENCE`,
  recettes Framer Motion optionnelles ; le contrat est
  [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md).
- [`TERRAINK_MAP_CARDS.md`](./TERRAINK_MAP_CARDS.md) — expérimentation actuelle
  non canonique.
- [`MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md`](./MATRICE_ASTUCES_UI_UX_CLEANMYMAP.md) — inventaire
  `AUDIT / PLAN` non normatif, avec niveaux de preuve et contre-indications ;
  les contrats spécialisés restent les sources normatives.
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

## Découvrir les primitives et hooks réutilisables

Le catalogue de composants Web dérivé du code est porté par le générateur
`scripts/design/generate-design-system-board.mjs` et sa planche
`generated/board/`. Utiliser `npm run design-system:board` uniquement lorsque
la régénération de cet artefact est justifiée ; la planche ne prouve pas
l'accessibilité ou le rendu d'une page consommatrice.

| Besoin | Point d'entrée runtime Web (sous src/components/ui) | Contrat |
|---|---|---|
| Action, carte | `cmm-button.tsx`, `cmm-card.tsx` | [ACTIONS_BUTTONS](./ACTIONS_BUTTONS.md), [SURFACES_CARDS](./SURFACES_CARDS.md) |
| Champ, état et feedback | `cmm-field.tsx`, `system-state.tsx`, `cmm-feedback.tsx`, `cmm-skeleton.tsx` | [FORMS_CONTROLS](./FORMS_CONTROLS.md), [STATES_FEEDBACK](./STATES_FEEDBACK.md) |
| Disclosure et overlay | `cmm-disclosure.tsx`, `cmm-dialog.tsx`, `cmm-popover.tsx`, `cmm-dropdown.tsx` | [DISCLOSURE_ACCORDIONS](./DISCLOSURE_ACCORDIONS.md), [OVERLAYS_DIALOGS](./OVERLAYS_DIALOGS.md) |
| Structure et titre | `page-header.tsx`, `page-structure.tsx`, `cmm-section.tsx`, `cmm-grid.tsx` | [PAGE_HEADER](./PAGE_HEADER.md), [LAYOUT_SPACING](./LAYOUT_SPACING.md) |
| Préférences et positionnement | `site-preferences-provider.tsx`, `use-dropdown-placement.ts`, `use-in-view-once.ts` | [DISPLAY_MODES_CANONICAL](./DISPLAY_MODES_CANONICAL.md), [MOTION_TRANSITIONS](./MOTION_TRANSITIONS.md) |

Les hooks Web ne sont pas tous dans `src/hooks/` : rechercher également dans
les composants et domaines propriétaires (par exemple
`components/actions/action-declaration/hooks/`). Pour une primitive ou un
hook, lire les exports, les types de props/options, les consommateurs et
les tests réels ; le nom de fichier ou le nombre d'importeurs n'est pas
une preuve de réutilisabilité. Utiliser le graphe d'imports pour les
consommateurs et compléter les imports indirects et compositions.

Mobile conserve ses primitives natives, par exemple
`apps/mobile/shared/ui/mobile-form-field.tsx`, et ses controllers de feature ;
l'index Web n'autorise ni duplication de logique métier, ni import de
composant DOM dans React Native. Ne pas modifier la matrice UI/UX gelée,
les tokens ou les composants au seul motif de produire un catalogue.
