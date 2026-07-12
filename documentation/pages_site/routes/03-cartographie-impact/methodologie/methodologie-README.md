# Méthodologie

## Fiche canonique

- **Route** : `/methodologie`
- **Accès runtime** : `public-visible`
- **Famille** : Cartographie & Impact
- **Exception page-family** : `methodologie-impact`
- **Palette runtime actuelle** : sky
- **Revalidation** : `3600 s`
- **Source principale** : `apps/web/src/app/(app)/methodologie/page.tsx`

## Objectif utilisateur

Expliquer :

- comment CleanMyMap mesure son impact ;
- quelles données sont utilisées ;
- quels coefficients et proxys sont appliqués ;
- comment les coûts techniques et quotas sont suivis ;
- quelles limites accompagnent les chiffres.

## Données chargées

La page tente de charger :

```txt
services d'infrastructure
snapshots d'impact
totaux CO2e proxy
statistiques GitHub du dépôt
dates de génération et de lancement
```

Une erreur de chargement ne doit pas rendre la page entière inutilisable.

## Palette

La documentation historique annonçait `red`.

Le runtime actuel résout explicitement :

```txt
METHODOLOGIE_FAMILY
backdropToneKey = sky
hero = sky
card = CARTO_IMPACT_SKY_CARD
```

Le présent fichier suit le code actuel.

Toute volonté de revenir au rouge doit modifier ensemble :

```txt
runtime
test page-family
INDEX.md
fiche Méthodologie
```

## Point d'entrée

La page est accessible depuis les surfaces de Cartographie & Impact, notamment la carte.

## Blocs fonctionnels

Conserver séparés :

```txt
infrastructure / quotas
rapport d'impact
```

Ne pas mélanger :

```txt
consommation technique du service
impact environnemental des actions terrain
```

## États

- données complètes ;
- statistiques GitHub indisponibles ;
- dashboard d'impact indisponible ;
- snapshots absents ;
- valeurs proxy partielles.

## Statut

```txt
Page publique fonctionnelle.
Documentation couleur réalignée sur le resolver runtime.
```
