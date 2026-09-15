# Agir - Présentation détaillée

## Fiche canonique

- **Bloc** : Agir
- **Dossier canonique** : `02-agir`
- **Rôle** : proposer les trois entrées visibles du bloc Agir : rejoindre une
  action, créer une action et signaler un déchet.
- **Entrées visibles** : `/sections/rejoindre-une-action`, `/actions/new` et
  `/signalement`, dans cet ordre.
- **Routes hors navigation primaire** : `/missions/[id]` pour le workflow et les
  deep-links ; `/actions/history` pour l'historique ; `/sections/route`,
  `/sections/weather` et `/sections/guide` redirigent vers les panneaux du
  shell `/actions/new`.
- **Shell de création** : `/actions/new` expose indépendamment le pré-formulaire,
  l'itinéraire, la météo & les conditions terrain et les formalités juridiques.
- **Règle de sens** : une action ou un sondage fournit une aide à l'arbitrage ;
  son résultat ne constitue pas une décision officielle.
- **Snapshots** : colocalisés sous `screenshots/desktop/` ou `screenshots/mobile/`
  dans chaque dossier de page.

## Points à compléter

- Règles communes du bloc.
- Parcours entre les rubriques.
- Arbitrages partagés entre les sous-pages.
