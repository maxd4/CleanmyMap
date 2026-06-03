# Spécification canonique de la gamification

Ce document est la référence unique à lire en premier pour comprendre la gamification CleanMyMap.

Il centralise:

- les règles métier réellement appliquées par le code;
- les familles de badges déjà présentes;
- les sources de données utilisées;
- les garde-fous d attribution d XP;
- les conventions UI qui doivent rester stables.

Les autres documents de gamification restent utiles, mais ils sont désormais secondaires par rapport à cette spec.

## Périmètre

La page canonique concernée est `/gamification`, vue dans le bloc Cartographie & Impact.

Le système couvre:

- les badges exposés par l API;
- les compteurs infinis visibles dans le profil;
- les badges one-shot d entrée;
- les badges hérités encore affichés pour compatibilité;
- les notifications et l audit XP associés.

## Hiérarchie des sources

Ordre de confiance:

1. le code métier dans `apps/web/src/app/api/gamification/badges/list/route.ts` et les modules `apps/web/src/lib/gamification/*`;
2. les composants UI dans `apps/web/src/components/gamification/*`;
3. cette spec canonique;
4. le catalogue détaillé `documentation/gamification/BADGE_CATALOG.md`;
5. les mémoires produit `documentation/product/*`.

Si un document secondaire contredit cette spec, cette spec prime.

## Principes communs

- une récompense doit correspondre à une action réelle, vérifiable et utile;
- chaque badge doit pouvoir expliquer clairement son déclencheur;
- le système doit rester lisible, sobre et non compétitif;
- la progression doit être visible avant et après l obtention;
- les effets visuels doivent rester légers;
- les récompenses d XP doivent être idempotentes;
- les seuils de base doivent commencer à `Observateur` dès que la famille suit l échelle commune.

## Échelles communes

### Matrice des échelles autorisées par famille

| Famille | Échelle autorisée | Vocabulaire autorisé | Vocabulaire interdit |
|---|---|---|---|
| Explorer | Échelle d exploration dédiée | `Observateur`, `Promeneur Local`, `Arpenteur`, `Éclaireur`, `Patrouilleur`, `Repéreur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Régulateur`, `Conservateur`, `Gardien`, `Maître des Cartes` | `Quartz`, `Topaze`, `Pilier` |
| Participant | Échelle cartographique dédiée | `Observateur`, `Promeneur Local`, `Éclaireur`, `Patrouilleur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Conservateur`, `Gardien` | `Quartz`, `Topaze`, `Pilier` |
| Forms | Échelle végétale dédiée | `Graine`, `Pousse`, `Jeune plante`, `Arbuste`, `Jeune arbre`, `Arbre mature`, `Bosquet`, `Forêt primaire` | `Quartz`, `Topaze`, `Pilier`, `Talc` |
| Clean Zones | Échelle atmosphérique dédiée | `Brise`, `Horizon`, `Azur`, `Aurore`, `Zénith`, `Stratosphère`, `Éther`, `Hélios`, `Harmonie`, `Eden` | `Quartz`, `Topaze`, `Pilier`, `Talc` |
| Actions créées | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Équilibre des contextes | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Régularité mensuelle | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Zone sensible apaisée | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Mohs | Échelle minérale héritée | `Talc`, `Gypse`, `Calcite`, `Fluorite`, `Apatite`, `Orthose`, `Quartz`, `Topaze`, `Corindon`, `Diamant` | `Observateur`, `Quartz` gemme, `Pilier` |

Règle d application:

- chaque famille doit rester strictement sur son échelle autorisée;
- si une famille non gemme affiche un grade, l UI doit le nommer par sa propre échelle;
- `Mohs` reste explicitement héritée et distincte;
- `Participant` ne bascule jamais vers les gemmes même s il partage une logique de paliers;
- `Explorer` garde son vocabulaire cartographique propre.

### Échelle gemme

L échelle commune des badges infinis et des badges à progression par paliers suit cette logique:

- `Observateur` à `0`;
- `Quartz` à `1`;
- `Topaze` à `3`;
- `Saphir` à `5`;
- `Rubis` à `8`;
- `Émeraude` à `10`;
- `Diamant` à `15`;
- `Opale` à `20`;
- puis `Pilier II`, `Pilier III`, `Pilier IV`, etc. par paliers de `5`.

Cette échelle sert de base à:

- `Actions créées`;
- `Équilibre des contextes`;
- `Régularité mensuelle`;
- `Zone sensible apaisée`;
- la plupart des badges infinis de progression personnelle.

### Échelle d exploration dédiée

Les badges de couverture territoriale conservent une échelle propre, indépendante de l échelle gemme.

- base `Observateur`;
- progression sémantique `Observateur -> Promeneur Local -> Arpenteur -> Éclaireur -> Patrouilleur -> Repéreur -> Cartographe -> Coordinateur -> Sentinelle -> Régulateur -> Conservateur -> Gardien -> Maître des Cartes`;
- aucun vocabulaire gemme n est utilisé pour cette famille;
- l UI doit parler de `palier d exploration`, `niveau d exploration` ou `échelle d exploration`, jamais de `Quartz`, `Topaze`, `Pilier`, etc.

### Échelle minérale héritée

`Mohs` reste une échelle héritée distincte pour les compteurs déchets et mégots.

- elle est conservée pour compatibilité;
- elle ne doit pas devenir le modèle de référence des nouveaux badges;
- elle reste explicitement à part de l échelle gemme;
- elle n est pas la base du contrat `Observateur` des autres familles;
- ses grades conservent leurs noms minéraux propres: `Talc`, `Gypse`, `Calcite`, `Fluorite`, `Apatite`, `Orthose`, `Quartz`, `Topaze`, `Corindon`, `Diamant`.

## Familles de badges en V1

### Explorer

But:

- récompenser la découverte géographique;
- compter les lieux uniques visités.

Règles:

- source de données: `user_visited_places`;
- dédoublonnage par lieu unique;
- progression affichée dans la carte des badges;
- XP de palier: `+1` par palier débloqué;
- base: `Observateur`.

### Participant

But:

- récompenser la participation aux actions de dépollution.

Règles:

- source de données: `action_participants`;
- base `Observateur` à `0`;
- paliers actuels: `0, 1, 3, 5, 10, 15, 20, 25, 30`;
- XP de palier: `+1` à partir du premier palier utile, jamais sur le niveau `0`.

### Forms

But:

- récompenser les formulaires d action éligibles et validés.

Règles:

- action rattachée à un formulaire validé par l admin;
- exclusion des brouillons, suppressions, tests et formulaires incomplets;
- exclusion des actions de type `zone_propre`;
- dédoublonnage par paire `(action_id, group_id)`;
- XP: `+1` par palier;
- bonus décennal: `+2 XP` à 10, 20, 30, etc.

### Clean Zones

But:

- récompenser les lieux propres validés ou nettoyés.

Règles:

- sources: `trash_spotter_spots` et `spots`;
- fusion des deux sources avant comptage;
- dédoublonnage par clé canonique de lieu;
- cooldown de `24h` avant comptage;
- XP: `+1` par palier;
- bonus décennal: `+2 XP` à 10, 20, 30, etc.

### Premiers jalons

#### Première trace utile

- one-shot;
- `+1 XP`;
- déclenchement: première action validée avec données complètes;
- source de vérité: action `approved` + formulaire validé + complétude complète.

#### Trace fondatrice

- one-shot compagnon;
- pas d XP supplémentaire;
- sert de badge visuel de premier jalon.

### Actions créées

But:

- récompenser la création et l organisation d actions de dépollution réelles;
- ne jamais récompenser le simple remplissage du formulaire.

Règles:

- le compte connecté n est pas compté comme organisateur principal sauf pour `Action spontanée`;
- hors `Action spontanée`, les organisateurs doivent être renseignés explicitement;
- pour `Action spontanée`, le formulaire cache les organisateurs et le compte connecté devient l organisateur de référence;
- tant qu aucun formulaire validé n est rattaché à l action, aucun XP n est attribué;
- XP de base: `+1` par action créée valide;
- si plusieurs organisateurs sont reconnus, l XP est divisée à parts égales;
- la progression continue indéfiniment avec la logique `Pilier II`, `Pilier III`, etc.

### Équilibre des contextes

But:

- encourager une alternance saine entre:
  - `spontanée`;
  - `association`;
  - `entreprise`.

Règles:

- seules les actions validées comptent;
- une action en attente peut compter provisoirement pour la série, mais doit être retirée si elle est rejetée;
- si un mois n a aucune action éligible, la série retombe à `0`;
- le cycle fonctionne par paliers croissants:
  - 1 action de chaque type -> `+1 XP`;
  - 2 actions de chaque type -> `+2 XP`;
  - 3 actions de chaque type -> `+3 XP`;
  - etc.;
- après validation d un cycle, le compteur repart à zéro;
- l interface doit toujours montrer:
  - le grade actuel;
  - la progression vers le suivant;
  - les types et quantités encore manquants.

### Régularité mensuelle

But:

- récompenser une participation constante sans pression compétitive.

Règles:

- la série se calcule par mois calendaires consécutifs;
- le premier mois utile donne `1 XP`;
- le deuxième mois consécutif donne `2 XP`;
- le troisième donne `3 XP`, etc.;
- une action rejetée ne doit pas rester comptée;
- une action `pending` peut être prise en compte provisoirement, puis retirée rétroactivement si elle finit rejetée;
- la progression visuelle utilise l échelle gemme.

### Zone sensible apaisée

But:

- récompenser les actions validées sur les zones critiques ou historiquement très sales.

Règles:

- base gemme;
- paliers retenus: `1, 3, 5, 8, 10, 15, 20, ...`;
- `+1 XP` à chaque palier atteint;
- la progression est infinie;
- le badge doit rester discret, lisible et non culpabilisant.

### Inviter un ami

But:

- récompenser l invitation utile et la transmission du réseau.

Règles:

- one-shot;
- `+2 XP`;
- le lien d invitation doit persister;
- la chaîne de parrainage doit être enregistrée;
- le badge doit rester non compétitif.

## Badges hérités

### Mohs

But:

- conserver la lecture historique des compteurs déchets et mégots.

Règles:

- badge compact d affichage secondaire;
- échelle minérale propre;
- usage hérité, pas modèle de conception pour les nouveaux badges;
- il reste à part du contrat `Observateur` commun.

## Règles d attribution XP

- une récompense XP doit être unique par source logique;
- chaque attribution doit avoir un `source_table` et un `source_id` stables;
- `progression_events` est le journal d audit, pas la source de vérité métier;
- les insertions doivent être idempotentes;
- si un palier a déjà été validé, il ne doit pas être réattribué;
- les notifications temps réel sont un effet secondaire, jamais la preuve métier.

## Politique d écriture `progression_events`

### Classifications

- **retryable**: erreurs transitoires de base de données ou réseau, par exemple timeout, coupure de connexion, deadlock, serialization failure;
- **duplicate**: violation d unicité sur un événement déjà écrit;
- **blocking**: erreur de schéma, de droits, de validation de données ou toute autre erreur persistante.

### Règle opérationnelle

- dans les chemins stricts, un échec `retryable` est tenté plusieurs fois puis relancé si la cause persiste;
- dans les chemins stricts, un `duplicate` est ignoré et considéré comme déjà traité;
- dans les chemins `best_effort` de lecture ou d affichage, un échec non dupliqué est journalisé puis ignoré pour ne pas casser le rendu de la page;
- les écritures d audit `xp_audit` et les notifications temps réel restent secondaires et ne doivent pas masquer la progression métier;
- les chemins qui reconstituent la progression à partir des données sources doivent échouer franchement si la base métier est incohérente, afin d éviter de figer une progression fausse.

### Conséquence produit

- les actions utilisateur restent visibles même si un événement d audit échoue;
- la progression ne doit jamais être faussée par un événement écrit deux fois;
- une écriture temporairement indisponible doit être rejouée automatiquement avant de conclure à un échec;
- une erreur persistante doit remonter dans les tâches de synchronisation et de réparation, mais pas bloquer un simple affichage de badge.

## Règles UI

- afficher systématiquement le grade courant;
- afficher la progression vers le prochain grade;
- transformer les aides techniques en tooltip discret quand c est possible;
- garder les célébrations légères;
- ne pas transformer les cartes en mini-jeux;
- le contraste et la lisibilité priment sur l effet visuel.

## Ce qui est hors V1

- leaderboard compétitif comme mécanique principale;
- récompenses aléatoires;
- perte de points visible;
- boutique de récompenses;
- objectifs communautaires globaux à atteindre;
- badges décoratifs sans critère stable.

## Documents de soutien

- [Catalogue des badges](../../../../gamification/BADGE_CATALOG.md)
- [Gamification non competitive](../../../../product/gamification-non-competitive.md)
- [Objectifs validés](../../../../product/objectifs-valides.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)

## Vérification

Cette spec doit rester alignée avec:

- `apps/web/src/app/api/gamification/badges/list/route.ts`
- `apps/web/src/lib/gamification/*`
- `apps/web/src/components/gamification/*`

Si un changement métier est fait dans le code, cette spec doit être mise à jour dans la même passe.
