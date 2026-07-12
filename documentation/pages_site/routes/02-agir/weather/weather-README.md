# Organiser une action

## Fiche canonique

- **Route** : `/sections/weather`
- **Dossier canonique** : `weather`
- **Famille** : Agir
- **Accès runtime** : `public-visible`
- **Palette runtime** : agir / emerald
- **Exception page-family** : `weather-operations`

## Sources principales

```txt
apps/web/src/app/(app)/sections/[sectionId]/page.tsx
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
3. identifier un créneau conseillé ;
4. adapter la durée et le kit ;
5. vérifier les consignes de sécurité avant départ.

## Contrat runtime

- `SectionRenderer` rend `WeatherSection` pour cette rubrique.
- `/sections/guide` redirige vers `/sections/weather`.
- La page est visible sans compte.
- L’état `access refused` n’est pas un état normal de cette surface.
- Les données météo proviennent d’Open-Meteo et d’une résolution locale puis distante des lieux.
- La localisation initiale peut venir de la préférence utilisateur, d’un choix manuel stocké ou de la géolocalisation si elle est autorisée.

## Structure UI

- hero centré ;
- lieu sélectionné ;
- sélecteur de lieu ;
- carte de recommandations ;
- prévisions horaires ;
- créneaux conseillés ;
- préparation et logistique ;
- consignes de sécurité.

## États à documenter

```txt
loading
empty
error
ready
```

## Statut documentaire

```txt
Page canonique en place.
Documentation réalignée sur le runtime météo actuel.
La famille reste Agir tant que le runtime n’est pas arbitrée autrement.
```

## Références

- [Présentation détaillée](./weather-presentation-detaillee.md)
- [Propositions à traiter](./weather-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./weather-objectifs-non-pertinents.md)
