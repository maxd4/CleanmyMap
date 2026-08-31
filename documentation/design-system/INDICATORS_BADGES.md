# Indicators / Badges / Pills / Status

## CmmBadge

`CmmBadge` est la primitive canonique pour un label compact statique : tag,
catégorie, source ou état déjà visible dans son contexte. Il rend un `span`
non interactif et n’ajoute aucun role ARIA implicite, notamment pas
`role="status"`.

```tsx
import { CmmBadge } from "@/components/ui/cmm-badge";

<CmmBadge tone="emerald" size="sm" shape="rounded">
  Source vérifiée
</CmmBadge>;
```

Le contenu reste libre pour une composition légère, par exemple un point
decoratif fourni par le consommateur et un texte. Le contenu riche ne doit
pas transformer le badge en bloc de métriques.

`SourceBadge` reste le wrapper historique compatible de `CmmBadge`. Il
conserve son export, ses huit tones, `children` et `className` afin de ne pas
casser les consommateurs existants.

## Badge, pill, action, feedback et progress

- Un badge est statique et compact.
- `shape="rounded"` est la forme standard des labels et badges compacts.
- `shape="pill"` est réservée à une capsule lorsque la forme est requise par
  le contexte visuel ou sémantique.
- Une capsule interactive reste un bouton ou un lien, jamais un `CmmBadge`.
  `AdminPillLink` est donc une action et ne doit pas être migré vers la
  primitive.
- Un état dynamique qui doit être annoncé relève de `CmmFeedback`, de
  `SystemState` ou d’une sémantique ARIA explicite portée par le consommateur.
- Une barre horizontale de progression reste une progress bar métier. Elle ne
  devient pas automatiquement une primitive de badge ou un hypothétique
  `CmmProgress`.
- Un bloc comportant plusieurs valeurs ou métriques reste un bloc de contenu,
  même si chacun de ses éléments est court.

Les tones expriment une hiérarchie visuelle, mais la couleur ne doit jamais
être l’unique moyen de communiquer une information. Le texte ou le contexte
doit rester explicite.

## API visuelle

| Attribut | Valeurs | Usage |
| --- | --- | --- |
| `tone` | `slate`, `emerald`, `sky`, `amber`, `violet`, `indigo`, `rose`, `muted` | hiérarchie de surface et d’accent |
| `size` | `sm`, `md` | densité du label |
| `shape` | `rounded`, `pill` | géométrie standard ou capsule requise |

Les styles sont portés par `indicators.css` via `data-badge-tone`,
`data-badge-size` et `data-badge-shape`. Les tokens internes de fond,
bordure et texte assurent la compatibilité Light/Dark. Un badge ne porte pas
de handler, de focus ou de comportement d’ouverture.

## Statique et composition métier

Les composants métier conservent leurs calculs, leurs libellés, leurs données
et leurs conditions de rendu. Ils composent `CmmBadge` lorsqu’un sous-element
est bien un label statique.

La relation est explicitement :

```txt
GamificationStatePill → composant métier → CmmBadge
```

Ce n’est pas `CmmBadge` qui devient un composant de gamification. Les états
`vide`, `actif` et `debloque` restent calculés et libellés par
`GamificationStatePill`, qui ne délègue à la primitive que le rendu compact.
De même, les données de géométrie restent dans le tooltip de carte et
`AdminHeroStrip` conserve son contexte sombre.

## Modes d’affichage

Le contenu et le comportement restent identiques dans les trois modes :

- **Exhaustif** : une surface plus présente peut utiliser la shadow canonique
  douce ; aucun mouvement n’est nécessaire pour un badge statique.
- **Minimaliste** : surface plate, sans shadow et avec une transition visuelle
  discrète si le système en ajoute une.
- **Sobre** : pas de gradient, pas de shadow, bordure explicite et texte à
  contraste explicite ; l’information reste lisible sans dépendre de la
  couleur.

Les badges statiques n’introduisent aucune animation. Toute interaction,
annonce d’état ou progression visible doit rester dans la primitive ou le
composant spécialisé qui porte effectivement cette responsabilité.
