# Méthodologie

## Fiche canonique

- **Route** : `/methodologie`
- **Accès runtime** : `public-visible`
- **Famille** : Cartographie & Impact
- **Exception page-family** : `methodologie-impact`
- **Palette runtime actuelle** : red
- **Revalidation** : `3600 s`
- **Source principale** : `apps/web/src/app/(app)/methodologie/page.tsx`
- **Source du contenu** : `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx`

## Contenu public

La page publique présente :

- comment CleanMyMap mesure son impact ;
- quelles données sont utilisées ;
- quels coefficients et proxys sont appliqués ;
- comment les coûts techniques et quotas sont suivis ;
- quelles limites accompagnent les chiffres ;
- comment lire la carte d’actions, sa pollution constatée, sa pollution projetée et ses sources.
- comment les modes d’affichage modifient la présentation sans modifier les fonctionnalités, permissions ou données.

La page ne présente pas de comparaison cartographique expérimentale, de fonctionnalité en cours
de développement ni de promesse de fonctionnalité future. Les textes affichés décrivent uniquement
les calculs, les sources, les limites et l’infrastructure effectivement suivis.

La documentation de la page doit également orienter vers la méthodologie spécifique de la carte d'actions :

`documentation/product/methodologie-carte-actions.md`

## Modes d’affichage

La page expose la section ancrée `/methodologie#modes-affichage`, qui reprend
la définition canonique des trois modes :

- **Exhaustif** : Expérience CleanMyMap complète.
- **Minimaliste** : Allez droit au but sans contenu superflu
- **Sobre** : Adaptez le rendu visuel pour réduire la fatigue visuelle et cognitive sans modification du contenu.

Dans les trois cas, le mode change la présentation, jamais les fonctionnalités,
permissions ou données. La source normative est
[`DISPLAY_MODES_CANONICAL.md`](../../../../design-system/DISPLAY_MODES_CANONICAL.md).

## Données chargées

La page tente de charger :

```txt
services d'infrastructure
snapshots d'impact
totaux CO2e proxy
statistiques GitHub du dépôt
dates de génération et de lancement
```

La page publique consomme le dernier snapshot d’impact disponible. La génération
live des signaux opérationnels est séparée du rendu public et reste réservée aux
parcours serveur, admin ou cron prévus à cet effet.

En l’absence de snapshot, la page affiche un état partiel avec les valeurs vides
prévues ; cette indisponibilité ne doit pas rendre la page entière inutilisable.

## Palette

Le runtime actuel résout explicitement la variante rouge :

```txt
METHODOLOGIE_FAMILY
backdropToneKey = red
hero = red
card = CARTO_IMPACT_RED_CARD
```

Le présent fichier suit le code actuel et le rendu rouge de la page.

## Point d'entrée

La page est accessible depuis les surfaces de Cartographie & Impact, notamment la carte.

## Référence carte d'actions

La méthodologie de la carte distingue le score de pollution constatée avant l'action de la pollution projetée par vieillissement non linéaire. Elle documente aussi la séparation Actions / Trash Spotter, le fallback `S_post = 0`, les mesures post-action réelles, la calibration locale et la grammaire géométrique.

La fiche détaillée est [la méthodologie produit de la carte d'actions](../../../../product/methodologie-carte-actions.md).


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
Contenu limité aux méthodes, sources, limites, carte d’actions, quotas et empreinte technique.
```
