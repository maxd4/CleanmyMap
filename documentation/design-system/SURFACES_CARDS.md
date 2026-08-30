# Surfaces & Cards — contrat canonique

Ce document gouverne les surfaces standard de CleanMyMap. Il complète
`BLOC_COLOR_SYSTEM_PREMIUM.md` (couleurs par famille) et
`DISPLAY_MODES_CANONICAL.md` (contrat global des modes), sans créer de
variante de composant par mode.

## Architecture

```text
data-display-mode
  → tokens CSS --cmm-surface-*
  → primitives CmmCard / CmmBlockCard / RubriqueCard
  → consommateurs de page
```

Les tokens sont définis dans `apps/web/src/styles/tokens.css`, importé par
`apps/web/src/app/globals.css`. Les composants sélectionnent une sémantique
(`tone`, `variant`, `size`, `surfaceKind` ou un
accent de bloc) ; ils ne redéfinissent pas le shell avec des couleurs,
ombres, blur, radius ou transforms locaux.

## Matrice des trois modes

| Propriété | `exhaustif` | `minimaliste` | `sobre` | Responsable |
| --- | --- | --- | --- | --- |
| Fond standard | surface premium thématique | surface unie de même identité | surface plate | `--cmm-surface-background` |
| Fond muted | `--bg-muted` | `--bg-muted` | fond de base | `--cmm-surface-background-muted` |
| Bordure | bordure standard | bordure renforcée | bordure renforcée, contraste élevé | `--cmm-surface-border` / `--cmm-surface-border-strong` |
| Ombre standard | `var(--shadow-soft)` | aucune | aucune | `--cmm-surface-shadow` |
| Ombre elevated | `var(--shadow-elevated)` | au maximum `var(--shadow-soft)` | aucune | `--cmm-surface-shadow-elevated` |
| Blur | `blur(10px)` | aucun | aucun | `--cmm-surface-blur` |
| Texture / gradients | autorisés sur les surfaces premium | désactivés | désactivés | `--cmm-surface-texture-opacity` + classes texture |
| Hover translate | `-2px` | `0` | `0` | `--cmm-surface-hover-translate` |
| Hover scale | `1.01` | `1` | `1` | `--cmm-surface-hover-scale` |
| Active scale | `.99` | `1` | `1` | `--cmm-surface-active-scale` |
| Transition | `180ms ease` | `150ms ease`, uniquement feedback utile | `0ms` | `--cmm-surface-transition-*` |
| Focus | global, visible et conservé | global, visible et conservé | renforcé, sans dépendre d'une ombre | classes focus canoniques |

Le thème et la famille peuvent modifier la lecture des couleurs, mais jamais
la géométrie ni les métriques de contenu. Les modes ne retirent aucune donnée,
route, permission ou fonctionnalité.

## Primitives

### `CmmCard`

`CmmCard` est la primitive standard des cartes et panels. Ses props publiques
`tone`, `variant`, `size`, `clickable`, `disabled`, `prose`, `lineClamp` et
`header` restent sémantiques. Le shell est porté par `.cmm-card` et ses tokens.

Les variantes métier conservées sont :

- `default` : surface standard ;
- `elevated` : surface élevée ;
- `muted` : surface secondaire ;
- `outlined` : surface transparente bordée ;
- `glass` : surface premium qui suit le blur du mode.

Les états `hover`, `active`, `disabled` et `focus-visible` sont centralisés.
`prefers-reduced-motion: reduce` est prioritaire et supprime transforms,
animations et transitions de la carte.

### `CmmBlockCard` et `CmmBlockAccent`

`CmmBlockCard` compose `CmmCard` avec `BLOCK_ACCENT_MAP`. Les barres, dots et
rings restent visibles dans les trois modes comme repères de famille. Le
pulse, les gradients et les glows sont décoratifs et ne sont visibles qu'en
`exhaustif`; ils sont supprimés en `minimaliste`, `sobre` et avec
`prefers-reduced-motion`.

### `RubriqueCard` et familles

`RubriqueCard` est une surface thématique spécialisée pour les grands blocs de
rubrique, mais suit les mêmes tokens de mode pour son fond, sa bordure, ses
états et sa motion. `surfaceKind="themed"|"neutral"` distingue seulement la
source de couleur. La barre supérieure reste disponible dans les trois modes,
le watermark est réservé à `exhaustif`, et l'icône ne reçoit aucun effet
décoratif en `minimaliste` ou `sobre`.

Les presets de famille exposent uniquement `rubriqueTheme` et `surfaceKind`.
Ils ne portent ni gradients, ni ombres, ni blur, ni hover local.

## Exceptions hors contrat standard

Restent spécialisés et ne doivent pas être forcés dans `CmmCard` :

- homepage et hero de campagne ;
- carte Leaflet, overlays et panneaux de mission GPS ;
- print/export et couverture PDF ;
- modales/drawers ;
- formulaires, contrôles, tableaux et surfaces système ;
- cartes annuaire/feedback et quiz dont l'état métier constitue la direction
  visuelle propre.

Ces exceptions peuvent utiliser leurs propres traitements lorsqu'ils sont
documentés par leur composant ou leur fiche. Ils ne servent pas de modèle pour
une nouvelle surface standard.

## Gouvernance

Le garde-fou ciblé est `npm run check:surfaces`. Il contrôle uniquement les
quatre sources canoniques (`CmmCard`, `CmmBlockAccent`, `RubriqueCard` et les
presets de famille), ainsi que la présence des tokens et sélecteurs de mode.
Il ne scanne pas les surfaces spécialisées afin d'éviter les faux positifs.
