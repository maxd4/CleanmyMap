# Agir

Parcours d'action, déclaration, signalement et préparation terrain.

## Routes canoniques

| Route | Fiche | Statut | Exception UI | Résumé |
|---|---|---:|:---:|---|
| `/actions/history` | [Historique des actions](./actions-history/README.md) | canonique | non | Historique opérationnel des actions déclarées. |
| `/actions/new` | [Déclarer une action](./actions-new/README.md) | canonique | non | Formulaire prioritaire pour déclarer une action terrain. |
| `/declaration` | [Déclaration](./declaration/README.md) | alias | non | Redirection canonique vers `/actions/new`. |
| `/declaration-simple` | [Déclaration simple](./declaration-simple/README.md) | canonique | non | Version simplifiée du formulaire de déclaration. |
| `/missions/[id] (ex. /missions/terrain-2026)` | [Mission détaillée](./missions-id/README.md) | canonique-exemple | non | Vue détaillée d'une mission avec carte et chronologie. |
| `/sections/guide` | [Mode d'emploi](./sections-guide/README.md) | canonique | non | Guide terrain et bonnes pratiques opérationnelles. |
| `/sections/kit` | [Kit terrain](./sections-kit/README.md) | canonique | non | Checklist matériel et préparation terrain. |
| `/sections/recycling` | [Que faire des déchets ?](./sections-recycling/README.md) | canonique | non | Tri, valorisation et filières après collecte. |
| `/sections/route` | [Itinéraire IA](./sections-route/README.md) | canonique | non | Recommandation guidée pour aller agir au bon endroit. |
| `/sections/weather` | [Météo terrain](./sections-weather/README.md) | canonique | non | Fenêtres météo pour choisir le bon moment d'action. |
| `/signalement` | [Signalement déchets](./signalement/README.md) | canonique | non | Signalement rapide des points de pollution et déchets. |

## Captures

- Les captures officielles de cette famille vivent dans chaque dossier route sous `png/` et `webp/`.
- Les archives legacy restent dans `documentation/liberte-UX-UI/` tant que le pipeline de capture n'a pas été migré partout.
