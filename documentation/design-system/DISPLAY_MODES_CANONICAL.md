# Modes d’affichage CleanMyMap — contrat canonique

**Statut : `CURRENT`**

Ce contrat décrit uniquement les modes exposés par le runtime actuel. La source
des valeurs et du parsing est
`apps/web/src/lib/ui/preferences.ts`; les adaptations CSS sont dans
`apps/web/src/styles/display-modes.css` et les consommateurs utilisent
`data-display-mode` ou `useSitePreferences()`.

## Invariants communs

Les modes changent la présentation, jamais les routes, données, permissions,
fonctionnalités, validations, textes métier ou contrats d’accessibilité. Ils ne
créent pas une variante fonctionnelle d’une page et ne doivent pas masquer une
donnée utile uniquement pour obtenir un rendu plus léger.

Le runtime accepte exactement :

```ts
["exhaustif", "minimaliste", "sobre"]
```

Toute autre valeur est ramenée à `exhaustif`, qui est le mode par défaut.

## Matrice runtime

| Mode | Contrat actuel |
| --- | --- |
| `exhaustif` | Présentation complète par défaut ; les enrichissements visuels existants restent bornés par les primitives et les règles Motion. |
| `minimaliste` | Même produit et mêmes composants ; fond et surfaces simplifiés, texture/blur décoratifs et transformations de cartes limités selon les tokens CSS présents. |
| `sobre` | Même produit ; police système dédiée, surfaces unies, pas d’ombre décorative et motion désactivée par les règles CSS présentes. |

Les dimensions, composants, titres `PageHeader`, familles de couleur et
contrastes restent gouvernés par leurs contrats spécialisés. `minimaliste` et
`sobre` ne sont pas des modes « contenu réduit ».

## Motion et accessibilité

`prefers-reduced-motion` prime sur le mode d’affichage et neutralise le
mouvement animé. Les consommateurs Framer Motion doivent utiliser
`useReducedMotion()`. Le contrat détaillé est
[`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md).

## Ce qui n’est pas implémenté par ce contrat

Ne pas présenter comme runtime :

- une sélection automatique du mode par le système ou par la préférence
  `prefers-reduced-motion` ;
- une suppression générale du contenu, des fonctionnalités ou des composants
  selon le mode ;
- des palettes, polices distantes, animations ou classes locales non présentes
  dans `preferences.ts`, `display-modes.css` ou leurs consommateurs ;
- un mode par page ou par composant indépendant de la préférence globale.

Toute évolution de ces points nécessite une modification runtime explicite et
un contrat mis à jour ; elle n’est pas déduite d’une ancienne charte.
