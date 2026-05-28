# Progression & badges

## Fiche canonique

- **Route canonique** : `/sections/gamification`
- **Alias public** : `/gamification` -> redirection vers la route canonique
- **Fichiers source principaux** :
  - `apps/web/src/components/sections/rubriques/gamification/index.tsx`
  - `apps/web/src/app/api/gamification/me/route.ts`
  - `apps/web/src/app/api/gamification/leaderboard/route.ts`
  - `apps/web/src/lib/gamification/progression.ts`
  - `apps/web/src/lib/gamification/progression-formulas.ts`
  - `apps/web/src/lib/gamification/progression-tracking.ts`
  - `apps/web/src/lib/gamification/progression-data.ts`
  - `apps/web/src/lib/gamification/annual-reset.ts`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact
- **Statut** : protégé
- **Contexte necessaire** : compte connecté
- **Objectif utilisateur principal** : lire sa progression, comprendre ses paliers, comparer son impact et repérer les distinctions obtenues.
- **Palette dominante** : red
- **Scope** : progression personnelle, badges, classement et reconnaissance

## Vue d ensemble du systeme

La gamification de CleanMyMap repose sur trois couches distinctes :

- **la progression long terme** : un niveau qui monte avec l XP total, mais qui peut etre bloque par des prerequis de qualite et de comportement ;
- **les badges** : des distinctions derivées de criteres cumulatifs, visibles des que le seuil est atteint ;
- **les objectifs** : des repères de rythme, soit one-shot, soit recurrents, soit infinis.

Le systeme actuel privilegie la **qualite**, la **regularite** et la **contribution collective** plutot que le simple volume.

## Calcul du niveau

### Principe

- Le niveau **potentiel** est calcule uniquement a partir de l XP total.
- Le niveau **courant** est le niveau reel visible pour l utilisateur.
- Le niveau courant peut etre inferieur au potentiel si des prerequis ne sont pas remplis.
- Quand les prerequis ne sont pas satisfaits, la progression est "frozen" au niveau courant.

### Courbe XP

La fonction de base est :

- `xpStep(level) = round(40 * 1.18^(level - 1))`
- `xpRequired(level)` = somme des paliers precedents

Valeurs de repere :

- niveau 1 -> `0` XP requis
- niveau 2 -> `40` XP
- niveau 3 -> `87` XP
- niveau 4 -> `143` XP

La croissance est volontairement **douce mais exponentielle** :

- le premier palier est accessible ;
- chaque niveau demande un peu plus que le precedent ;
- la progression reste finie mathematiquement, mais operativement elle est traitee comme **infinie** car elle ne fixe pas de plafond fonctionnel utile.

### Prerequis de passage

Pour atteindre un niveau donne, le moteur verifie :

- `minValidatedActions(level) = max(1, floor(1.5 * level))`
- `minDiversityTypes(level) = min(5, 1 + floor((level - 1) / 3))`
- `minCollectiveEvents(level) = floor(level / 4)`
- a partir du niveau 5 :
  - `qualityAverage >= 70`
  - `validationRatio >= 0.6`

Lecture produit :

- plus le niveau monte, plus il faut des actions validees ;
- la diversite des contributions monte par marches ;
- la participation collective devient progressivement obligatoire ;
- au-dela d un certain seuil, la qualite moyenne et le ratio de validation deviennent des filtres de confiance.

### Point cle

Le niveau n est pas un simple compteur d XP. C est un **niveau de maturite** :

- XP pour ouvrir le palier ;
- prerequis pour le consolider ;
- recalcul a chaque synchronisation de progression.

## Badges

### Role des badges

Les badges sont des **distinctions derivées**. Ils servent a :

- rendre visible le parcours ;
- valoriser les seuils atteints ;
- signaler des formes d engagement differenciees.

Ils sont recalcules a partir des donnees actuelles, donc ils sont **persistants par logique de calcul** plutot que par saisie manuelle.

### Familles de badges

#### Niveau

- `Contributeur regulier` a partir du niveau 3
- `Contributeur confirme` a partir du niveau 6
- `Pilier terrain` a partir du niveau 10
- `Referent impact` a partir du niveau 14

#### Mégots

- `Ramasseur de Mégots (Bronze)` a partir de 500 mégots
- `Chasseur de Mégots (Argent)` a partir de 2000 mégots
- `Expert Mégots (Or)` a partir de 10000 mégots

#### Poids collecté

- `Bras Armé (Bronze)` a partir de 10 kg
- `Force de la Nature (Argent)` a partir de 100 kg
- `Héros du Nettoyage (Or)` a partir de 500 kg

#### Qualité

- `Données de Qualité` a partir de 75 de moyenne
- `Sentinelle Exemplaire` a partir de 90 de moyenne

#### Collectif

- `Esprit d Équipe` a partir de 3 evenements collectifs
- `Pilier de Communauté` a partir de 10 evenements collectifs

### Regle de lecture

- les badges sont **additifs** ;
- ils ne remplacent pas les precedents ;
- leur ordre d affichage suit la logique de calcul du moteur ;
- ils peuvent etre vus comme des **objectifs a validation unique** si l on raisonne en produit : une fois le seuil atteint, la distinction reste acquise.

## Objectifs

### Objectifs validés une seule fois

Ce sont les objectifs de type "unlock" :

- un seuil est franchi une seule fois ;
- la distinction reste acquise ensuite ;
- ce modele convient aux badges et a certains jalons d onboarding ou de reputation.

Dans l implémentation actuelle, il n existe pas de table d objectifs one-shot dédiée. Le comportement equivalent est porté par les **badges derives**.

### Objectifs recurrents a palier uniforme

Ce sont les objectifs qui se repetent selon une meme regle :

- le seuil ne change pas d un cycle a l autre ;
- seul le cycle change ;
- c est utile pour maintenir un rythme stable.

Exemple present dans le systeme :

- **objectif mensuel** : `10 kg` de collecte par mois
- le compteur se remet a jour a chaque mois
- le statut repasse a un nouvel objectif sans complexifier la formule

Ce type d objectif est lisible, simple a suivre et bon pour les habitudes.

### Objectifs infinis

Ce sont les objectifs qui ne se terminent pas apres un seuil final unique :

- chaque palier conserve la meme famille d objectif ;
- le seuil augmente ou l apparence evolue au fil des paliers ;
- le badge associe change de nom et de style graphique pour signaler le nouveau rang atteint.

Dans le systeme actuel, c est la logique du **niveau** :

- la courbe XP augmente via `1.18` de croissance par palier ;
- les prerequis deviennent plus stricts ;
- la progression reste ouverte, sans plafond produit utile.

## Ce qui existe deja dans le produit

- **Profil personnel** : niveau actuel, niveau potentiel, XP validee, XP en attente.
- **Progression visible** : barre vers le prochain niveau.
- **Badges** : blocs visuels de reconnaissance.
- **Classement individuel** : utilisateurs.
- **Classement collectif** : associations / collectifs.
- **Reconnaissance utile** : mise en avant des contributeurs verifiés.
- **Methodologie** : explication de la logique d impact et de qualite.

## Points de cadrage a garder en tete

- La route visible dans l interface peut etre l alias `/gamification`, mais la reference fonctionnelle est la section `/sections/gamification`.
- Les badges sont derives, pas saisis manuellement.
- Le niveau courant peut etre bloque meme si l XP potentiel autorise le palier suivant.
- L objectif mensuel actuel est uniforme ; il ne se comporte pas comme un palier croissant.
- Si un futur besoin demande de vrais objectifs one-shot persistants, il faudra ajouter un modele de donnees dedie avec un statut `completed` et une date de completion.

## Reference legacy

- [progression_badges.md](../../../../3-BLOC-VISUALISER&IMPACTER/progression_badges.md)

## Notes de maintenance

- Cette fiche est la source de verite canonique pour la progression et les badges.
- Toute evolution des seuils doit etre synchronisee avec :
  - `apps/web/src/lib/gamification/progression-formulas.ts`
  - `apps/web/src/lib/gamification/progression.ts`
  - `apps/web/src/lib/gamification/annual-reset.ts`
  - `apps/web/src/components/sections/rubriques/gamification/*`
