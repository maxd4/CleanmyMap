# Données publiques — présentation détaillée

## Positionnement runtime

La page `Données publiques` est une page publique de présentation, disponible
sur `/sections/open-data`. L’alias `/open-data` redirige vers cette surface
canonique.

Elle présente la projection publique des actions approuvées et cartographiées
de CleanMyMap via l’API JSON. Elle ne constitue pas une page d’export autonome,
ne promet pas de donnée personnelle et ne promet pas une fonctionnalité qui
n’est pas rendue par le runtime.

## Consultation de l’API publique

La page permet d’ouvrir l’endpoint public suivant :

`GET /api/actions/map`

Cet endpoint est consultable en JSON et expose une projection publique des
actions approuvées et cartographiées selon les paramètres publics pris en
charge par la route. Le bouton de la page ouvre cette réponse JSON ; il ne
déclenche pas un téléchargement depuis la page de présentation.

CleanMyMap n’expose actuellement aucun Swagger ni document OpenAPI public pour
cette API.

## Projection publique disponible

La donnée présentée sur cette page est une projection JSON publique des actions
approuvées et cartographiées via `/api/actions/map`. Les éventuelles surfaces
privées de rapport ou d’export restent hors du contrat Open Data et ne doivent
pas être présentées comme publiques depuis cette page.

## Financement

La page Open Data renvoie vers `/sections/funding` pour le détail des besoins,
contributions et usages du financement. Elle ne reprend pas le contenu complet
de cette page dédiée.

## Présentation visuelle

La page suit la palette runtime violet / blanc : accents violets, cartes
blanches et fonds lavande légers. Cette identité visuelle accompagne une
présentation publique, lisible et orientée vers la réutilisation.

## Limites à préserver

- ne pas inventer de CTA d’export sur cette page ;
- ne pas promettre de donnée personnelle ni d’export privé dans la projection
  publique ;
- ne pas présenter l’API publique comme une documentation Swagger/OpenAPI ;
- ne pas confondre la consultation JSON publique avec les surfaces privées de
  rapport ;
- conserver la distinction entre la présentation publique et les règles
  d’accès propres aux endpoints d’export.

## Référence canonique

- [Fiche canonique de la page](./open-data-README.md)
