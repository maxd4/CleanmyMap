# Organiser une action - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/weather`
- **Dossier canonique** : `weather`
- **Rôle** : préparation terrain météo
- **Périmètre** : météo réelle, créneau conseillé, kit, sécurité
- **États à documenter** : `loading`, `empty`, `error`, `ready`
- **Composants concernés** : `WeatherSection`, `WeatherLocationPicker`, `useWeatherData`, `PreparationPanel`

## Vue d'ensemble

La page aide à choisir le bon créneau d’action et à préparer le terrain.

Elle combine :

- un lieu actif ;
- une recherche de localisation ;
- des prévisions horaires ;
- une recommandation de vigilance ;
- une checklist de sécurité ;
- un kit conseillé selon le format d’action.

## Parcours

### 1. Choix du lieu

L’utilisateur saisit une commune, une ville ou un lieu précis.

Le composant de recherche :

- propose des suggestions ;
- gère le clavier ;
- conserve la sélection active ;
- réouvre le champ quand l’utilisateur recommence une recherche.

### 2. Consultation météo

Une fois la localisation définie, la page affiche :

- la météo courante ;
- les prévisions sur 7 jours ;
- les heures utiles de la journée ;
- les créneaux favorables ;
- les signaux de vigilance.

### 3. Préparation

La colonne de préparation résume :

- l’équipement ;
- la durée indicative ;
- l’hydratation ;
- la vigilance terrain ;
- les gestes de sécurité.

### 4. Sécurité

La page rappelle ce qu’il ne faut pas toucher :

- déchets dangereux ;
- objets suspects ;
- éléments collés au sol ;
- situations où le binôme reste préférable.

## Source de données

Le runtime agrège :

- des suggestions de lieux locales ;
- un fallback de géocodage distant ;
- la météo Open-Meteo ;
- la préférence utilisateur ;
- la géolocalisation navigateur quand elle est autorisée.

## États

### `loading`

La météo est en cours de chargement.

### `empty`

Aucune donnée météo exploitable n’est disponible.

### `error`

La récupération météo a échoué pour la localisation choisie.

### `ready`

Les prévisions et les recommandations sont disponibles.

## Notes d'audit

- La page reste publique.
- La route `guide` n’est qu’un alias de confort vers cette page.
- La documentation doit rester centrée sur la météo d’action, pas sur une météo d’illustration.
- Aucun dossier photo n’est requis ici tant qu’aucune capture officielle n’est produite.
