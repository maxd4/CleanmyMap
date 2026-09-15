# Rapports d'impact

## Fiche canonique

- **Route** : `/reports`
- **Famille** : Cartographie & Impact
- **Palette runtime** : red
- **Accès visiteur** : synthèse publique légère en lecture
- **Accès génération/historique** : compte connecté, sur son propre historique
- **Export détaillé** : tout compte connecté, une fois par jour civil
- **Complétion du compte** : Un profil incomplet affiche un rappel non bloquant ; il ne remplace pas la page et ne modifie pas l'AuthN/AuthZ des opérations.
- **Source principale** : `apps/web/src/app/(app)/reports/page.tsx`

## Contrat d'accès

La synthèse de la route est publique en lecture et n'expose que des indicateurs
agrégés déjà publics. Elle ne charge ni historique personnel ni génération
détaillée pour un visiteur.

Le composant serveur charge la session.

Sans `userId` : synthèse publique légère uniquement.

Avec compte connecté :

```txt
accès à la page de rapports
```

Pour la génération de document, l'export détaillé et son historique :

```txt
requireAuthenticatedAccess()
historique filtré par created_by_clerk_id = userId courant
quota d'export contrôlé côté serveur : 1 export détaillé par jour civil Europe/Paris
```

## Données

La page charge en parallèle :

```txt
pilotage overview sur 90 j
jusqu'à 2 200 actions approuvées pour le tableau de bord d'analyse
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
- export détaillé CSV serveur pour tout compte connecté ;
- génération de document PDF détaillée pour tout compte connecté.

Les données exportées sont non sensibles selon le contrat de cette page. Le
quota est la seule limitation produit : aucune limite de période, de nombre de
lignes ou de longueur n'est ajoutée volontairement à l'export détaillé.

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
modules. Le sélecteur de période de Génération est indépendant de la fenêtre
fixe de l'onglet Analyse. Les décisions prospectives sur la préconfiguration
depuis une action et la génération dérivée versionnée sont conservées dans la
liste PLAN associée ; elles ne constituent pas des fonctionnalités actuelles.

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

Avant l'ouverture du PDF, le serveur réserve atomiquement le quota puis
persiste le payload JSON final, les modules et les métadonnées de configuration
; le binaire PDF ne l'est pas. Une erreur serveur n'ouvre pas de PDF et ne
doit pas consommer durablement le créneau réservé. Aucune politique de
rétention n'est promise par cette page.
La génération et la lecture de cet historique exigent une session via
`requireAuthenticatedAccess`. Les handlers utilisent le client serveur et
filtrent chaque lecture par l'identifiant Clerk du compte courant ; la table
Supabase n'accorde toujours aucun accès direct à `anon` ou `authenticated`.

## Performance

Cette page peut être lourde pour un compte connecté ; sa synthèse anonyme reste
une projection légère.

Règles :

- conserver les chargements parallèles ;
- différer les documents lourds ;
- appliquer le quota côté serveur, jamais dans `localStorage` ou un bouton
  désactivé ;
- éviter un second fetch des mêmes contrats dans un composant enfant.

## États

```txt
visiteur anonyme → synthèse publique légère
compte connecté standard → rapports, export détaillé et historique de son compte
admin ou bénévole → même règle d'export détaillé
quota déjà utilisé → génération désactivée jusqu'au jour civil suivant
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
