# Rapports d'impact

## Fiche canonique

- **Route** : `/reports`
- **Famille** : Cartographie & Impact
- **Palette runtime** : red
- **Accès visiteur** : `auth-blur-gate`
- **Accès page complète** : compte connecté
- **Exports et génération détaillée** : profils admin-like
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

Pour la génération complète et les exports :

```txt
isAdminLikeProfile(profile) = true
```

## Données

La page charge en parallèle :

```txt
pilotage overview sur 90 j
jusqu'à 2 200 actions approuvées
événements communautaires
météo Open-Meteo avec revalidation 900 s
```

## Fonctionnalités

- aperçu global des quatre indicateurs d'impact du `ReportModel` ;
- qualité des données et couverture cartographique, présentées séparément des
  impacts ;
- tendances mensuelles de la collecte (masse collectée et bénévoles) sur la
  fenêtre active affichée ;
- comparaisons de périodes issues de l'overview de pilotage ;
- méthode KPI ;
- données d'actions ;
- événements communautaires ;
- météo ;
- génération de document ;
- exports pour profils autorisés.

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
30/90/365 jours. La couche Reports dérive ensuite une fenêtre courante avec
`filterContractsToActivePeriod`, à partir de `dates.observedAt` et de la borne
inclusive `[now - periodDays, now]`; les dates invalides et les dates futures
sont exclues. Le même instant `now` est utilisé pour le filtrage et la
construction du `ReportModel`.

Les totaux du snapshot et la série mensuelle sont construits uniquement sur
cette fenêtre active. Les comparaisons restent celles de l'overview Pilotage
et sont identifiées comme telles dans l'interface. La série affichée indique
la durée réelle de la fenêtre, et non un nombre fixe de mois.

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
compte connecté standard → rapports sans génération admin
profil admin-like → génération et exports
échec de chargement → données de repli
```

## Statut documentaire

```txt
Accès réaligné sur le code.
La route ne doit plus être décrite comme simplement publique ni comme protégée uniquement par le proxy.
```
