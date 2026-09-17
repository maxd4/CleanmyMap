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
apps/web/src/components/actions/map/use-actions-map-filters.ts
apps/web/src/components/actions/map/action-pollution-score-references-context.tsx
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
  les catégories réellement filtrables et la réinitialisation ;
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

`homepage-preview` peut utiliser un viewport et une limite plus petits, ainsi
qu'une présentation compacte et des contrôles masqués. Ces différences sont
bornées à la présentation et au volume affiché : à viewport et période
identiques, l'éligibilité, le score et la couleur restent ceux de la carte
publique. Une action disposant d'un score valide ne devient donc pas grise sur
la homepage ; le gris reste réservé à l'indisponibilité réelle du score et le
chargement possède sa couleur dédiée.

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

## Contrat des filtres publics

Le flux public de cette route est limité aux actions `approved` visibles et aux
pré-actions futures valides (`pending`, `actionPhase = pre_action`, date
strictement future). Ces pré-actions sont exposées comme `approved` dans la
projection de carte uniquement ; leur statut persisté reste `pending` et elles
ne contribuent pas aux KPI Impact. Les autres actions `pending`, `rejected` ou
masquées restent exclues. Ce contrat est appliqué par la requête de la page ;
il n'est pas exposé comme un choix utilisateur.

Les seuls contrôles de filtrage affichés sont ceux qui modifient effectivement
la vue :

- recherche par zone ou lieu ;
- période (`Année en cours` ou `Depuis la création`) ;
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

La couleur ne porte pas la fiabilité géométrique :

- trait plein : parcours déclaré ou connu ;
- trait pointillé : parcours indicatif ou reconstruit ;
- polygone rempli à bord plein : zone réelle ou indicative ;
- point : localisation seule ;
- épaisseur : sélection et lisibilité, jamais score.

Une action sans tracé réel peut recevoir une géométrie reconstruite côté serveur.
La topologie canonique est `loop` ou `point_to_point`, indépendamment de
`routeStyle`. Une `loop` impose un départ et revient explicitement à ce départ ;
un `point_to_point` suit `départ → [mi-parcours] → arrivée` sans retour
automatique. Les payloads historiques sont normalisés : une arrivée renseignée
sans topologie signifie `point_to_point`, sinon `loop`. Une arrivée absente ou
impossible à localiser dans le mode `point_to_point` produit une validation
explicite.

`routed` désigne une géométrie retournée par le réseau piéton FOSSGIS/OSRM ;
`estimated_route` désigne uniquement le repli local déterministe lorsque ce
réseau ou son quota est indisponible. La distance cible saisie dans
`/actions/new` n'est jamais confondue avec la distance réseau finale. Le
navigateur ne déclenche pas de routage pour produire ou recaler cette géométrie.

Un fichier GPX valide constitue un tracé fourni par l'utilisateur : sa source
reste `gpx_import`, sa longueur observée est calculée séparément de la distance
cible, et aucun routage ou snapping ne le remplace. Le formulaire conserve les
segments dans leur ordre ; un fichier multi-segment est refusé tant que la
géométrie canonique ne sait pas les persister sans inventer une liaison. La
topologie choisie doit être cohérente avec le caractère fermé ou ouvert du GPX.

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
- [Propositions à traiter](./actions-map-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./actions-map-objectifs-non-pertinents.md)
