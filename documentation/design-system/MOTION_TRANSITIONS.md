# Motion & transitions — Contrat canonique

**Statut : `CURRENT`**

Motion sert au feedback, à la compréhension d’un changement d’état ou à une
transition utile. Elle reste proportionnée au contexte et ne devient pas une
animation décorative par défaut.

## Modes d’affichage

- `exhaustif` conserve une motion complète mais bornée lorsque le mouvement
  apporte une information utile.
- `minimaliste` utilise une motion courte et sans effets décoratifs : pas de
  lift, de déplacement important, de blur ou de stagger décoratif.
- `sobre` est statique.

`prefers-reduced-motion` prévaut toujours sur le mode d’affichage et supprime
le mouvement, le blur et les transitions animées. Les animations Framer Motion
doivent utiliser `useReducedMotion()` pour respecter cette préférence.

## Autorités

`apps/web/src/styles/motion.css` porte les helpers CSS communs. Les adaptations
de ces helpers aux modes d’affichage sont portées par
`apps/web/src/styles/display-modes.css`.

Maps, data-viz, gamification et animations métier spécialisées restent hors de
cette normalisation générale. Le legacy Motion restant sera traité dans le
lot suivant.
