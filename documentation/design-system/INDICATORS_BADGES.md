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

## CmmCountBadge

`CmmCountBadge` est la primitive canonique d’un compteur numérique dynamique
compact : notification, message non lu ou autre quantité courte dont le
calcul appartient au consommateur. Il ne remplace pas `CmmBadge`, qui reste
réservé aux labels statiques, catégories et états déjà visibles.

```tsx
import { CmmCountBadge } from "@/components/ui/cmm-count-badge";

<CmmCountBadge
  count={unreadCount}
  tone="rose"
  accessibleLabel={`${unreadCount} messages non lus`}
/>;
```

`count <= 0` ne rend rien. La valeur est affichée exactement jusqu’à `max`
(`99` par défaut), puis sous la forme `max+` (`99+` par défaut). Les tones
réutilisent la palette et les tokens de `CmmBadge` dans `indicators.css` ; la
primitive n’introduit ni palette parallèle, ni animation pulse/ping, ni
`role="status"` ou live region implicite.

Un `accessibleLabel` rend le compteur compréhensible dans son contexte. Sans
ce libellé, le compteur est décoratif (`aria-hidden`) lorsque le parent porte
déjà l’information, afin que les mises à jour de polling ne provoquent pas
d’annonces répétées.

## Badge, pill, action, feedback et progress

- Un badge est statique et compact.
- Un compteur numérique dynamique relève de `CmmCountBadge`, pas de
  `CmmBadge` ; son libellé accessible et sa relation avec le parent restent
  explicites.
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
