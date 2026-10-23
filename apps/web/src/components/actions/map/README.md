# Carte des Actions

Cette arborescence porte la composition React de la carte Actions : filtres,
marqueurs, couches, popups, export et états d'affichage.

## Arborescence

```text
map/
├── popup/      popups d'action, corridors et scores de popup
├── filters/    filtres, modes et états d'affichage
├── controls/   contrôles cartographiques et scope de score
├── layers/     couches, clusters, géométrie et qualité cartographique
├── export/     export CSV, GeoJSON et contrôles d'export
├── selection/  panneau et carte de l'action sélectionnée
└── scores/     références de score et scope de pollution
```

Les tests restent auprès du module qu'ils couvrent. La racine ne contient pas
de barrel global : les consommateurs importent directement la famille
propriétaire.

## Frontière avec le domaine

```text
components/actions/map/
→ composition visuelle, interactions et états UI

lib/actions/ et lib/geo/
→ contrats, règles métier, géométrie et normalisation
```

Les composants consomment les contrats canoniques mais ne recréent ni la
taxonomie Actions, ni les règles de qualité, ni les calculs géographiques.
Les données observées, prédites, réseau et fallback doivent rester distinguées
dans l'affichage ; un état inconnu ne doit pas devenir une affirmation visuelle.

Les helpers purs liés à un rendu peuvent rester dans ce dossier lorsqu'ils
appartiennent réellement à la carte. Un contrat réutilisable hors UI doit
rejoindre son module domaine propriétaire.

## Calque historique Plastic Origins

La carte complète propose le calque facultatif **Plastic Origins | Observations
historiques**. Il est désactivé par défaut, chargé uniquement après activation
et filtré selon le viewport. Il consomme l'export statique
`apps/web/public/data/plastic-origins/observations.json`, produit à partir des
quatre CSV du jeu [Déchets en rivière en France](https://www.data.gouv.fr/datasets/dechets-en-riviere-en-france).

Ce calque est une source historique indépendante : ses points ne rejoignent pas
le contrat `ActionMapItem`, les KPI, les scores, les filtres Actions, les
exports CleanMyMap ou le générateur d'itinéraires. Les popups conservent la
campagne, la date, la catégorie et la méthode source ainsi que les données
disponibles. Le chargement utilise un cache immutable côté client, une requête
partagée par module et un cache HTTP du fichier statique ; il ne sollicite donc
aucune API métier ni quota Supabase. Les doublons exacts sont regroupés dans
l'export sans suppression des lignes sources ; leurs numéros de lignes restent
consultables dans la provenance.

La fiche data.gouv.fr actuelle publie le jeu sous ODbL par Plastic Origins /
Surfrider Foundation Europe. Le PDF de documentation téléchargé affiche encore
CC BY-NC 3.0 France ; cette divergence est conservée dans la provenance et
reste à clarifier avec la source avant toute réutilisation plus large.
Les CSV indiquent des latitudes et longitudes décimales relevées par téléphone,
mais ne déclarent pas de système de référence : l'export ne fabrique pas de
CRS et ne reprojette pas les coordonnées. Le contrôle reproductible se lance
avec `npm run audit:plastic-origins` après téléchargement des ressources dans
`.artifacts/plastic-origins-audit`.

## Validation

Conserver les tests auprès de la capacité qu'ils vérifient. Pour un changement
local :

```text
npm run test -w apps/web -- src/components/actions/map
npm run typecheck -w apps/web
npm run lint -w apps/web
```
