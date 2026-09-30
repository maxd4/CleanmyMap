# Décisions produit — identité visuelle des badges de gamification

**Statut documentaire : `PLAN / DECISION RECORD`**
**Décision : direction retenue, implémentation finale différée.**

## 1. Pourquoi ce document existe

La gamification CleanMyMap est en cours de convergence structurelle.

Les progressions, jalons, règles XP, règles de réconciliation et surfaces front-end doivent être stabilisés avant de produire les assets finaux des badges.

Ce document enregistre les décisions déjà prises afin d’éviter deux erreurs :

1. réouvrir inutilement des options déjà écartées ;
2. implémenter trop tôt une direction graphique définitive sur une architecture encore en mouvement.

Le détail du langage graphique est porté par :

`documentation/design-system/GAMIFICATION_BADGES_VISUAL_DIRECTION.md`

La source métier des badges et progressions reste la spécification canonique de gamification.

---

## 2. Décision produit principale

Le futur système visuel doit favoriser :

- reconnaissance immédiate de la famille ;
- lecture simple du palier ;
- différenciation progression / jalon ;
- lisibilité mobile ;
- esthétique non compétitive ;
- cohérence avec CleanMyMap ;
- capacité à évoluer avec de nouveaux paliers sans recréer tout le système.

Direction de référence :

> badges 2D de type patch / médaille plate, avec une icône métier centrale et un traitement de palier distinct.

Cette décision est une **direction de conception**, pas une obligation d’implémenter immédiatement de nouveaux assets.

---

## 3. Choix actuellement retenus

### 3.1 Progressions

Une progression infinie doit utiliser une forme principalement circulaire ou équivalente, compatible avec une notion de palier continu.

### 3.2 Jalons

Un jalon one-shot doit utiliser une forme distincte, de type écusson / patch / médaille plate / hexagone doux.

### 3.3 Identité métier

Chaque famille possède une identité iconographique stable.

Le passage de palier ne remplace pas cette identité.

### 3.4 Gemmes

Les gemmes sont un langage de palier lorsque la famille suit réellement une échelle gemme.

Elles ne deviennent pas la forme unique de toute la gamification.

### 3.5 `New`

`New` est un marqueur transversal vert sous forme de petite bulle/pill.

Il reste séparé de l’asset du badge.

### 3.6 XP

Le fait qu’un badge attribue de l’XP est indiqué par l’interface.

Il n’est pas encodé dans l’illustration.

### 3.7 BADGE_ONLY

Un badge honorifique sans XP reste visuellement valorisé.

Il ne porte jamais une mention `+0 XP`.

---

## 4. Non-choix explicites

Les éléments suivants ne sont pas « en attente d’implémentation ».

Ils sont **non retenus comme système principal dans la direction actuelle**.

### Trophées / coupes

Non retenus comme langage principal.

Ils véhiculent trop fortement :

- compétition ;
- classement ;
- podium ;
- victoire sur les autres.

Un usage exceptionnel futur n’est pas interdit mais exige une décision spécifique.

### Avatars

Non retenus comme badges principaux.

Une future mascotte ou personnalisation de profil constitue un chantier distinct.

### 3D réaliste

Non retenue comme grammaire principale.

La 2D avec profondeur légère est privilégiée.

### Puzzle global

Non retenu comme architecture de toutes les progressions.

Le puzzle reste une piste secondaire pour des collections limitées.

### Gemmes généralisées

Non retenu.

Les familles ayant une échelle propre conservent leur identité.

### Médailles compétitives

Les médailles sont acceptables comme inspiration de forme pour certains jalons, mais pas comme vocabulaire de podium.

---

## 5. Options volontairement différées

Les choix suivants ne sont pas encore stabilisés et ne doivent pas être transformés en contrat CURRENT :

- illustration finale de chaque progression ;
- jeu exact d’icônes ;
- palette finale de chaque palier ;
- forme géométrique définitive de chaque badge ;
- texture ;
- ombrage ;
- pseudo-3D ;
- animation d’obtention ;
- animation de changement de palier ;
- système de collections puzzle ;
- éventuels trophées exceptionnels ;
- éventuelle mascotte ;
- pipeline final des assets.

Leur statut est :

`DEFERRED_UNTIL_GAMIFICATION_ARCHITECTURE_STABLE`

et non :

`TODO_IMPLEMENT_NOW`.

---

## 6. Raison du gel d’implémentation

Le système fonctionnel est en train d’être simplifié autour de :

- progressions infinies ;
- jalons one-shot ;
- mécanique admin ;
- XP recalculable ;
- badges avec et sans XP ;
- catalogue complet ;
- états utilisateur ;
- nouveautés après migration ;
- réconciliation et reçu utilisateur.

Produire maintenant une série définitive de badges ferait courir un risque de :

- créer des assets pour des familles supprimées ensuite ;
- figer une distinction visuelle incompatible avec le futur registre ;
- multiplier les composants de compatibilité ;
- créer des styles concurrents.

La conception visuelle finale reprend donc après stabilisation fonctionnelle.

---

## 7. Ce qui peut être fait avant la reprise

Avant le chantier graphique final, il est acceptable de :

- documenter la direction ;
- préserver les composants actuels ;
- rendre les composants compatibles avec des IDs de badges stables ;
- distinguer proprement progression / jalon / `New` / XP ;
- utiliser des icônes temporaires déjà cohérentes avec le design system ;
- éliminer les duplications de logique visuelle évidentes si cela fait partie des lots de convergence.

Il ne faut pas :

- générer une collection complète d’assets définitifs ;
- remplacer massivement les badges existants uniquement pour appliquer cette direction ;
- choisir définitivement toutes les icônes avant stabilisation des familles ;
- créer un nouveau moteur de badges visuels parallèle.

---

## 8. Critères de reprise

Le chantier visuel peut être réouvert lorsque les éléments suivants sont validés sur le `main` réel :

- catalogue canonique des progressions ;
- catalogue canonique des jalons ;
- catégories XP / BADGE_ONLY / NON_GAMIFIED ;
- règles de réconciliation ;
- règle de niveau globale ;
- progression Modération ;
- états `not_started`, `in_progress`, `completed` ;
- marqueur `New` ;
- contrats API consommés par `/sections/gamification`.

Lors de la reprise :

1. relire `main` ;
2. réauditer les consommateurs ;
3. vérifier la liste exacte des badges et paliers ;
4. produire plusieurs directions visuelles comparables si utile ;
5. choisir les assets finaux ;
6. intégrer le système dans le design system ;
7. vérifier mobile, accessibilité et performance.

---

## 9. Relation avec la gamification non compétitive

Le futur langage visuel doit rester compatible avec une gamification :

- non centrée sur le classement ;
- non punitive ;
- orientée contribution ;
- lisible ;
- valorisante sans logique de casino.

Les badges doivent exprimer :

```text
progression personnelle
+ reconnaissance
+ contribution
```

et non :

```text
victoire
+ rareté marchande
+ supériorité sociale
```

---

## 10. Résumé de décision

```text
BASE VISUELLE
2D patch / médaille plate

PROGRESSION
forme circulaire + identité métier + traitement de palier

JALON
écusson / médaille plate distincte

GEMMES
oui pour les familles qui les utilisent réellement

NEW
pill verte séparée

XP
information UI séparée

PUZZLE
secondaire, collections futures

TROPHÉES
exceptionnels seulement

AVATARS
hors système principal

3D
non comme base

IMPLEMENTATION ASSETS FINAUX
gelée jusqu’à stabilisation de l’architecture gamification
```
