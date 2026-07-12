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
