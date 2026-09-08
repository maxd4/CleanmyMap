# Visualisation utile — contrat de design

**Statut : `CURRENT`**

Une visualisation sert d’abord la compréhension, la comparaison ou une
décision. La décoration seule ne justifie ni un graphique, ni une animation,
ni une nouvelle dépendance.

## Règles de décision

- préférer un texte, un tableau ou une valeur structurée lorsque cela transmet
  mieux l’information ;
- lorsqu’un visuel est utile, conserver une alternative textuelle accessible et
  un rendu compréhensible sans couleur seule ;
- réutiliser les SVG, composants et Recharts déjà présents avant d’introduire
  une nouvelle dépendance ;
- réserver les cartes, comparaisons, axes et annotations aux relations ou
  tendances réellement utiles au lecteur ;
- réserver les animations au feedback ou à la compréhension d’un changement,
  selon [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md), et respecter
  `prefers-reduced-motion`, `useReducedMotion()` et le mode `sobre`.

## Accessibilité et robustesse

Toute visualisation doit rester lisible au clavier, conserver un titre ou un
libellé utile, fournir les données importantes dans une forme textuelle ou
structurée et éviter le layout shift. Les modes d’affichage ne changent pas les
données métier.

Les contrats de cartes, surfaces, couleurs, états et titres restent dans leurs
documents spécialisés ; ce fichier ne les duplique pas.
