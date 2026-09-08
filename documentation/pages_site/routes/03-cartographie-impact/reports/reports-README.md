# Rapports d'impact

## Fiche canonique

- **Route** : `/reports`
- **Famille** : Cartographie & Impact
- **Palette runtime** : red
- **Accès visiteur** : `auth-blur-gate`
- **Accès page complète** : compte connecté
- **Génération et historique** : compte connecté, sur son propre historique
- **Exports détaillés de l'analyse** : profils admin-like
- **Source principale** : `apps/web/src/app/(app)/reports/page.tsx`

## Contrat d'accès

La route n'est pas simplement « publique ».

Le composant serveur charge la session.

Sans `userId` :

```txt
ClerkRequiredGate
mode = blur
```

Avec compte connecté :

```txt
accès à la page de rapports
```

Pour la génération de document et son historique :

```txt
requireAuthenticatedAccess()
historique filtré par created_by_clerk_id = userId courant
```

Les exports détaillés de l'onglet Analyse restent réservés aux profils
admin-like :

```txt
isAdminLikeProfile(profile) = true
```

## Données

La page charge en parallèle :

```txt
pilotage overview sur 90 j
jusqu'à 2 200 actions approuvées
événements communautaires
```

## Fonctionnalités

- aperçu global des quatre indicateurs d'impact du `ReportModel` ;
- qualité des données et couverture cartographique, présentées séparément des
  impacts ;
- tendances mensuelles de la collecte (masse collectée et bénévoles) sur les
  12 derniers mois glissants ;
- comparaisons de périodes issues de l'overview de pilotage ;
- méthode KPI ;
- données d'actions ;
- événements communautaires ;
- génération de document ;
- exports pour profils autorisés.

La météo et la logistique ne font pas partie du contrat `/reports` et ne
conditionnent pas la génération d'un rapport d'impact. Elles restent des
capacités produit séparées.

## Sémantique des indicateurs visibles

Le snapshot ne présente que les champs fournis par `ReportModel` et conserve
leurs unités. Les valeurs d'impact issues de `IMPACT_PROXY_CONFIG` sont
qualifiées de `proxy` ; elles ne constituent pas des mesures instrumentales.

| Champ | Libellé visible | Unité / qualification |
|---|---|---|
| `climate.co2AvoidedKg` | Émissions évitées (proxy) | kg CO₂e |
| `climate.waterProtectedLiters` | Eau préservée (proxy) | L |
| `recycling.recyclableKg` | Masse recyclable estimée | kg |
| `recycling.triIndex` | Indice de tri (proxy) | % |
| `quality.completenessScore` | Complétude des données | % |
| `quality.coherenceScore` | Cohérence des données | % |
| `map.geoCoverage` | Couverture géolocalisée | % |
| `map.traceCoverage` | Couverture des traces | % |

La complétude et la cohérence décrivent la qualité du jeu de données. Elles ne
sont pas des niveaux de pollution, et le complément à 100 de la complétude
n'est pas affiché comme une incertitude scientifique. Aucun objectif chiffré
statique n'est affiché : le modèle d'objectifs configurables est hors de ce
lot.

## Contrat temporel de l'analyse

L'`overview` de Pilotage conserve son historique nécessaire aux comparaisons
30/90/365 jours et à la tendance historique. La couche Reports dérive la
fenêtre KPI courante avec `filterContractsToWindow`, à partir de
`dates.observedAt` et de la borne inclusive `[now - periodDays, now]`; les
dates invalides et les dates futures sont exclues. Le même instant `now` est
utilisé pour le filtrage et la construction du `ReportModel`.

Pour `periodDays = 90`, les comparaisons Pilotage utilisent les 90 jours
précédents sur l'intervalle `[now - 2 × periodDays, now - periodDays)` : la
borne basse est incluse et la borne haute exclue, comme dans
`computePilotageComparison()`.

Les cartes KPI, la qualité et la cartographie sont construites uniquement sur
la fenêtre courante de 90 jours. La série Tendances est distincte : elle est
alimentée par les contrats historiques de la fenêtre de 365 jours et reste
libellée « 12 derniers mois glissants ». Aucun sélecteur de période n'est
ajouté à l'onglet Analyse ; celui de Génération reste indépendant.

## Référentiel méthodologique KPI

Lorsque l'aperçu Pilotage est disponible, `/reports` conserve les 8 méthodes
produites par `buildMethods()`. Chaque entrée affiche le nom du KPI et sa
formule principale; un disclosure accessible expose la source, la fréquence de
recalcul et les limites. La présentation utilise une grille dense sur desktop
et une colonne sur mobile.

Le recalcul est déclenché lors du rafraîchissement de l'`overview`; la vue
`reports/pilotage` peut servir le résultat depuis le cache serveur pendant
10 minutes. Cette fraîcheur/cache est distincte de la formule de calcul et ne
signifie pas qu'un recalcul a lieu à chaque affichage.

La version n'est pas inventée dans l'interface. Lorsqu'une version runtime est
fournie par la méthodologie d'impact, elle reste visible dans la source de la
méthode concernée; sinon aucune version n'est affichée. Les formules, sources,
fréquences et limites restent celles du contrat `MethodDefinition` partagé avec
Pilotage. Le référentiel affiche les huit méthodes dans un accordéon accessible
et dense sur desktop comme sur mobile.

## Génération et modules optionnels

La génération conserve toujours les chapitres cœur « Synthèse exécutive »,
« Périmètre du rapport » et « Résultats terrain ». Le niveau de détail fournit
un paramètre de génération conservé dans le payload et l'historique. Il ne
sélectionne, ne désélectionne et ne verrouille aucun module ou chapitre. Les
cases des modules optionnels portent la composition du rapport ; leur état
initial reste la composition actuelle et peut être modifié individuellement.
Le même `ModuleState` est transmis au résumé du preview, à `buildPdfData()` et
au PDF.

| Module interne | Libellé | Chapitres / contenu contrôlés |
|---|---|---|
| `dataAndCartography` | Données & cartographie | Cartographie d’impact, contexte local et données géographiques |
| `transparencyAndMethods` | Transparence & méthodes | Impacts/proxies, qualité, méthodologie, hypothèses et limites |
| `rawData` | Données brutes | Listes détaillées, mobilisation, calendrier et lignes brutes exportées |
| `detailedFiles` | Fichiers détaillés | Glossaire, annexes et pièces techniques |

Un module désactivé est absent du preview et du PDF, sans chapitre de
remplacement ni faux placeholder. Cette sélection relève uniquement des
modules, pas de `Concis`, `Par défaut` ou `Exhaustif`. Le contenu précis des
modules et l'effet fonctionnel futur des trois niveaux de détail feront l'objet
d'un chantier séparé. Le sélecteur de période de Génération est indépendant de
la fenêtre fixe de l'onglet Analyse.

## Préconfiguration depuis une action validée

Une action réellement validée pourra proposer « Générer un rapport d'impact ».
Ce bouton ne génère pas directement le PDF : il ouvre le générateur canonique
de `/reports` avec une configuration déjà préparée pour produire un rapport
portant uniquement sur cette action.

Le générateur de `/reports` reste la seule source de vérité. Il ne doit pas
exister de second moteur de rapport spécifique aux pages d'action. Le bouton
d'une action ne fait que préparer le périmètre initial ; après vérification
éventuelle par l'utilisateur, la génération suit le pipeline normal de
`/reports`.

Le contrat conceptuel de préconfiguration doit transmettre explicitement et de
manière typée l'identifiant canonique de l'action, par exemple :

```txt
scope:
  type: single_action
  actionId: <id canonique>
```

Ce fragment est un équivalent conceptuel futur dans `ReportDataFilters`, pas la
définition du format final de l'URL. À l'arrivée dans `/reports`, le backend
doit résoudre cet identifiant vers l'action réelle et vérifier qu'elle est
exploitable, admissible selon les règles métier et autorisée pour le contexte
courant. Le périmètre doit sélectionner exactement cette action, et non les
autres actions du même organisateur, territoire ou jour.

Les données du rapport ne doivent pas être reconstruites depuis les paramètres
de navigation si une source canonique backend existe. Les paramètres
préremplis restent visibles dans l'interface afin d'expliquer le contexte :

```txt
Périmètre
Action unique

Action
<nom / date / lieu de l'action>
```

L'utilisateur peut ensuite choisir les autres options autorisées, notamment le
niveau d'exhaustivité, sans que ce point d'entrée choisisse implicitement un
template ou un niveau de détail. Le verrou de périmètre sur l'action unique
reste actif, sauf retour explicitement demandé vers une configuration générale.
La présence du bouton côté page d'action doit toujours correspondre à l'état
réellement validé de l'action.

Une fois la configuration vérifiée, un rapport issu de ce point d'entrée suit
exactement le même pipeline, le même versioning, les mêmes méthodologies, le
même snapshot historique et les mêmes règles de traçabilité que tout autre
rapport `/reports`.

La préconfiguration est un mécanisme générique de `/reports`, et non une
navigation codée pour les seules actions. Il doit pouvoir accueillir plus tard
des points d'entrée préremplis pour une campagne, une organisation, un
événement, un territoire ou un objectif mesurable, au moyen du même contrat
plutôt que de cas dispersés dans l'UI.

La forme finale de l'URL, le schéma SQL, les migrations, le design précis du
bouton et le niveau d'exhaustivité par défaut ne sont pas définis par cette
documentation. Leur mise en œuvre relève de lots ultérieurs.

## Versioning et reproductibilité des générations

Chaque rapport généré doit être versionné et reproductible. Le PDF n'est pas la
seule preuve à conserver : à chaque génération, le backend doit également
persister un snapshot JSON structuré, immuable et suffisamment complet pour
reconstruire le rapport ultérieurement. Cette section fixe l'invariant
architectural ; elle ne décide ni du schéma SQL final ni d'une migration et ne
constitue pas une implémentation de ce mécanisme.

Le snapshot doit couvrir les données finales sélectionnées, ou un modèle de
rapport équivalent suffisamment complet pour reconstruire le document sans
relire ni recalculer silencieusement les données runtime actuelles. Les
métadonnées conceptuelles associées à une génération comprennent au minimum :

| Métadonnée conceptuelle | Rôle |
|---|---|
| `generationId` | Identifiant unique de la génération |
| `generatedAt` | Date et heure de génération |
| `templateId`, `templateVersion` | Template ayant produit la présentation |
| `detailLevel` | Niveau d'exhaustivité utilisé, conservé comme paramètre de génération |
| `snapshotSchemaVersion` | Version du schéma du snapshot JSON |
| `filtersVersion` | Version des filtres et paramètres de génération |
| `filters` / configuration de périmètre | Configuration exacte ayant défini la période, le périmètre et les autres paramètres |
| `reportData` / `reportModel` | Données finales sélectionnées ou modèle complet nécessaire à la reconstruction |
| `methodologyVersions`, `calculationFactorVersions` | Versions des méthodologies et facteurs de calcul utilisés |
| `provenance`, `quality` | Provenance, couverture, qualité et autres informations nécessaires à l'interprétation |
| `rendererVersion` | Version éventuelle du renderer |
| `sourceGenerationId` | Filiation éventuelle vers le snapshot d'origine lors d'une régénération dérivée |

Le versioning conceptuel peut par exemple commencer par les identifiants
suivants, puis évoluer par versions explicites :

```txt
ReportSnapshotV1
ReportDataFiltersV1
ReportTemplate / default / v1.0
Methodology / v2026.x
```

Ces familles de versions ne sont pas interchangeables. Il faut distinguer
explicitement :

```txt
données historiques figées
≠ template de présentation
≠ méthodologies de calcul
≠ données runtime actuelles
```

Le snapshot répond à deux usages distincts :

1. **Relecture historique fidèle** : utiliser le snapshot immuable avec le
   template et les méthodologies d'origine pour reproduire exactement le
   rapport tel qu'il avait été généré et publié à l'époque.
2. **Régénération avec un template plus récent** : réinjecter les données
   historiques figées dans une nouvelle version du template afin de produire
   une présentation mise à jour, sans relire ni recalculer silencieusement les
   données runtime actuelles.

Si une nouvelle version de template sait consommer un ancien snapshot, elle
peut produire un nouveau rendu à partir de ces données historiques. Si le
schéma historique n'est plus compatible, le système doit l'indiquer
explicitement ; aucune donnée manquante ne doit être inventée, ni remplacée
silencieusement par une donnée courante.

Une régénération ne doit jamais écraser ni modifier le rapport historique
d'origine. Elle crée une nouvelle génération et un nouveau rendu dérivés, avec
un lien de filiation vers la génération source (`sourceGenerationId`, ou
équivalent conceptuel). Le snapshot historique d'origine reste immuable.
Cette filiation doit permettre de comparer le rapport publié à l'époque avec
une nouvelle présentation des mêmes données historiques produite par un
template ultérieur.

Cette régénération versionnée est distincte de l'action actuelle « Réexporter »
décrite dans l'historique ci-dessous : celle-ci réutilise le snapshot enregistré
pour produire un export, sans créer de nouvelle génération. La mise en œuvre de
générations dérivées, de leurs snapshots versionnés et de leur filiation relève
d'un lot ultérieur.

Le niveau de détail fait donc partie des paramètres et métadonnées de la
génération ; il ne détermine pas implicitement la sélection des modules ou des
parties du rapport. La composition du rapport, le contenu de ses modules et
l'effet précis de `Concis`, `Par défaut` et `Exhaustif` restent des décisions
distinctes, conservées dans leur état actuel et traitées dans un chantier
séparé.

## Historique des générations

« Rapports récents » lit les générations réellement persistées par le compte
connecté dans `public.report_generations`, triées par `generated_at` décroissant
et limitées aux 12 dernières entrées de ce compte. Une ligne contient le titre,
la période, le périmètre, le niveau de détail et la date de génération. Aucun
rapport synthétique n'est créé lorsque la base est vide, auquel cas l'interface
affiche « Aucun rapport généré ».

La lecture de cette liste ne sélectionne que les métadonnées nécessaires à ces
colonnes (`id`, `generated_at`, `title`, `period_id`, `scope_label` et
`detail_level`). Le `snapshot` et les `modules` restent hors de cette requête.
Les actions « Voir » et « Réexporter » chargent ensuite le snapshot par son
identifiant uniquement au clic, via `GET /api/reports/generations/[id]`.

« Voir » rend le payload immuable enregistré, sans relire les données actuelles
ni recalculer le rapport. « Réexporter » réutilise le renderer existant, garde
le `generatedAt` et le filename historiques, et ne crée aucune nouvelle ligne
dans `report_generations`. Un snapshot absent, invalide ou incompatible produit
une erreur explicite ; il n'est jamais remplacé par un recalcul courant.

Après un export PDF réussi, le payload JSON final, les modules et les
métadonnées de configuration sont persistés ; le binaire PDF ne l'est pas.
L'échec de cette persistance conserve le succès du PDF et affiche un
avertissement non bloquant. Aucune politique de rétention n'est promise par
cette page.
La génération et la lecture de cet historique exigent une session via
`requireAuthenticatedAccess`. Les handlers utilisent le client serveur et
filtrent chaque lecture par l'identifiant Clerk du compte courant ; la table
Supabase n'accorde toujours aucun accès direct à `anon` ou `authenticated`.

## Performance

Cette page peut être lourde.

Règles :

- ne pas ouvrir les exports détaillés aux visiteurs anonymes ;
- conserver les chargements parallèles ;
- différer les documents lourds ;
- préserver les limites de volume explicites ;
- éviter un second fetch des mêmes contrats dans un composant enfant.

## États

```txt
visiteur anonyme → gate flouté
compte connecté standard → rapports, génération et historique de son compte
profil admin-like → mêmes capacités, plus exports détaillés de l'analyse
Analyse indisponible → erreur explicite, sans faux modèle zéro
historique indisponible → erreur explicite, sans faux état vide
```

Une Analyse chargée avec succès peut afficher des zéros réels. De même,
« Aucun rapport généré » n'est affiché qu'après une lecture réussie sans ligne;
une erreur de lecture affiche « Historique temporairement indisponible ».

## Statut documentaire

```txt
Accès réaligné sur le code.
La route ne doit plus être décrite comme simplement publique ni comme protégée uniquement par le proxy.
```
