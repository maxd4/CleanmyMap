# Météo — compatibilité

## Fiche de compatibilité

- **Route historique** : `/sections/weather`
- **Cible actuelle** : `/actions/new?panel=meteo`
- **Dossier canonique** : `weather`
- **Famille** : Agir
- **Accès runtime** : `public-visible` ; redirection vers le panneau météo public de `/actions/new`
- **Palette runtime** : agir / emerald
- **Exception page-family** : `weather-operations`

## Sources principales

```txt
apps/web/src/app/(app)/sections/[sectionId]/page.tsx (redirection)
apps/web/src/components/sections/rubriques/weather-section.tsx
apps/web/src/components/sections/rubriques/weather-location-picker.tsx
apps/web/src/components/sections/rubriques/use-weather-data.ts
apps/web/src/components/sections/rubriques/weather-section.preparation.tsx
apps/web/src/components/sections/rubriques/use-kit-data.ts
```

## Objectif utilisateur

Préparer une action de terrain avec la météo réelle du lieu choisi.

La page sert à :

1. choisir une commune, une ville ou un lieu précis ;
2. consulter les prévisions horaires sur 7 jours ;
3. repérer un créneau favorable selon les données ;
4. adapter la durée et le kit ;
5. vérifier les repères de prudence avant le départ.

Les données météo affichées sont des observations et des prévisions fournies
par le service météo. Les niveaux, durées et listes d’équipement sont des
calculs et des repères indicatifs internes destinés à aider la préparation.
Ils ne constituent ni une prescription officielle, ni une règle réglementaire
ou médicale : l’utilisateur décide selon le terrain, l’équipe et les
conditions réelles.

## Contrat runtime

- `ActionCreationShell` rend `WeatherSection` dans le panneau `meteo`.
- `/sections/weather` et `/sections/guide` redirigent vers `/actions/new?panel=meteo`.
- La page est visible sans compte.
- L'état `access refused` n'est pas un état normal de cette surface.
- Les données météo proviennent d'Open-Meteo et d'une résolution locale puis distante des lieux.
- La localisation initiale peut venir de la préférence utilisateur, d'un choix manuel stocké ou de la géolocalisation si elle est autorisée.

## Structure UI

- hero centré ;
- lieu sélectionné ;
- sélecteur de lieu ;
- carte de repères indicatifs ;
- prévisions horaires ;
- créneaux favorables selon les données ;
- préparation et logistique ;
- conseils de prudence et de sécurité.

## États à documenter

```txt
loading
empty
error
ready
```

## Statut documentaire

```txt
Le moteur météo reste en place et est réutilisé dans le shell canonique.
Les anciennes URLs sont conservées comme redirections de compatibilité.
```

## Références

- [Présentation détaillée](./weather-presentation-detaillee.md)
- [Propositions à traiter](./weather-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./weather-objectifs-non-pertinents.md)
