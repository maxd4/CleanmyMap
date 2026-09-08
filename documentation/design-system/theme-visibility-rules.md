# Contrat de visibilité des thèmes

**Statut : `CURRENT`**

Ce document couvre uniquement le contraste, la lisibilité, les thèmes et les
tokens nécessaires à leur composition. Les tokens runtime sont définis dans
`apps/web/src/styles/tokens.css` et les thèmes dans les feuilles CSS importées
par `globals.css`.

## Règles

- le texte, les contrôles, les états de focus et les surfaces doivent rester
  lisibles dans chaque thème pris en charge ;
- utiliser les tokens sémantiques plutôt qu’une couleur ou une opacité locale
  lorsque le besoin est transversal ;
- vérifier le contraste des états normaux, hover, focus, désactivés et des
  messages d’état ;
- ne pas utiliser un dégradé, un glow ou une texture pour compenser un
  contraste insuffisant ;
- les modes `minimaliste` et `sobre` peuvent réduire les effets, sans changer
  la donnée ni la sémantique ; `prefers-reduced-motion` prime pour la motion.

Les couleurs de famille et la hiérarchie des boutons sont définies dans
[`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md). Les cartes,
les états, les exceptions de page et les composants de visualisation restent
dans leurs contrats spécialisés (`SURFACES_CARDS.md`, `STATES_FEEDBACK.md`,
`UI_EXCEPTION_PAGES.md` et `VISUAL_STORYTELLING.md`).
