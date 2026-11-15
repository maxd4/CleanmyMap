# Homepage

Famille autonome de la homepage canonique.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/` | [Homepage canonique](./homepage-README.md) | homepage | public | landing publique, synthèse d'impact et navigation des rubriques | non | faible | apps/web/src/app/page.tsx |

## Fichiers associés

- [Homepage - Présentation détaillée](./homepage-presentation-detaillee.md)


## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les snapshots de cette page vivent dans `screenshots/desktop/` ou
  `screenshots/mobile/` et conservent leur format d'origine.

## Preview cartographique

Le hero contient une preview publique de la carte des actions. Elle utilise le
même `ActionsMapFeed` que `/actions/map`, avec le même statut `approved`, la
même politique temporelle `current_year`, les mêmes catégories et les mêmes
références de pollution V6 via `ActionPollutionScoreReferencesProvider`.

La homepage peut limiter le volume, utiliser son viewport de présentation et
masquer les contrôles. Elle ne possède pas de moteur de données, de formule de
score ou de règle de couleur indépendant ; le vert reste réservé à
`clean_place`, le gris à une indisponibilité réelle du score et le chargement à
son état de chargement explicite.

## Footer global responsive

Le footer global est une ligne unique à partir de `640 px`. Il conserve les
quatre contacts (`Contact`, email, Instagram et GitHub) et affiche les liens
juridiques directement lorsque la largeur disponible le permet. Les
espacements, le tracking et les libellés de contact les plus longs sont réduits
progressivement avant que les liens juridiques basculent dans le menu natif
`Informations` aux largeurs compactes.

Sous `640 px`, le footer utilise une grille courte : logo et signature sur la
première rangée, quatre contacts sur deux rangées, puis `Informations` pour
les mentions légales, les politiques et la gestion des cookies. Les libellés
visuels peuvent être condensés, mais les noms accessibles et les destinations
restent présents.
