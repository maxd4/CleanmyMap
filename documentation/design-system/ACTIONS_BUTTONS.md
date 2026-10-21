# Actions & Buttons — contrat canonique

`CmmButton` est la primitive unique des actions standard du web. Les pages
choisissent une intention (`tone`), une densité (`size`), une forme
(`variant`) et, lorsque la composition le justifie, une largeur (`width`) ;
la géométrie et les états restent définis dans
`apps/web/src/styles/actions.css`, importé par
`apps/web/src/app/globals.css`.

La priorité visuelle des actions est définie séparément par la hiérarchie
canonique [`doré/brun > violet > vert > blanc`](./BLOC_COLOR_SYSTEM_PREMIUM.md#hiérarchie-canonique-des-boutons).
Les noms de l'API `tone` ci-dessous expriment l'intention sémantique et ne
doivent pas être remplacés par des classes de couleur locales.

## API

```tsx
<CmmButton
  tone="primary|secondary|tertiary|important|critical|destructive"
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
| `important` | bouton violet publié pour une action importante |
| `critical` | bouton doré/brun publié pour une action critique ou très importante ; usage rare et intentionnel |
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

## Libellé, priorité et cible d'interaction

Une action doit être compréhensible avant son activation et rester identifiable
pendant son exécution.

| Règle | Application Web | Exception | Primitive/token | Vérification |
| --- | --- | --- | --- | --- |
| Le libellé décrit le résultat ou l'étape suivante | Employer un verbe explicite (`Enregistrer`, `Continuer`, `Publier`) et conserver ce vocabulaire jusqu'au feedback correspondant. | Un contrôle icon-only peut utiliser `ariaLabel` lorsqu'un libellé visible détruirait sa composition ; l'action doit alors rester compréhensible au lecteur d'écran. | `CmmButton`, `ariaLabel`, `STATES_FEEDBACK.md` | Le nom accessible indique l'effet réel ; il ne dépend ni d'un tooltip ni d'une icône seule. |
| La priorité visuelle suit la priorité de tâche | Une seule action principale domine une surface ; les actions secondaires, de navigation et destructives restent distinguables. | Les workflows multi-étapes peuvent avoir une action principale différente selon l'étape. | `tone`, `variant`, `BLOC_COLOR_SYSTEM_PREMIUM.md` | L'action attendue est identifiable sans survol et sans connaître le code couleur de la rubrique. |
| La cible reste utilisable au clavier et au pointeur | Conserver la hauteur canonique, l'espacement entre contrôles, `focus-visible`, `loading` et `disabled` fournis par la primitive. | Une fermeture spécialisée ou un contrôle cartographique peut rester hors `CmmButton` si son contrat propre fournit le même nom, focus et état. | `size`, `--focus-ring`, `theme-visibility-rules.md` | Tab/Shift+Tab suivent un ordre logique ; le focus n'est pas masqué ; le contrôle ne provoque pas de débordement au reflow. |

Ces règles ne créent pas une nouvelle taille de bouton ni une nouvelle palette.
La conformité des cibles, du focus et du contraste se vérifie avec
`theme-visibility-rules.md`; le garde-fou structurel reste
`npm run check:actions`.

## Modes et mouvement

- `exhaustif` conserve les effets premium légers : gradient possible pour
  `primary`, `important`, `critical` et `destructive`, ombre soft, translation au survol et compression
  active, en 180 ms ;
- `minimaliste` retire gradient, ombre et transform, avec une transition de
  couleur/bordure en 150 ms ;
- `sobre` retire gradient, ombre et transform, sans transition décorative ;
- `prefers-reduced-motion: reduce` neutralise systématiquement transition et
  mouvement.

Les états `hover`, `active`, `focus-visible`, `disabled` et `loading` sont
centralisés dans la primitive CSS. Ne pas ajouter de classes locales de
géométrie, d'effet ou de focus à `CmmButton`.

Le garde-fou structurel vérifie également les consommateurs TSX : les
dimensions, paddings, rayons, ombres, fonds et transformations arbitraires ne
doivent pas recréer une variante locale. Les classes de placement (`flex`,
`w-full`, `gap-*`) et la composition du contenu restent possibles. Une action
réellement spécialisée doit rester dans son owner documenté ; elle ne doit
pas élargir l'exception aux nouveaux boutons standards.

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
