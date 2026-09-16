# Données publiques — présentation détaillée

## Positionnement runtime

La page `Données publiques` est une page publique de présentation, disponible
sur `/sections/open-data`. L’alias `/open-data` redirige vers cette surface
canonique.

Elle présente les possibilités de consultation et de réutilisation des données
CleanMyMap. Elle ne constitue pas une page d’export autonome et ne promet pas
une fonctionnalité qui n’est pas rendue par le runtime.

## Consultation de l’API publique

La page permet d’ouvrir l’endpoint public suivant :

`GET /api/actions/map`

Cet endpoint est consultable en JSON et expose les actions cartographiées selon
les paramètres publics pris en charge par la route. Le bouton de la page ouvre
cette réponse JSON ; il ne déclenche pas un export CSV ni un autre téléchargement
depuis la page de présentation.

CleanMyMap n’expose actuellement aucun Swagger ni document OpenAPI public pour
cette API.

## Formats et exports disponibles

Les formats réellement disponibles dans CleanMyMap sont :

- JSON, notamment via l’API publique `/api/actions/map` ;
- JSON et CSV via les surfaces de rapports qui implémentent ces exports, avec
  leurs propres règles d’accès et de disponibilité.

La consultation de l’API publique et l’accès aux exports de rapports sont deux
usages distincts. Les formats ou exports disponibles ailleurs ne doivent pas
être présentés comme un téléchargement déclenché directement depuis la page
`Données publiques`.

## Présentation visuelle

La page suit la palette runtime violet / blanc : accents violets, cartes
blanches et fonds lavande légers. Cette identité visuelle accompagne une
présentation publique, lisible et orientée vers la réutilisation.

## Limites à préserver

- ne pas inventer de CTA d’export sur cette page ;
- ne pas présenter l’API publique comme une documentation Swagger/OpenAPI ;
- ne pas confondre consultation JSON et exports JSON/CSV des surfaces de
  rapports ;
- conserver la distinction entre la présentation publique et les règles
  d’accès propres aux endpoints d’export.

## Référence canonique

- [Fiche canonique de la page](./open-data-README.md)
