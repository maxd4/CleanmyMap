# Météo — compatibilité — Présentation détaillée

## Fiche de compatibilité

- **Route historique** : `/sections/weather`
- **Cible** : `/actions/new?panel=meteo`
- **Dossier canonique** : `weather`
- **Rôle** : préparation terrain météo
- **Périmètre** : météo réelle, créneau favorable selon les données, kit, sécurité
- **États à documenter** : `loading`, `empty`, `error`, `ready`
- **Composants concernés** : `WeatherSection`, `WeatherLocationPicker`, `useWeatherData`, `PreparationPanel`

## Vue d'ensemble

Le panneau météo de `/actions/new` aide à choisir le bon créneau d'action et à
préparer le terrain. `/sections/weather` et `/sections/guide` redirigent vers
ce panneau.

Elle combine :

- un lieu actif ;
- une recherche de localisation ;
- des prévisions horaires ;
- un niveau de vigilance calculé comme repère indicatif ;
- une checklist de sécurité ;
- un kit à envisager selon le format d'action.

### Nature des informations

Les observations et prévisions proviennent du service météo utilisé par le
runtime. Le niveau de vigilance, les fenêtres, les durées et les équipements
sont dérivés par les calculs internes (`evaluateWeatherRisk` et les helpers de
préparation). Ils fournissent des conseils de prudence et des durées
indicatives à mettre en regard des conditions réelles. Ils n’ont pas de valeur
réglementaire, légale, professionnelle ou médicale et ne remplacent pas les
consignes locales ni le jugement de l’équipe.

## Parcours

### 1. Choix du lieu

L'utilisateur saisit une commune, une ville ou un lieu précis.

Le composant de recherche :

- propose des suggestions ;
- gère le clavier ;
- conserve la sélection active ;
- réouvre le champ quand l'utilisateur recommence une recherche.

### 2. Consultation météo

Une fois la localisation définie, la page affiche :

- la météo courante, séparée de l'évaluation prévisionnelle ;
- les prévisions sur 7 jours ;
- les heures utiles du jour sélectionné ;
- les créneaux favorables calculés uniquement depuis les heures du jour et du lieu sélectionnés ;
- les signaux de vigilance.

La sélection d'une date du pré-formulaire ne réutilise jamais le risque météo
courant. Les recommandations de préparation, les fenêtres et la durée
indicative proviennent de la même sélection horaire locale `Europe/Paris` et
ne traversent pas artificiellement minuit. Une date hors de l'horizon
Open-Meteo conserve l'état `Prévision indisponible`.

### 3. Préparation

La colonne de préparation résume :

- l'équipement à envisager ;
- la durée indicative ;
- l'hydratation ;
- la vigilance terrain ;
- les gestes de sécurité à adapter au contexte.

### 4. Sécurité

La page rappelle ce qu'il ne faut pas toucher :

- déchets dangereux ;
- objets suspects ;
- éléments collés au sol ;
- situations où un binôme peut être à envisager selon les conditions.

## Source de données

Le runtime agrège :

- des suggestions de lieux locales ;
- un fallback de géocodage distant ;
- la météo Open-Meteo ;
- la préférence utilisateur ;
- la géolocalisation navigateur quand elle est autorisée.

Une saisie conservée sans géocodage vérifié reste affichée comme texte, mais
aucune prévision calculée sur les coordonnées nationales par défaut ne lui est
attribuée. L'interface expose alors `Localisation à préciser`.

## États

### `loading`

La météo est en cours de chargement.

### `empty`

Aucune donnée météo exploitable n'est disponible.

### `error`

La récupération météo a échoué pour la localisation choisie.

### `ready`

Les prévisions et les repères indicatifs sont disponibles.

Les cartes ne déduisent pas le relief, l'état du sol, l'accessibilité ou un
niveau d'effort réel depuis la météo. Ces éléments doivent être vérifiés ou
décrits séparément sur le terrain.

## Notes d'audit

- La page reste publique.
- La route `guide` n'est qu'un alias de confort vers cette page.
- La documentation doit rester centrée sur la météo d'action, pas sur une météo d'illustration.
- Aucun snapshot n'est requis ici tant qu'aucune capture officielle n'est produite.
