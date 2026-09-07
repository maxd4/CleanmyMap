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
- comment CleanMyMap transforme ses données disponibles en itinéraire proposé, sans confondre observations, prédictions, décision du planner et résultat de routage.
- comment les modes d’affichage modifient la présentation sans modifier les fonctionnalités, permissions ou données.

La page ne présente pas de comparaison cartographique expérimentale, de fonctionnalité en cours
de développement ni de promesse de fonctionnalité future. Les textes affichés décrivent uniquement
les calculs, les sources, les limites et l’infrastructure effectivement suivis.

La documentation de la page doit également orienter vers la méthodologie spécifique de la carte d'actions :

`documentation/product/methodologie-carte-actions.md`

## Section canonique — Indicateurs Impact terrain 2026

La page expose en tête l’ancre `/methodologie#indicateurs-impact-terrain`.
Cette section documente les six KPI présents sur la surface Impact terrain :

- Déchets récoltés ;
- Mégots retirés ;
- Bénévoles mobilisés ;
- CO₂ évité ;
- Eau préservée ;
- Économie de voirie.

Chaque bloc suit le même contrat pédagogique : donnée terrain mesurée ou
déclarée, agrégat, résultat ou proxy calculé, conversions pédagogiques,
formule runtime, hypothèses/références et limites. Une conversion pédagogique
ne modifie jamais la donnée source et un proxy ne doit pas être présenté comme
une mesure instrumentale.

La source domaine commune est
`apps/web/src/lib/impact/impact-terrain-2026.ts`, avec les références de
conversion centralisées dans
`apps/web/src/lib/impact/impact-terrain-2026-constants.ts`. Elle compose les
définitions et les formules affichées à partir des facteurs runtime de
`apps/web/src/lib/gamification/impact-proxy-config.ts`. Le moteur d’impact, les
agrégats publics et les futurs consommateurs de méthode doivent réutiliser ce
domaine ; la page `/methodologie` ne devient pas une source de calcul.

### KPI 1 — Déchets récoltés

La donnée terrain est la masse de déchets récoltés en kilogrammes. Le runtime
retient, par action, la masse déclarée ou détaillée disponible ; lorsqu’il doit
recourir au signal mégots, il réutilise la masse canonique qualifiée décrite
ci-dessous. Les actions éligibles sont ensuite additionnées.

Les conversions pédagogiques sont :

```txt
sacs_50L = déchets_kg / 5
Vélib_mécaniques = déchets_kg / 20
```

Les valeurs `5 kg / sac de 50 L` et `20 kg / Vélib' mécanique` sont des
références méthodologiques CleanMyMap, centralisées dans le domaine Impact
terrain 2026. Elles servent uniquement à donner un ordre de grandeur : elles
ne mesurent ni le volume réellement utilisé, ni le poids d’un vélo particulier.

### KPI 2 — Mégots retirés

La donnée principale est le nombre de mégots déclaré ou enregistré. Le runtime
conserve exactement les trois états disponibles : `propre`, `humide` et
`mouille` (affichés « Propre », « Humide » et « Mouillé »). Aucun quatrième état
n’est créé.

La masse estimée réutilise `BUTTS_PER_KG_REFERENCE` et
`CONDITION_WEIGHT_FACTORS` :

```txt
masse_qualifiée_kg = somme(mégots_état / (2500 × facteur_état))
masse_non_qualifiée_kg = mégots_non_qualifiés / 2500
masse_estimée_kg = masse_qualifiée_kg + masse_non_qualifiée_kg
```

La qualification est comptée uniquement lorsque l’état est réellement présent
dans les métadonnées de l’action. Les mégots historiques sans qualification ne
sont pas attribués arbitrairement à `propre`, `humide` ou `mouille` ; ils sont
signalés séparément comme non qualifiés. La conversion pédagogique de distance
reste : `distance_m = mégots × 0,025`, soit un repère de 2,5 cm par mégot. Ce
repère ne modifie ni le compteur ni la masse canonique.

Le résultat public structuré préparé pour les futurs consommateurs est exposé dans
`apps/web/src/lib/impact/impact-terrain-2026-results.ts` et comprend les
équivalences déchets, la répartition non nulle par état, la masse estimée
canonique, la part non qualifiée et la distance pédagogique. La RPC reste
bornée et transmet uniquement les compteurs qualifiés nécessaires ; elle ne
charge pas le corpus d’actions dans le runtime web.

Les effets environnementaux ou sanitaires des mégots ne sont pas enrichis par
des citations non vérifiées dans ce lot. Les références affichées restent les
références runtime et les références méthodologiques déjà présentes dans le
domaine.

### KPI 3 — Participants

Le résultat principal est `participantsTotal = somme(volunteersCount)` sur le
périmètre public canonique. La répartition `actionDistribution` classe chaque
action éligible une seule fois : une action spontanée est dérivée de son nombre
de participants (`Solo`, `Duo`, `Trio`, `Quatuor`, `Quintet`, `Sextet`, etc.) ;
les autres actions utilisent leur `organizerType` (`Entreprise`, `Association`,
`Association étudiante`, `Collectif`, `Autres`). Le nom d’une structure ne sert
jamais de catégorie statistique et une donnée legacy sans type exploitable tombe
dans `Autres` avec un warning administratif, sans modifier l’action d’origine.

Le contrat public est porté par
`apps/web/src/lib/accueil/action-participant-aggregation.ts` et fournit aussi
`totalDurationMinutes`/`totalDurationHours`. La durée est additionnée par
action, sans multiplication par le nombre de participants.

### KPI 4 — CO₂e évité

Le terrain fournit une masse de déchets retenue ; le résultat CO₂e reste le
proxy runtime existant :

```txt
CO₂e_kg = totalWasteKg × co2KgPerWasteKg
CO₂_g = CO₂e_kg × 1000
km_voiture = CO₂_g / 142
part_vol_Paris_NY = CO₂_g / 1 000 000
part_Paris_Moscou_voiture = CO₂_g / (2 840 × 142)
```

Les distances et parts de trajet sont des conversions pédagogiques, non une
mesure d’émissions évitées. Les références `142 g/km`, `1 000 000 g` et
`2 840 km` sont centralisées dans le domaine Impact terrain 2026 et réutilisées
par les résultats publics.

### KPI 5 — Eau préservée

Le terrain fournit un nombre de mégots ; le résultat est explicitement un
proxy de potentiel, et non une mesure directe d’eau traitée ou économisée :

```txt
eau_L = totalButts × 500
piscines = eau_L / 2 500 000
années = eau_L / 55 000
```

Les références `500 L/mégot`, `2 500 000 L/piscine olympique` et
`55 000 L/an/personne` sont centralisées dans le même domaine. Les conversions
servent à lire un ordre de grandeur et ne modifient pas le résultat source.

L’agrégat public et le résultat méthodologique sont donc cohérents : les
participants, la répartition des actions, le CO₂e et l’eau sont calculés à
partir du même périmètre public borné. Les trois KPI sont documentés ici sans
injection dans les bulles `i` de la homepage dans ce lot.

Le sixième KPI — Économie de voirie — reste dans la même section et conserve
son contrat commun ; son détail métier n’est pas développé dans ce lot.

Les résultats dynamiques et les nouveaux agrégats homepage ne sont pas injectés
dans les bulles i dans ce lot. Le temps total des actions reste un agrégat
canonique séparé, disponible pour l’évolution de l’économie de voirie ; il ne
remplace pas la formule runtime actuelle dans cette section.

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


## Méthodologie de création d’itinéraire

La page expose aussi la section ancrée
`/methodologie#methodologie-itineraire`, distincte de la méthodologie de la
carte d’actions. Elle présente les cinq étapes pédagogiques : données
d’entrée, candidats, priorisation, contraintes du planner, puis itinéraire
final et explicabilité.

La première documentation associée est
[la méthodologie de création d’itinéraire](../../../../product/methodologie-itineraire.md).
Elle ne détaille pas encore les formules, pondérations ou coefficients du
moteur.


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
