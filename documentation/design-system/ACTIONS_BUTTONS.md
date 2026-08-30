# Actions & Buttons — contrat canonique

`CmmButton` est la primitive unique des actions standard du web. Les pages
choisissent uniquement une intention (`tone`), une densité (`size`) et une
forme (`variant`) ; la géométrie et les états restent définis dans
`apps/web/src/app/globals.css`.

## API

```tsx
<CmmButton
  tone="primary|secondary|tertiary|destructive"
  size="sm|md|lg"
  variant="default|pill|ghost"
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
| `primary` | action principale, validation ou création |
| `secondary` | action de soutien ou alternative neutre |
| `tertiary` | action contextuelle de faible hiérarchie |
| `destructive` | suppression, sortie ou modération destructive |
| `sm` / `md` / `lg` | 40 / 44 / 48 px de hauteur |
| `default` / `pill` / `ghost` | radius standard / `--radius-full` / surface sans bordure |

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
