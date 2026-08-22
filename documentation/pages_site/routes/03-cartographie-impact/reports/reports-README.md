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
pilotage : jusqu'à 2 200 contrats approuvés pour l'agrégation de la fenêtre
génération : jusqu'à 1 000 actions approuvées
événements communautaires
météo Open-Meteo avec revalidation 900 s
```

Le read-model serveur est centralisé dans
`apps/web/src/lib/reports/report-model/`. Les plafonds de lecture restent des
bornes de charge et ne constituent pas des règles métier.

## Budget de données et troncature

Les bornes propres à `/reports` sont centralisées dans
`apps/web/src/lib/reports/budget.ts` :

| Surface | Source et paramètres | Fenêtre / borne | Cache ou revalidation | Condition de rapport partiel |
| --- | --- | --- | --- | --- |
| Pilotage | `loadPilotageOverview({ periodDays: 90, limit: 2200 })` | Contrats `approved`, jusqu'à 2 200 lignes ; source historique minimale de 730 jours | Vue pilotage : 600 s ; source unifiée : 300 s | L'union est bornée à 2 200 contrats. Le read-model expose `dataAvailability.isTruncated` et `dataAvailability.sourceHealth` sans lecture supplémentaire ; la fenêtre 730 jours est conservée car elle couvre les comparaisons 365 jours courante et précédente. |
| Génération | `fetchCachedUnifiedActionContracts({ limit: 1000, status: "approved" })` | Jusqu'à 1 000 contrats, triés par date d'observation décroissante | Source unifiée : 300 s | `isTruncated = true` si l'union dédupliquée dépasse 1 000 contrats ; la métadonnée est conservée par `loadReportsGenerationData` sans nouvelle lecture. |
| Événements | `loadCachedReportCommunityEvents(120)` | Jusqu'à 120 événements, avec leurs résumés RSVP | Cache dédié : 120 s | La liste est bornée à 120 ; le tableau reste vide en cas d'erreur, avec `communityEventsAvailability = "unavailable"` pour distinguer cette erreur d'une absence réelle. |
| Météo | Fetch Open-Meteo côté serveur | Réponse courante et agrégats journaliers demandés | Revalidation : 900 s | Une réponse non disponible donne `weather = null`, sans retry ni polling ajouté. |

Les deux onglets sont chargés conditionnellement : une requête de génération
n'est pas lancée lors de l'ouverture de l'onglet pilotage, et inversement. Pour
la génération, les contrats, événements et météo déjà chargés côté serveur
sont passés au document différé ; les fetchs SWR correspondants restent donc
désactivés côté client.

Le statut `isTruncated` décrit une borne de volume, pas une erreur réseau. Il
est conservé par le read-model de génération et transmis au document, qui
affiche alors un état de données potentiellement partielles. Le read-model
pilotage expose désormais `dataAvailability.isTruncated` et
`dataAvailability.sourceHealth` ; cette métadonnée ne modifie ni les tableaux
chargés ni les métriques approved. Une source indisponible peut également
rendre le résultat incomplet ; ce cas reste distinct de la troncature et est
transporté par `sourceHealth.partial`, `failedSources` et `warnings`. Aucun
plafond n'est augmenté dans ce lot.

### Limite connue sur les métriques de modération

`loadPilotageOverview` charge actuellement uniquement les contrats
`approved`. Le moteur de comparaison contient pourtant des branches pour les
contrats `pending` : avec la source actuelle, `pendingCount` et
`moderationDelayDays` sont donc explicitement `null`/indisponibles. L'absence de
lignes `pending` ne doit pas être interprétée comme une file réellement vide ou
un délai nul. Ces métriques indisponibles n'alimentent ni les comparaisons, ni
les priorités, ni les recommandations ; les métriques fondées sur les contrats
`approved` restent calculées normalement. Aucun appel, statut, ligne, cache ou
revalidation supplémentaire n'est ajouté.

La génération détaillée utilise également une collection `approved` uniquement
pour son modèle. Dans sa section de gouvernance, `pending` et `rejected` ne
peuvent donc pas être mesurés ; une conversion affichée à partir de cette
collection ne constitue pas un taux de modération global, et le délai calculé
correspond uniquement aux contrats approuvés disposant de dates de validation.
Cette limite est distincte de la troncature et reste documentée plutôt que
corrigée par une lecture supplémentaire.

## Fonctionnalités

- KPI de synthèse ;
- tendances mensuelles ;
- comparaisons ;
- méthode KPI ;
- données d'actions ;
- événements communautaires ;
- météo ;
- génération de document ;
- exports pour profils autorisés.

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
