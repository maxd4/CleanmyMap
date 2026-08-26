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
jusqu'à 1 000 actions approuvées
événements communautaires
météo Open-Meteo avec revalidation 900 s
```

## Fonctionnalités

- KPI de synthèse ;
- snapshot des indicateurs du `ReportModel`, avec séparation explicite entre
  collecte, qualité des données, couverture cartographique et impacts calculés
  par proxy ;
- tendances mensuelles ;
- comparaisons ;
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
