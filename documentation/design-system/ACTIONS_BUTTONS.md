# Actions & Buttons — contrat canonique

`CmmButton` est la primitive unique des actions standard du web. Les pages
choisissent une intention (`tone`), une densité (`size`), une forme
(`variant`) et, lorsque la composition le justifie, une largeur (`width`) ;
la géométrie et les états restent définis dans
`apps/web/src/styles/actions.css`, importé par
`apps/web/src/app/globals.css`.

La priorité visuelle des actions est définie séparément par la hiérarchie
canonique [`doré/brun > violet > vert > blanc`](./BLOC_COLOR_SYSTEM_PREMIUM.md#hiérarchie-canonique-des-boutons).
Les noms historiques de l'API `tone` ci-dessous ne constituent pas une
hiérarchie concurrente et ne doivent pas être interprétés comme des variantes
dorée/brune ou violette inexistantes.

## API

```tsx
<CmmButton
  tone="primary|secondary|tertiary|destructive"
  size="sm|md|lg"
  variant="default|pill|ghost"
  width="auto|wide"
  loading={isPending}
>
  Action
</CmmButton>
```

Les contrats de navigation et d'accessibilité existants (`href`, `prefetch`,
`onClick`, `disabled`, `asChild`, `ariaLabel`, `title` et `type`) restent
disponibles. `loading` expose `aria-busy`, conserve le libellé et bloque aussi
les liens. `disabled` bloque également les liens via `aria-disabled`, le
clavier et l'activation.

## Intentions et dimensions

| Contrat | Usage |
| --- | --- |
| `primary` | bouton vert actuellement publié pour une action standard, une validation ou une création |
| `secondary` | bouton blanc actuellement publié pour une action d'accompagnement ou une alternative neutre |
| `tertiary` | bouton transparent actuellement publié pour une action contextuelle de faible emphase |
| `destructive` | suppression, sortie ou modération destructive |
| `sm` / `md` / `lg` | 40 / 44 / 48 px de hauteur |
| `default` / `pill` / `ghost` | radius standard / `--radius-full` / surface sans bordure |
| `auto` / `wide` | largeur intrinsèque / largeur équivalente à deux colonnes normales |

`width="wide"` est une variante de composition, indépendante de `tone`,
`size` et `variant`. Dans un `CmmButtonGroup layout="two-column"`, le bouton
long occupe les deux colonnes et les autres boutons occupent chacun une
colonne. Le groupe repasse sur une colonne en mobile ; le bouton long conserve
alors une largeur de colonne complète. Utiliser ce mode lorsqu'une grille de
trois actions doit conserver un rythme homogène sur deux lignes, pas pour
accentuer la priorité d'une action.

Les paddings horizontaux sont respectivement de 12 / 16 / 20 px et le gap
interne est de 8 px. Ces valeurs ne doivent pas être recopiées dans les
consommateurs.

## Modes et mouvement

- `exhaustif` conserve les effets premium légers : gradient possible pour
  `primary` et `destructive`, ombre soft, translation au survol et compression
  active, en 180 ms ;
- `minimaliste` retire gradient, ombre et transform, avec une transition de
  couleur/bordure en 150 ms ;
- `sobre` retire gradient, ombre et transform, sans transition décorative ;
- `prefers-reduced-motion: reduce` neutralise systématiquement transition et
  mouvement.

Les états `hover`, `active`, `focus-visible`, `disabled` et `loading` sont
centralisés dans la primitive CSS. Ne pas ajouter de classes locales de
géométrie, d'effet ou de focus à `CmmButton`.

## Règles de migration

- utiliser `CmmButton` pour une action qui se comporte comme un bouton ou un
  lien d'action standard ;
- pour une tuile de navigation structurée, utiliser `Link > CmmCard` sans
  `clickable` ni double sémantique interactive ;
- laisser les contrôles spécialisés, comme une fermeture `×`, hors primitive
  lorsqu'ils ont une géométrie dédiée ;
- ne pas utiliser `tone="muted"`, supprimé du contrat canonique ;
- ne pas migrer globalement les éléments `<button>` sans décision de lot.

Le garde-fou associé est `npm run check:actions`.
