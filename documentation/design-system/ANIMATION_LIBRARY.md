# Bibliothèque d’animations — recettes optionnelles

**Statut : `PLAN / REFERENCE`**

Ce document rassemble des recettes Framer Motion utilisables lorsqu’elles
apportent une information ou un feedback réel. Il ne constitue pas une
doctrine UI et ne rend aucun effet obligatoire. Le contrat canonique `CURRENT`
reste [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md).

## Recettes disponibles à titre d’exemple

Les exemples ci-dessous peuvent être adaptés ou écartés selon le contexte :

- springs pour une interaction courte et compréhensible ;
- `staggerChildren` pour guider la lecture d’un groupe, seulement si le délai
  aide à comprendre l’ordre ;
- `layoutId` pour une transition d’élément partagé lorsque la continuité est
  utile ;
- `whileHover` et `whileTap` pour un feedback discret d’une cible interactive ;
- glow ou variation d’ombre uniquement pour signaler un état important, jamais
  comme décoration systématique ;
- une transition d’entrée ou de sortie seulement si elle ne crée pas de
  surprise ni de layout shift.

```ts
const optionalSpring = { type: "spring", stiffness: 260, damping: 20 };
```

Cette constante est une illustration, pas une valeur imposée au runtime.

## Priorités d’accessibilité

`prefers-reduced-motion` prime sur toute recette. Les composants Framer Motion
doivent utiliser `useReducedMotion()` et pouvoir rester compréhensibles sans
animation. Les modes `minimaliste` et `sobre` priment également sur cette
bibliothèque : `sobre` reste statique et `minimaliste` réduit les effets
conformément à `display-modes.css`.

Ne pas introduire de nouvelle dépendance, de glow permanent, de spring, de
stagger ou de scale simplement parce qu’un exemple existe ici.
