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
(`tone`, `variant`, `size`, `surfaceKind` ou un accent de bloc) ; ils ne
redéfinissent pas le shell avec des couleurs, ombres, blur, radius ou
transforms locaux.

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
| Hover scale | aucun | aucun | aucun | interdit sur une surface textuelle |
| Active scale | aucun | aucun | aucun | interdit sur une surface textuelle |
| Transition | `180ms ease` | `150ms ease`, uniquement feedback utile | `0ms` | `--cmm-surface-transition-*` |
| Focus | global, visible et conservé | global, visible et conservé | renforcé, sans dépendre d'une ombre | classes focus canoniques |

Le thème et la famille peuvent modifier la lecture des couleurs, mais jamais
la géométrie ni les métriques de contenu. Les surfaces textuelles standard ne
scalent ni au survol ni à l'activation et n'appliquent pas de `filter` à leur
contenu complet. Le rendu premium vient de la teinte, de la bordure et de
l'ombre/glow ; `backdrop-filter` reste autorisé. Les scales restent réservés
aux éléments décoratifs ou aux icônes lorsqu'ils sont nécessaires. Les modes ne
retirent aucune donnée, route, permission ou fonctionnalité.

## Primitives

### `CmmCard`

`CmmCard` est la primitive standard des cartes et panneaux. Ses props publiques
`tone`, `variant`, `size`, `clickable`, `disabled`, `prose`, `lineClamp` et
`header` restent sémantiques. Le shell est porté par `.cmm-card` et ses tokens.

Les variantes métier conservées sont :

- `default` : surface standard ;
- `elevated` : surface élevée ;
- `muted` : surface secondaire ;
- `outlined` : surface transparente bordée ;
- `glass` : surface premium qui suit le blur du mode.

Les états `hover`, `active`, `disabled` et `focus-visible` sont centralisés.
Le hover peut conserver une translation verticale tokenisée, mais aucun état
de la carte ne scale le conteneur textuel.
`prefers-reduced-motion: reduce` est prioritaire et supprime transforms,
animations et transitions de la carte.

### `CmmBlockCard` et `CmmBlockAccent`

`CmmBlockCard` compose `CmmCard` avec `BLOCK_ACCENT_MAP`. Les barres, dots et
rings restent visibles dans les trois modes comme repères de famille. Le
pulse, les gradients et les glows sont décoratifs et ne sont visibles qu'en
`exhaustif` ; ils sont supprimés en `minimaliste`, `sobre` et avec
`prefers-reduced-motion`.

### `RubriqueCard` et familles

`RubriqueCard` est une surface thématique spécialisée pour les grands blocs de
rubrique, mais suit les mêmes tokens de mode pour son fond, sa bordure, ses
états et sa motion. Comme `CmmCard`, elle ne scale pas son conteneur textuel.
`surfaceKind="themed"|"neutral"` distingue seulement la
source de couleur. La barre supérieure reste disponible dans les trois modes,
le watermark est réservé à `exhaustif`, et l'icône ne reçoit aucun effet
décoratif en `minimaliste` ou `sobre`.

Les presets de famille exposent uniquement `rubriqueTheme` et `surfaceKind`.
Ils ne portent ni gradients, ni ombres, ni blur, ni hover local.

## Contrat de composition des consommateurs

La présence de `CmmCard`, `CmmBlockCard` ou `RubriqueCard` ne garantit pas à elle seule une UI homogène : le consommateur peut encore contourner la géométrie de la primitive via `className`, un wrapper ou des styles CSS locaux.

**Responsabilités du composant canonique :** fond, bordure, radius, ombre, blur, padding de surface défini par `size`, états interactifs, focus, et adaptations selon les modes. Pour deux cartes standard du même rôle et de la même taille, ces propriétés doivent provenir du même contrat, indépendamment de la page.

**Responsabilités autorisées du consommateur :** position dans une grille, flexibilité (`flex`, `min-w-0`, `w-full` selon besoin), espacement **entre** cartes, contenu interne métier, ordre des informations et contraintes fonctionnelles de lecture. Une classe de placement ne doit pas écraser la géométrie interne de la surface.

**À converger vers la primitive :** `p-*` ou `px-*` réécrivant le padding standard, `rounded-*` remplaçant le radius, `bg-*` ou `border-*` imposant une autre surface, `shadow-*`, `backdrop-blur-*` et leurs équivalents en CSS local. Un `!important` permettant de passer outre les tokens est un signal prioritaire de dérive. Avant de supprimer un override, vérifier s'il porte une contrainte métier réelle ; dans ce cas, conserver cette fonction dans l'owner spécialisé documenté, sans en faire une variante globale par simple apparence.

Les cartes spécialisées ne sont pas forcées dans `CmmCard` uniquement pour passer un garde-fou. Une exception doit rester **bornée à son rôle** et ne doit pas servir de précédent à toutes les pages de la famille.

`check:surfaces` analyse les usages TSX de `CmmCard` et `CmmButton` : les
recettes arbitraires de shell ou d'effet (rayon, padding, hauteur, fond,
bordure, ombre, blur ou transformation) sont signalées lorsqu'elles ne sont
pas rattachées à un owner spécialisé explicitement recensé. Les classes de
placement et de contenu interne restent autorisées. Les exceptions actuelles
sont limitées aux surfaces spécialisées existantes (annuaire, météo, feedback,
gamification, connect, open-data et CTA dédiés) ; elles ne constituent pas une
allowlist générale pour les nouvelles pages.

La typographie et le contraste des éléments internes restent soumis à [`theme-visibility-rules.md`](./theme-visibility-rules.md) ; la disposition relative des cartes relève de [`LAYOUT_SPACING.md`](./LAYOUT_SPACING.md).

## Direction visuelle : profondeur maîtrisée, lisibilité et parcimonie

Le rendu premium de CleanMyMap est un **contraste entre une base lisible et un accent de famille**, pas l'accumulation systématique de gradients, de blur, de glows, de textures, de grands rayons et de cartes imbriquées.

- **Une surface dominante par contexte.** Dans une section de lecture ordinaire, une carte standard suffit ; réserver `glass` ou `elevated` à une hiérarchie réellement justifiée. Éviter plusieurs niveaux consécutifs de « carte dans carte » sans séparation sémantique claire.
- **Profondeur sémantique.** Le niveau de relief traduit la superposition ou l'emphase et non la couleur de famille. Ne pas compenser une bordure trop discrète par une ombre intense.
- **Rayons et paddings comparables.** Pour un même `size` et un même rôle, les coins et marges intérieures sont identiques d'une rubrique à l'autre. Les grands rayons personnalisés (`rounded-[4rem]`) et les `p-16`/`p-20` ne deviennent pas une nouvelle échelle de carte de lecture standard.
- **Accent plutôt que saturation.** Une carte peut employer la couleur de famille dans une bordure, un titre, une icône ou un repère. Le texte long conserve la couleur de lecture adaptée, sans fond décoratif susceptible d'affaiblir le contraste.
- **Priorité au contenu.** Limiter badges, pictogrammes et ornements répétitifs lorsque leur suppression ne fait perdre aucune information ; préserver les indications nécessaires d'état, de catégorie et de provenance.
- **Hauteur fondée sur l'usage.** Éviter `min-height` artificiel pour équilibrer des cartes de contenu textuel différent. Aligner les CTA par composition lorsque nécessaire, sans créer un espace vide disproportionné.
- **Modes robustes.** Une carte doit rester identifiable si ombres, glows, gradients et blur disparaissent en `sobre` ou `minimaliste`.

### Composition interne d'une carte informative

Ordre de lecture recommandé : **nature de l'information → titre → fait principal / contenu → métadonnées et limites → action pertinente**. Les variantes métier peuvent adapter cet ordre lorsque cela améliore effectivement la tâche, mais l'intention reste lisible sans effets visuels.

Les titres internes ont une hiérarchie cohérente avec leur niveau HTML (`h2`, `h3`, etc.) ; la taille minuscule en capitales et le tracking extrême ne remplacent pas un libellé principal. Les textes de lecture et légendes importantes renvoient à `theme-visibility-rules.md`.

Pour un KPI, utiliser `StatCard` et le contrat `DATA_DISPLAY_TABLES_KPI.md`. Pour les formulaires, ne pas ajouter un second panneau décoratif autour de chaque champ ; le contrat appartient à `FORMS_CONTROLS.md`.

### Arbitrage sur un override

Quand un consommateur ajoute des styles, classer la valeur : `LAYOUT_EXTERNE` (position, flex, grille) ; `CONTENU_INTERNE` (organisation de données) ; `GEOMETRIE_CANONIQUE` (à supprimer/converger) ; `SPECIALISE_JUSTIFIE` (métier, diagramme, carte, média, contrôle). Tester cette qualification sur des consommateurs réels avant de généraliser un garde-fou. Ne jamais corriger un résultat esthétique en cassant l'accessibilité ou l'état fonctionnel.

**Références externes — tokens et hiérarchie comme repères de conception,
contraste non textuel comme exigence WCAG applicable :** USWDS tokens
https://designsystem.digital.gov/design-tokens/ ; Apple HIG hiérarchie
https://developer.apple.com/design/human-interface-guidelines ; WCAG contraste
non textuel https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html.
Ces liens ne prouvent pas le rendu CleanMyMap et ne remplacent pas le contrôle
des primitives et des modes.

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
une nouvelle surface standard. **Exception de composition ne signifie jamais exception de contraste.**

## Gouvernance et preuve

Le garde-fou ciblé `npm run check:surfaces` contrôle aujourd'hui les primitives
canoniques (`CmmCard`, `CmmBlockAccent`, `RubriqueCard`, `CmmButton` et les
presets de famille), la présence des tokens et sélecteurs de mode, ainsi que
certains usages `className` de `CmmButton` (dont les transformations de texte de surface).
Il refuse aussi les `scale()` et `filter` dans les états des surfaces textuelles
canoniques, tout en laissant les scales décoratifs présents sur les enfants
hors de ces contrôles. **Il ne certifie pas toutes les géométries des cartes rendues ni toutes les exceptions spécialisées.**

Lors d'une migration de page ou d'un renforcement du garde-fou, vérifier les styles calculés et les dimensions DOM des cartes comparables en mobile, tablette et desktop, ainsi que les modes `exhaustif`, `minimaliste` et `sobre`. Les tests du garde-fou doivent distinguer override de shell et layout fonctionnel permis ; ne pas élargir une exclusion pour obtenir un PASS.
