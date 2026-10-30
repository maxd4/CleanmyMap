# Carte des actions

## Fiche canonique

- **Route** : `/actions/map`
- **Accès runtime** : `public-visible`
- **Famille** : Cartographie & Impact
- **Palette runtime** : sky
- **Source principale** : `apps/web/src/app/(app)/actions/map/page.tsx`

La route n'est pas protégée par le proxy et figure dans le sitemap public.

## Sources fonctionnelles

```txt
apps/web/src/app/(app)/actions/map/page.tsx
apps/web/src/components/actions/map-feed/actions-map-feed.tsx
apps/web/src/components/actions/map-feed/actions-map-initial-viewport.ts
apps/web/src/components/actions/actions-map-table.tsx
apps/web/src/components/actions/map/filters/use-actions-map-filters.ts
apps/web/src/components/actions/map/scores/action-pollution-score-references-context.tsx
apps/web/src/lib/actions/pollution/revisit-priority.ts
```

## Objectif utilisateur

Explorer les actions et hotspots, filtrer la vue, sélectionner une action et lire les principaux indicateurs terrain.

## Structure actuelle

- header Cartographie & Impact ;
- CTA Déclarer ;
- CTA Méthodologie ;
- carte immersive ;
- barre de contrôles directement sur la carte : `Filtrer`, `Affichage`, `Légende` et `Recentrer` ;
- `Filtrer` regroupe la recherche locale dans les éléments chargés, la période,
  le contexte d'action, les catégories réellement filtrables et la
  réinitialisation ;
- `Affichage` regroupe la référence `Global`/`Département`, le mode
  `Observé`/`Projeté`, les calques et le fond clair/contrasté ;
- sélection d'action ;
- KPI compacts et secondaires : résultats terrain (`kg`, mégots, bénévoles) et
  proxys explicitement qualifiés (`CO₂e`, eau, économie de voirie) ;
- légende canonique compacte avec résumé couleurs/infrastructure et détails des
  seuils, états et géométries en disclosure ;
- contexte de la vue avec les compteurs visibles/chargés ;
- export de la vue ;
- journal des actions filtrées ;
- passerelle facultative vers `/reports` pour l'analyse approfondie.

La page ne présente pas de carrousel « Dernières actions », de badge d'urgence
ou d'illustration photographique générique. Les analyses temporelles, profils
d'impact et regroupements par arrondissement ne sont pas recopiés sous la
carte : `/reports` reste la destination canonique lorsqu'un équivalent valide
est disponible.

La page ne présente pas les diagnostics techniques de qualité géométrique dans
la vue publique. La carte conserve sa géométrie et ses interactions ; les
informations utiles à la lecture restent accessibles via la légende compacte.

La recherche exposée sous `Filtrer` est un filtrage textuel local des éléments
déjà chargés dans la vue. Elle ne géocode pas et n'appelle aucun service
externe. `impactFilter` et `qualityMin` restent des paramètres internes du feed
partagé, mais ne font plus partie de l'état utilisateur persistant de cette
carte : les anciennes clés sont ignorées à la lecture du localStorage.

Le contexte d'action est une dimension métier persistée indépendante de
`action`, `clean_place` et `spot` : `citizen`, `company` ou `school`, avec une
valeur absente affichée comme `Non classée`. Une cleanwalk familiale reste
`citizen` ; aucune majorité d'enfants, adresse, nom d'organisateur ou type de
marqueur n'est recalculé par la carte. La carte affiche un pictogramme distinct
(`👥`, `🏢`, `🎓` ou `?`) dans les tooltips de marqueur, les popups, la sélection
et le journal. Cette information ne remplace jamais la couleur de pollution.

## Feed public partagé avec la homepage

La carte de la homepage est une preview du même feed cartographique public que
`/actions/map`. Les deux surfaces partagent le contrat `ActionsMapFeed` :

- éléments publics `approved` ;
- politique temporelle canonique `current_year`, calculée par
  `getActionsMapCurrentYearDays()` ;
- impact `all` et qualité minimale `0` par défaut ;
- types et sémantique des catégories issus de `MarkerCategory` et
  `DEFAULT_VISIBLE_CATEGORIES` ;
- références de score fournies par
  `ActionPollutionScoreReferencesProvider` →
  `/api/actions/map/pollution-score-references` (snapshot V6, fallback RPC V2).

Le filtre de contexte est transmis à `/api/actions/map` et appliqué aussi dans
le fallback direct `actions_map_feed` : `Tous`, `Citoyenne`, `Entreprise`,
`Scolaire` ou `Non classée`. Il se combine avec la période, le viewport, la
zone, le type d'entité et les catégories de pollution. La réinitialisation et
la persistance locale suivent le contrat existant des filtres.

`homepage-preview` peut utiliser un viewport et une limite plus petits, ainsi
qu'une présentation compacte et des contrôles masqués. Ces différences sont
bornées à la présentation et au volume affiché : à viewport et période
identiques, l'éligibilité, le score et la couleur restent ceux de la carte
publique. Une action disposant d'un score valide ne devient donc pas grise sur
la homepage ; le gris reste réservé à l'indisponibilité réelle du score et le
chargement possède sa couleur dédiée.

Les cartes secondaires utilisent le même composant avec `deferUntilVisible`.
Avant que le shell n'entre dans le viewport utile, ni
`ActionPollutionScoreReferencesProvider` ni `useMapFeedData` ne sont montés ;
les références de score et le feed restent donc absents du réseau. Le shell
réutilise le déclencheur `useInViewOnce` existant, puis le cache SWR partagé est
réutilisé lors d'un retour sur la carte. `/actions/map`, carte principale,
n'active pas cette option et conserve son chargement normal, sa légende et ses
couleurs.

Le navigateur conserve actuellement `/api/actions/map` comme lecture principale
et `actions_map_feed` comme fallback. Une bascule RPC-first est volontairement
bloquée : le DTO RPC ne transporte pas encore `action_phase`, `published_at` et
`event_start_time`, alors que la projection API les conserve pour les
pré-actions futures publiées. La transformation existante peut donc préserver
la visibilité, les bornes, les spots, les géométries et la projection
public-safe, mais pas démontrer la parité complète du DTO, des scores et des
CTA futurs. Aucun consommateur cartographique ne doit inverser cet ordre avant
que cette parité soit prouvée sans changement de RLS/AuthZ.

## Viewport initial public

À l'ouverture, la carte ne présente pas de viewport monde neutre. La référence
géographique suit l'ordre navigateur GPS puis préférence de résidence. Le
resolver public recherche alors, par rayons bornés, l'action `approved` visible
géolocalisée la plus proche. Les rayons sont `5`, `20`, `75` puis `150 km`.
Si aucun point n'est trouvé, une requête globale bornée à `limit=1` sélectionne
l'action publique géolocalisée la plus récente, puis le resolver reprend sur son
viewport local. Cette étape ne charge jamais le dataset mondial complet.

Le cadrage par ville n'est utilisé que lorsqu'une identité postale fiable est
présente dans le libellé structuré. `preparationData.communeZoneLabel` peut
décrire une ville, un quartier ou un secteur ; il n'est donc pas traité comme
une clé canonique par égalité. Sans ville fiable, le viewport est construit sur
un cluster local borné autour de l'action sélectionnée, sans présenter ce
cluster comme un regroupement exact par commune et sans déduire une ville des
coordonnées.

Sans GPS ni résidence, la première action publique récente sert de fallback
déterministe, puis le même cadrage postal ou cluster local est appliqué. Chaque
lecture reste bornée par un rayon et une limite ; aucune table `actions` complète
n'est chargée pour préparer le viewport. Si aucune action publique géolocalisée
n'est disponible, la page affiche l'état vide canonique et ne montre pas de
globe.

Une erreur de résolution ne vaut pas état vide. Lorsqu'un viewport GPS ou de
résidence stable existe déjà, il est conservé et le flux principal borné peut
se charger dessus. Lorsqu'aucun viewport exploitable n'existe, la page expose
un état d'erreur avec retry ; elle ne désactive pas silencieusement le flux ni
ne revient à `[0,0]`.

Le viewport résolu devient aussi la cible du contrôle « Recentrer ». Après un
déplacement ou un zoom manuel, aucun résultat asynchrone ultérieur ne reprend
le contrôle de la carte.

## KPI publics et statistiques contextuelles

Les six KPI affichés dans le ruban compact (`wasteKg`, `butts`, `volunteers`,
`co2`, `water`, `euro`) sont les indicateurs publics consolidés CleanMyMap. Ils
portent le libellé explicite « Bilan global CleanMyMap — indépendant des filtres
de cette carte » et proviennent du même `PublicImpactSnapshot` et du même
contrat `PublicImpactMetric[]` que les KPI de la page d'accueil. Ils ne
dépendent ni du viewport, ni des catégories visibles, ni de la recherche, ni de
la période locale de la carte. Les pré-actions peuvent rester visibles sur la
carte, mais ne contribuent pas à ces six KPI.

Les statistiques de carte sont d'un autre niveau : `visibleCount` et
`loadedCount` décrivent respectivement les objets cartographiques actuellement
affichés et chargés dans le flux courant. Elles peuvent varier avec les filtres,
la recherche ou le viewport sans modifier les KPI publics consolidés.

Le journal public reste une table native. Il expose les date, lieu, type,
tracé, lecture de pollution, impact/qualité et une action explicite ; les
coordonnées et le statut technique restent secondaires ou exportables. Une
absence d'`impact_level` est rendue « Indisponible » et une absence de
`quality_grade` « Non évalué » : aucune valeur par défaut ne simule une
évaluation.

Le ruban rend directement les champs du contrat partagé (`label`, `value` et
`classification`) ; il ne redéfinit ni les libellés, ni l'ordre, ni les unités,
ni les arrondis. Aucun endpoint, polling ou agrégat supplémentaire n'est
introduit pour cette présentation.

## Séparation des calques

La carte ne doit pas confondre mémoire des interventions et pollution actuellement actionnable :

| Calque | Sens métier |
|---|---|
| Actions | interventions documentées, pollution constatée avant l'action et pollution projetée |
| Trash Spotter | pollution actuellement signalée et encore actionnable |

Une action ancienne ne devient jamais automatiquement un nouveau spot Trash Spotter.

## Calques cartographiques publiés

Le panneau `Affichage` expose les cinq calques suivants sur la carte complète.
Les quatre calques CleanMyMap utilisent le feed public partagé déjà décrit
ci-dessus ; ils ne déclenchent pas une lecture supplémentaire par point. Le
calque Plastic Origins est une source historique externe autonome.

| Calque | Activation et chargement | Provenance et limite géographique | KPI, scores, exports et itinéraires |
|---|---|---|---|
| Points | Activé par défaut avec le feed public de la carte. | Points issus des `ActionMapItem` publics chargés pour la vue ; ils restent bornés par le feed, ses filtres et le viewport courant. | Conserve le contrat Actions existant : sélection, couleurs de score et export de la vue restent ceux de la carte. Il ne crée pas d'itinéraire supplémentaire. |
| Parcours & zones | Activé par défaut avec les mêmes éléments Actions ; les géométries déjà disponibles sont rendues dans la vue. | Parcours et zones provenant des contrats géométriques des actions publiques ; une géométrie estimée ou reconstruite conserve sa provenance et ne devient pas une trace GPS. | Conserve la sélection, la légende, les scores et l'export Actions existants. Le rendu ne déclenche pas de routage et n'alimente pas automatiquement le générateur d'itinéraires. |
| Infras | Activé par défaut ; rendu à partir des signaux d'infrastructure des éléments déjà chargés. | Besoins `bac`, `cendrier` ou combinés dérivés des signaux publics d'action ; aucune couverture géographique supplémentaire n'est déduite au-delà des éléments visibles. | Les seuils affichés restent une lecture du contrat d'infrastructure et des références de score existantes. Le calque n'ajoute aucun KPI, export ou itinéraire. |
| Trash Spotter | Activé par défaut ; filtré dans le feed public partagé, sans chargement séparé de preuves au montage. | Signalements publics encore actionnables, limités aux éléments et au viewport de la carte. Les preuves photo restent chargées uniquement après l'action explicite du popup. | Conserve la symbologie, les filtres et la sélection existants ; il ne modifie pas les KPI consolidés et ne fabrique pas d'itinéraire. |
| Plastic Origins \| Observations historiques | Facultatif et désactivé par défaut. Disponible uniquement sur la carte complète ; le fichier statique est chargé à la demande après activation, puis filtré côté client selon le viewport. | Observations historiques réelles du jeu [Déchets en rivière en France](https://www.data.gouv.fr/datasets/dechets-en-riviere-en-france). La fiche conserve date, catégorie, méthode, campagne et lignes sources. Les coordonnées lat/lon sont conservées sans reprojection : la source ne déclare pas de CRS et la carte ne prétend pas fournir une couverture exhaustive. | Source indépendante des actions CleanMyMap : aucune contribution aux KPI, aux scores ou aux filtres Actions ; aucune ligne dans l'export Actions et aucun apport au générateur d'itinéraires. Symbologie et popups de provenance restent séparés. |

L'activation de Plastic Origins ne transforme jamais une observation historique
en action CleanMyMap, en spot Trash Spotter, en mesure de score ou en résultat
d'impact. Les doublons exacts sont regroupés dans l'export statique sans
supprimer les lignes sources ; les références de ressource et de ligne restent
disponibles dans la provenance. La fiche data.gouv.fr actuelle indique ODbL ;
la documentation PDF téléchargée indique encore CC BY-NC 3.0 France. Cette
divergence de licence reste explicitement signalée dans la provenance et ne
doit pas être résolue par une déduction locale.

## Contrat des filtres publics

Le flux public de cette route est limité aux actions `approved` visibles et aux
pré-actions futures valides (`pending`, `actionPhase = pre_action`, date
strictement future). Ces pré-actions sont exposées comme `approved` dans la
projection de carte uniquement ; leur statut persisté reste `pending` et elles
ne contribuent pas aux KPI Impact. Une pré-action future classée `school` est
cependant exclue de la carte et de `actions_map_feed` tant qu'aucune projection
géographique généralisée et sécurisée n'est définie : aucune coordonnée
scolaire future protégée ne doit traverser la frontière publique. Les actions
scolaires approuvées et finalisées restent visibles. Les autres actions
`pending`, `rejected` ou masquées restent exclues. Ce contrat est appliqué par
l'API, le fallback RPC et la projection SQL, pas uniquement par l'interface.

Dans la RPC canonique, cette exclusion est appliquée dans la sélection des
actions avant l'union avec les spots, le tri stable et la limite finale ; une
pré-action scolaire exclue ne consomme donc pas une place de pagination.

Les seuls contrôles de filtrage affichés sont ceux qui modifient effectivement
la vue :

- recherche par zone ou lieu ;
- période (`Année en cours` ou `Depuis la création`) ;
- contexte d'action (`Tous`, `Citoyenne`, `Entreprise`, `Scolaire`, `Non classée`) ;
- catégories visibles ;
- réinitialisation des filtres.

Il n'y a pas de filtre `Statut` ni d'option `Toutes les actions` sur la carte
publique, car aucune action non approuvée ne fait partie de son contrat de
visibilité.

## Logique de score constaté

Le score historique reste calculé par le contrat de score existant :

```txt
score déchets = kg / bénévole
score mégots = mégots / bénévole
score global = max(score déchets, score mégots)
```

Référence :

```txt
plus forte valeur par bénévole parmi les actions approuvées
```

La référence globale est capturée par le job hebdomadaire
`MAP_POLLUTION_REFERENCES` dans le snapshot public
`map-pollution-score-references`. La carte lit cette petite référence
persistée ; si elle est absente, le contrat de lecture expose explicitement
un fallback RPC temporaire en mode dégradé uniquement. La version attendue est
`map-pollution-score-references-2026.09-v6-pre77-approved-visible-population` et
la source du payload est `action_pollution_score_references_v2`. En régime
nominal, `GET /api/actions/map/pollution-score-references` retourne donc
`source = weekly_snapshot`, avec une date de snapshot et une date de génération.
Ce snapshot ne fige ni le score d'une action, ni sa projection temporelle, ni
sa couleur ou la légende : scores, couleurs et projection sont calculés à la
lecture par le runtime.

Formules :

```txt
score déchets =
clamp((kg / bénévole / référence déchets) × 100, 0, 100)

score mégots =
clamp((mégots / bénévole / référence mégots) × 100, 0, 100)
```

Règles :

- pas de mélange entre déchets et mégots ;
- pas de pondération ;
- même référence partagée entre carte, popup et tableau ;
- popup chargé à la demande ;
- pas de fetch score séparé par popup.

Ce score est une pollution constatée avant l'action, pas une pollution actuelle. Il ne doit pas être réécrit par le temps écoulé.

La carte ne présente jamais la pollution projetée comme une mesure actuelle du terrain. La fraîcheur affichée concerne uniquement la dernière actualisation du flux de données (`Dernière actualisation ...`), pas l'actualisation d'une pollution mesurée.

Les `kg`, mégots et bénévoles affichés dans les KPI restent des résultats terrain. Le `CO₂e`, l'eau et l'économie de voirie sont des proxys/estimations et portent cette qualification directement sur la carte. Aucun facteur ni calcul de projection n'est modifié par cette présentation.

## Projection de re-pollution

La couleur d'une action repose sur une projection non linéaire, calculée dans :

```txt
apps/web/src/lib/actions/pollution/revisit-priority.ts
```

Le score historique `S` et le nombre de jours `t` restent séparés :

```txt
T80(S) = 28 + 152 × (1 - S / 100)²
P(t) = S_post + (S - S_post) × (1 - exp(-ln(5) × t / T80(S)))
```

Le modèle utilise `S_post = 0` lorsque aucune mesure post-nettoyage explicite n'est disponible. Cette valeur est une hypothèse de modèle, pas une mesure terrain. Le champ optionnel `postActionPollutionScore` prend priorité lorsqu'une mesure réelle est fournie.

Ordres de grandeur du `T80` : `S=20 → 125 j`, `S=50 → 66 j`, `S=80 → 34 j`, `S=100 → 28 j`.

Une calibration locale pourra remplacer le `T80` générique via l'option de calibration prévue par l'API de projection.

## Lecture rapide des couleurs

```txt
bleu    = premier seuil de pollution projetée
orange  = seuil suivant de pollution projetée
rouge   = pollution projetée forte
violet  = pollution projetée critique
noir    = pollution projetée extrême
vert    = lieu explicitement propre uniquement
```

La progression entre les repères de couleur est continue. Les seuils exacts sont centralisés dans `ACTION_POLLUTION_COLOR_THRESHOLDS` ; le vert n'est jamais un niveau de faible pollution pour une action.

Le vert est réservé aux zones explicitement déclarées propres (`clean_place`).
Il ne signifie ni score nul, ni score très faible, ni absence de donnée, ni
géométrie en cours d'édition. Dans `ActionDrawingMap`, toute géométrie en
cours de création ou d'édition reste gris foncé neutre jusqu'à la résolution
du contrat final ; elle ne prédit pas la couleur scientifique publique.

Sur `Plan clair`, le niveau extrême reste noir. Sur `Plan contrasté`, le même
niveau est adapté en blanc pour l'accessibilité visuelle ; les autres parcours
et contours de zones reçoivent un casing blanc très fin. Le casing et le blanc
de contraste ne modifient jamais le score, la catégorie ou la grammaire
géométrique.

## Lecture des tooltips et popups

Une action doit distinguer explicitement :

```txt
Pollution constatée avant l'action : S %
Pollution projetée : P %
Temps depuis la dernière action : t jours
Estimation modélisée, pas une mesure en temps réel
```

Les valeurs `S` et `P` restent calculées sur l'échelle interne `0–100`. Leur
format d'affichage est défini par la règle commune
[`ui-score-formatting.md`](../../../../design-system/ui-score-formatting.md).

Les résultats collectés restent présentés comme des résultats de l'action, et non comme une pollution résiduelle mesurée.

## Géométrie et interactions

La couleur porte uniquement la lecture de pollution. Elle ne porte jamais la
fiabilité géométrique. La présentation publique distingue les provenances
suivantes, sur la carte, dans la légende, les tooltips et les popups :

- `Trace GPS enregistrée` : trace terrain `gps_tracking` issue d'une mission
  mobile liée, trait plein ;
- `Trace GPX fournie` : trace `gpx_import` fournie et validée par l'utilisateur,
  trait plein ;
- `Couverture observée multi-traces` : plusieurs traces attribuées
  à une même action, rendues comme lignes indépendantes. Le libellé ne signifie
  ni un trajet commun ni une liaison entre les bénévoles ; les distances
  individuelles restent distinctes et la distance de couverture cumulée est
  indisponible sans politique de dédoublonnage versionnée ;
- `Parcours déclaré` : parcours dessiné ou déclaré, trait plein ;
- `Itinéraire prévu sur le réseau` : parcours piéton retourné par le réseau,
  trait pointillé régulier ;
- `Itinéraire prévu estimé` : estimation sans trace observée, trait pointillé ;
- `Liaison indicative non routée` : repli géographique sans réseau, trait
  pointillé léger uniquement pendant la préparation ; après action, le rendu
  devient le point `Parcours non documenté` ;
- `Zone d'action` : surface déclarée à bord plein ;
- `Repère géographique indicatif` et `Zone indicative` : contexte spatial à
  contour pointillé, jamais couverture nettoyée ;
- `Localisation seule` : point sans tracé.

Un trait pointillé représente une hypothèse géographique, jamais une trace GPS
observée. L'épaisseur sert uniquement à la sélection et à la lisibilité ; elle
ne constitue pas un score.

Une couverture observée est prioritaire sur une géométrie manuelle, de référence
ou planifiée. Une géométrie de référence déjà persistée reste conservée pour
l'historique, mais n'est pas exposée comme un faux parcours public. Cette même
provenance est reprise dans le tableau, la sélection, le journal et l'export
GeoJSON ; l'export conserve les MultiLineString observées et leurs labels.

La mission mobile, ses `gps_points` et les contributions sources restent privés
et owner-scoped. `/actions/map` reçoit uniquement la projection bornée via le
contrat normal de l'action, sans lire les missions ni exécuter de requête GPS
par action. Ainsi, le tracking GPS est une observation terrain et la
reconstruction réseau une hypothèse ; plusieurs observations ne deviennent
jamais le « trajet réel de tous les bénévoles ».

Une action sans tracé réel peut recevoir une géométrie reconstruite côté serveur.
La topologie canonique est `loop` ou `point_to_point`, indépendamment de
`routeStyle`. Une `loop` impose un départ et revient explicitement à ce départ ;
un `point_to_point` suit `départ → [mi-parcours] → arrivée` sans retour
automatique. Les payloads historiques sont normalisés : une arrivée renseignée
sans topologie signifie `point_to_point`, sinon `loop`. Une arrivée absente ou
impossible à localiser dans le mode `point_to_point` produit une validation
explicite.

`routed` désigne une géométrie retournée par le réseau piéton FOSSGIS/OSRM ;
`estimated_route` porte le repli local déterministe lorsque ce réseau ou son
quota est indisponible. Le runtime lit `routeGeometryMode` et
`routeGeometryProvider` pour différencier le parcours estimé de la liaison
indicative ; une ancienne donnée sans ces métadonnées reste rendue comme
`Parcours estimé`, sans inventer un fournisseur.

Les distances gardent leur provenance : `Distance enregistrée` ou longueur
calculée depuis la géométrie pour une observation, `Longueur du parcours
planifié` pour le réseau, `Distance cible` lorsqu'aucune longueur planifiée
n'est disponible, et `Longueur indicative non routée` uniquement pour une
géométrie indicative encore affichée en préparation. Une couverture multi-traces
n'annonce pas de distance cumulée. Le navigateur ne déclenche pas de routage
pour produire ou recaler cette géométrie.

Un fichier GPX valide conserve sa source et sa longueur séparément de la
distance cible ; aucun routage ou snapping ne le remplace. Les exports du
générateur portent explicitement la provenance `planned` et restent des
itinéraires prévus lors d'une réimportation. Les traces terrain déclarées
utilisent `gpx_import` après contrôle d'éligibilité ; `gps_tracking` reste
réservé aux traces issues du suivi mobile. Plusieurs fichiers ou segments
restent des lignes indépendantes : la carte peut les projeter en
`MultiLineString`, sans créer de liaison ni de distance de couverture unique.

Les polylines disposent d'une zone de clic/touch invisible élargie. L'action « Voir tout le tracé » cadre explicitement la géométrie sans recentrage automatique à chaque sélection.

Infrastructure :

```txt
bac       = besoin collecte
cendrier  = besoin mégots
combiné   = deux besoins
seuil     = 75
```

## Performance

La page demande une vigilance particulière :

- carte plein écran ;
- jusqu'à 300 éléments chargés dans le flux courant ;
- composants cartographiques chargés dynamiquement ;
- références de score partagées ;
- éviter les fetchs supplémentaires à l'ouverture d'un détail.
- les cartes secondaires peuvent différer le provider de références et le feed
  jusqu'à leur visibilité effective, sans différer la carte principale ;
- Les preuves photo Trash Spotter ne sont pas chargées avec la carte ni à
  l'ouverture du popup : le popup spot/clean_place propose une action explicite
  « Voir les preuves photo ». Le GET média n'est déclenché qu'après ce clic et
  le résultat est conservé dans l'instance locale du popup ; les actions
  terrain ne déclenchent aucun contrôle média.

## États à couvrir

```txt
loading
empty
error
filtres sans résultat
action sélectionnée
action désélectionnée
```

Un état `access refused` n'est pas un état normal de cette route publique.

## Fichiers associés

- [Présentation détaillée](./actions-map-presentation-detaillee.md)
- [Méthodologie produit de la projection](../../../../product/methodologie-carte-actions.md)
- [Objectifs non pertinents](./actions-map-objectifs-non-pertinents.md)
