# Motion & transitions — Contrat canonique

**Statut : `CURRENT`**

Motion sert au feedback, à la compréhension d’un changement d’état ou à une
transition utile. Elle reste proportionnée au contexte et ne devient pas une
animation décorative par défaut.

L’invariant de toute animation progressive est `visible par défaut / fail-open` :
le contenu métier ne dépend jamais du démarrage d’un runtime d’animation pour
être consultable.

## Modes d’affichage

- `exhaustif` conserve une motion complète mais bornée lorsque le mouvement
  apporte une information utile.
- `minimaliste` utilise une motion courte et sans effets décoratifs : pas de
  lift, de déplacement important, de blur ou de stagger décoratif.
- `sobre` est statique.

`prefers-reduced-motion` prévaut toujours sur le mode d’affichage et supprime
le mouvement, le blur et les transitions animées. Les animations Framer Motion
doivent utiliser `useReducedMotion()` pour respecter cette préférence.

Les reveals GSAP sont une progressive enhancement fail-open : le HTML SSR et
le CSS initial restent visibles, y compris sans JavaScript. `data-gsap-reveal`
ne doit jamais être masqué par un CSS global. Le hook ne prend possession des
éléments qu'après hydratation, utilise un état initial différé
(`immediateRender: false`) et restaure la visibilité si GSAP, ScrollTrigger,
le calcul de layout, `requestAnimationFrame` ou le cycle de vie du composant
échoue. Une absence de cible, un cleanup ou un remount ne doit pas produire
un état final invisible. `prefers-reduced-motion` et le mode `sobre` laissent
le contenu immédiatement visible et désactivent le reveal.

## Autorités

`apps/web/src/styles/motion.css` porte les helpers CSS communs. Les adaptations
de ces helpers aux modes d’affichage sont portées par
`apps/web/src/styles/display-modes.css`.

Maps, data-viz, gamification et animations métier spécialisées restent hors de
cette normalisation générale. Le legacy Motion restant sera traité dans le
lot suivant.
