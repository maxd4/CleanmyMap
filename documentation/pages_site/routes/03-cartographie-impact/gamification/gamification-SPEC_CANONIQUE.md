# Spécification canonique de la gamification

Ce document est la référence unique à lire en premier pour comprendre la gamification CleanMyMap.

Il centralise:

- les règles métier réellement appliquées par le code;
- les familles de badges déjà présentes;
- les sources de données utilisées;
- les garde-fous d attribution d XP;
- les conventions UI qui doivent rester stables.

Les autres documents de gamification restent utiles, mais ils sont désormais secondaires par rapport à cette spec.

## Unité de progression CURRENT

- l'XP est l'unique unité de progression CURRENT ; elle n'est jamais dépensable
  et aucune monnaie consommable ne la remplace ;
- `progression_events` est l'unique ledger XP CURRENT et
  `progression_profiles` sa projection persistante ;
- `points_ledger` et `user_points` restent des surfaces
  `COMPATIBILITY/LEGACY` pour les données et routes historiques. Aucun flux
  CURRENT ne doit les utiliser pour attribuer, afficher ou dépenser la
  progression.

## Taxonomie CURRENT

Les registres typés de `apps/web/src/lib/gamification/progression-utils.ts` sont
la source canonique de classification des événements. `ProgressionDefinition`
décrit les sept progressions infinies et `MilestoneDefinition` les trois
jalons one-shot CURRENT ; leurs IDs et leurs faits sources sont distincts.

Les sept progressions infinies sont :

| ID stable | Libellé | Métrique métier | Domaine source | Famille / échelle |
| --- | --- | --- | --- | --- |
| `participation` | Participation | `participation_count` | actions, participations et signalements utiles | `participant` / `participant` |
| `organisation` | Organisation | `organised_operations_count` | organisateurs d'actions et opérations collectives | `organisation` / `gem` |
| `exploration` | Exploration | `unique_places_visited` | `user_visited_places` | `explorer` / `exploration` |
| `clean_zones` | Zones propres | `eligible_clean_zones` | `trash_spotter_spots` / `clean_zones` | `clean-zones` / `atmosphere` |
| `regularity` | Régularité | `active_months_total` | actions par mois | `regularity` / `gem` |
| `versatility` | Polyvalence | `validated_context_cycles` | actions et contextes de contribution | `versatility` / `gem` |
| `learning` | Apprentissage | `validated_learning_events` | quiz et contenus d'apprentissage | `learning` / `learning` |

Chaque progression suit le contrat commun `GamificationProgressionState` :
`id`, `label`, `description`, `metric`, `sourceDomain`, `badgeFamily`,
`scale`, `infinite`, `currentValue`, `currentBadge`, `nextBadge`,
`progressPercent` et `xpContribution`. `xpContribution` est une contribution
calculée au total global ; il n'existe aucun solde XP indépendant par
progression.

Les autres catégories du registre sont séparées :

- `milestone` : jalons uniques `Première trace utile`, `Trace fondatrice` et
  `Parrainage utile`, acquis au plus une fois et affichés sans barre de
  progression infinie ;
- `non_progression` : métriques d'impact, usage utilitaire et familles de
  compatibilité conservées sans constituer une progression CURRENT.

Le total XP global est la somme des `progression_events` actifs de toutes les
progressions et des XP des jalons one-shot. Aucun event type ne crée un second
ledger ou une balance par famille.

## Périmètre

La section canonique concernée est `/sections/gamification`, vue dans le bloc Cartographie & Impact.
L URL `/gamification` reste un alias de compatibilité et ne doit plus être présentée comme la source de vérité.

Le système couvre:

- les badges exposés par l API;
- les compteurs infinis visibles dans le profil;
- les badges one-shot d entrée;
- les badges d'action historiques encore affichés pour compatibilité;
- les notifications et l audit XP associés.

Le bloc « Progression & badges » du profil propose aussi un accès contextuel à
`/profil/impact`, surface protégée de carte d’impact personnelle exportable et
partageable. Cette carte ne remplace pas `/sections/gamification` et ne
déplace aucune analyse collective de `/reports`.

## Hiérarchie des sources

Ordre de confiance:

1. le code métier dans `apps/web/src/app/api/gamification/badges/list/route.ts` et les modules `apps/web/src/lib/gamification/*`;
2. les composants UI dans `apps/web/src/components/gamification/*`;
3. cette spec canonique;
4. les mémoires produit `documentation/product/*`.

Si un document secondaire contredit cette spec, cette spec prime.

## Scopes temporels

La gamification manipule maintenant des scopes explicitement nommés.

| Scope | Sens | Usage |
|---|---|---|
| `allTime` | cumul depuis la création du compte | progression personnelle, badges persistants, historique |
| `yearToDate` | année civile en cours | bilans, classements annuels, reconnaissance éditoriale |
| `rolling30d` | 30 derniers jours | pilotage opérationnel |
| `rolling90d` | 90 derniers jours | lecture intermédiaire |
| `rolling365d` | 365 derniers jours | tendance de fond |

Règle d implémentation:

- un bloc de données ne doit pas mélanger plusieurs scopes sans le nommer;
- `allTime` sert le socle cumulatif;
- `yearToDate` sert les variantes annuelles ou éditoriales;
- les fenêtres `rolling*` servent les vues d analyse et de pilotage.

## Principes communs

- une récompense doit correspondre à une action réelle, vérifiable et utile;
- chaque badge doit pouvoir expliquer clairement son déclencheur;
- le système doit rester lisible, sobre et non compétitif;
- la progression doit être visible avant et après l obtention;
- les effets visuels doivent rester légers;
- les récompenses d XP doivent être idempotentes;
- les seuils de base doivent commencer à `Observateur` dès que la famille suit l échelle commune.

## Échelles communes

### Matrice des échelles autorisées par progression CURRENT

| Famille | Échelle autorisée | Vocabulaire autorisé | Vocabulaire interdit |
|---|---|---|---|
| Participation | Échelle cartographique dédiée | `Observateur`, `Promeneur Local`, `Éclaireur`, `Patrouilleur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Conservateur`, `Gardien` | `Quartz`, `Topaze`, `Pilier` |
| Organisation | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire Forms, impact brut, Mohs |
| Exploration | Échelle d'exploration dédiée | `Observateur`, `Promeneur Local`, `Arpenteur`, `Éclaireur`, `Patrouilleur`, `Repéreur`, `Cartographe`, `Coordinateur`, `Sentinelle`, `Régulateur`, `Conservateur`, `Gardien`, `Maître des Cartes` | `Quartz`, `Topaze`, `Pilier` |
| Zones propres | Échelle atmosphérique dédiée | `Brise`, `Horizon`, `Azur`, `Aurore`, `Zénith`, `Stratosphère`, `Éther`, `Hélios`, `Harmonie`, `Eden` | `Quartz`, `Topaze`, `Pilier`, `Talc` |
| Régularité | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Polyvalence | Échelle gemme | `Observateur`, `Quartz`, `Topaze`, `Saphir`, `Rubis`, `Émeraude`, `Diamant`, `Opale`, `Pilier` | vocabulaire exploration, végétal, atmosphérique, Mohs |
| Apprentissage | Échelle pédagogique de learning | paliers d'apprentissage définis par le registre | quiz et contenus d'apprentissage | `learning` / Forms |

Règle d application:

- chaque famille doit rester strictement sur son échelle autorisée;
- si une famille non gemme affiche un grade, l UI doit le nommer par sa propre échelle;
- `Mohs` reste explicitement héritée et distincte;
- `Mohs` ne fait pas partie de cette matrice CURRENT : elle reste une lecture
  historique secondaire des compteurs déchets et mégots;
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

- `Organisation`;
- `Polyvalence`;
- `Régularité`;
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

### Apprentissage

Les paliers quiz par type et quiz équilibré sont des événements et des
indicateurs rattachés à `learning`. Ils ne constituent pas deux progressions
infinies supplémentaires : l'API et la rubrique exposent une seule synthèse
`Apprentissage`, avec les réponses justes comme métrique principale et la
diversité des types ainsi que leur équilibre comme sous-indicateurs. Les IDs
historiques des événements restent conservés pour la compatibilité et
l'historique XP.

## Familles de badges en V1

### Exploration

But:

- récompenser la découverte géographique;
- compter les lieux uniques visités.

Règles:

- source de données: `user_visited_places`;
- dédoublonnage par lieu unique;
- progression affichée dans la carte des badges;
- XP de palier: `+1` par palier débloqué;
- base: `Observateur`.

### Participation

But:

- récompenser la participation aux actions de dépollution.

Règles:

- source de données: `action_participants` où `participation_status = confirmed`;
- `action_registrations` est exclusivement la source des inscriptions futures et ne contribue jamais aux badges, à la progression, aux statistiques personnelles ou à la gamification;
- une demande de claim post-action `pending` ou `cancelled` est exclue; un claim `confirmed` contribue comme toute autre participation finale confirmée;
- base `Observateur` à `0`;
- paliers actuels: `0, 1, 3, 5, 10, 15, 20, 25, 30`;
- XP de palier: `+1` à partir du premier palier utile, jamais sur le niveau `0`.
- seuls les participants finaux `confirmed` comptent; une inscription future,
  une présence communautaire ou un signalement en attente ne créditent pas
  cette progression.

### Forms (compatibilité hors taxonomie CURRENT)

But:

- fournir la preuve et la condition de validation d'une action organisée.

Règles:

- action rattachée à un formulaire validé par l admin;
- exclusion des brouillons, suppressions, tests et formulaires incomplets;
- exclusion des actions de type `zone_propre`;
- dédoublonnage par paire `(action_id, group_id)`;
- la complétude du formulaire peut rendre l'action éligible à `Organisation` et
  au jalon `Première trace utile`;
- aucun badge Forms CURRENT, aucune barre Forms et aucun XP ne sont attribués
  pour remplir ou multiplier des formulaires;
- les événements historiques `form_tier_unlock` et `form_bonus` restent
  lisibles dans le registre comme `COMPATIBILITY`, mais le rebuild CURRENT ne
  les écrit plus;

### Axes déclassés et métriques conservées

- le niveau de confiance est une propriété dérivée de faits vérifiés et ne
  constitue ni une progression XP, ni une monnaie, ni une récompense achetable
  ou dépensable;
- la qualité est un critère transversal de complétude, de validation et de
  niveau global. Une moyenne qui peut baisser ne doit pas être affichée comme
  une barre de progression infinie;
- les kg de déchets et les mégots restent des métriques d'impact. Ils sont
  affichables avec leur provenance et leur couverture, mais ils ne créent ni
  XP principal ni palier `1 kg = XP` ou `100 mégots = XP`;
- les anciennes identités de badges et d'événements peuvent rester présentes
  pour l'historique, sans réactiver une attribution CURRENT;

### Clean Zones

But:

- récompenser les lieux propres validés ou nettoyés.

Règles:

- source métier courante: `trash_spotter_spots` uniquement;
- `spots` n'est jamais relue pour constituer les candidats;
- les anciennes clés `spots` dans `progression_events` restent reconnues uniquement pour compatibilité historique et idempotence;
- dédoublonnage par clé canonique de lieu;
- cooldown de `24h` avant comptage;
- le comptage courant et l'événement `clean_zone_task` sont dédoublonnés par
  lieu canonique; `spot_validation_bonus` reste une compatibilité historique,
  pas une seconde source de zones propres;
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

### Organisation

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
- la métrique canonique est le nombre d'actions organisées et validées, dédupliquées
  par action; `action_declare_pending` n'est pas un crédit d'organisation;
- la progression continue indéfiniment avec la logique `Pilier II`, `Pilier III`, etc.

### Polyvalence

But:

- encourager une alternance saine entre:
  - `spontanée`;
  - `association`;
  - `entreprise`.

Règles:

- seules les actions validées comptent;
- chaque action canonique ne peut contribuer qu une fois, y compris lors d un
  replay ou d une reconstruction;
- le cycle fonctionne par paliers croissants:
  - 1 action de chaque type -> `+1 XP`;
  - 2 actions de chaque type -> `+2 XP`;
  - 3 actions de chaque type -> `+3 XP`;
  - etc.;
- la métrique de badge est le nombre de cycles équilibrés accomplis;
- après validation d un cycle, les contributions excédentaires restent acquises
  pour le cycle suivant; sa cible propre est appliquée sans double comptage;
- l interface doit toujours montrer:
  - le grade actuel;
  - la progression vers le suivant;
  - les types et quantités encore manquants.

Le nom utilisateur de cette progression est `Polyvalence`; `Équilibre des
contextes` est le terme technique autorisé pour décrire sa mécanique.

La matérialisation technique de chaque cycle est l'événement typé
`action_balance_cycle` dans `progression_events`, avec l'action déclenchante
comme source stable et `cycleIndex` / `requiredPerType` dans les métadonnées.
Cet événement porte directement l'XP du cycle; il ne génère aucune écriture
dans `points_ledger`.

### Régularité

But:

- récompenser une participation constante sans pression compétitive.

Règles:

- `activeMonthsTotal` compte les mois calendaires qui contiennent au moins une
  contribution éligible et détermine le badge permanent;
- `currentStreakMonths` mesure uniquement la série actuelle de mois calendaires
  consécutifs;
- `longestStreakMonths` conserve la meilleure série observée lorsque cette
  dérivation est disponible;
- le premier mois utile donne `1 XP`;
- le deuxième mois consécutif donne `2 XP`;
- le troisième donne `3 XP`, etc.;
- une interruption remet la série courante et la prochaine série XP à zéro,
  sans retirer les mois actifs ni un badge déjà acquis;
- une action rejetée ne doit pas rester comptée;
- une action `pending` peut être prise en compte provisoirement, puis retirée rétroactivement si elle finit rejetée;
- la progression visuelle utilise l échelle gemme.

### Zone sensible apaisée (métrique historique avec preuve figée)

But:

- récompenser les actions validées sur les zones critiques selon la règle CURRENT
  des zones sensibles.

Règles:

- elle ne constitue pas une huitième progression infinie CURRENT et ne crée pas
  de solde XP indépendant;
- au moment où une action devient validée, le moteur évalue sa zone avec
  `buildZones` et enregistre dans `progression_events` une preuve stable par
  action, avec l'identifiant de l'action, la zone, la date de l'action, la
  date d'évaluation et la version de la règle;
- la preuve est enregistrée pour une qualification positive comme négative :
  une zone non sensible au moment de la validation ne pourra pas devenir
  éligible rétroactivement si son état courant change;
- « historiquement sensible » signifie donc « sensible au moment de l'action
  validée », jamais « sensible aujourd'hui »;
- le calcul du badge lit ces preuves historiques. L'état environnemental
  courant d'une zone reste une projection distincte et ne révoque pas une
  contribution acquise;
- les seuils gemme `1, 3, 5, 8, 10, 15, 20`, puis les paliers de `5`, donnent
  chacun `+1 XP` via un événement `sensitive_zone_milestone` unique par
  utilisateur et seuil; cette mécanique reste hors de
  `CURRENT_INFINITE_PROGRESSION_IDS` et ne crée pas de solde XP propre;
- une action ne compte qu'une fois. Une réjection ou annulation supprime sa
  preuve et réconcilie les paliers devenus inatteignables; les rejouements
  restent idempotents. Une zone devenue propre après validation ne révoque
  jamais la qualification ni les paliers déjà acquis.

### Inviter un ami

But:

- récompenser une invitation devenue une contribution utile et confirmée.

Règles:

- la création et le partage du lien donnent `0 XP`;
- l inscription via le lien donne `0 XP`;
- la première contribution utile confirmée de l invité donne `+2 XP` à l invitant;
- cette attribution est one-shot par filiation persistée et reste idempotente;
- le lien d invitation et la chaîne de parrainage doivent persister;
- une auto-filiation est refusée;
- le badge doit rester non compétitif.

## Badges hérités

### Mohs

But:

- conserver la lecture historique des compteurs déchets et mégots.

Règles:

- badge compact d affichage secondaire;
- échelle minérale propre;
- lecture historique uniquement pour les déchets et les mégots; il ne produit
  plus de barre dans les surfaces CURRENT;
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

- [Gamification non competitive](../../../../product/gamification-non-competitive.md)
- [Objectifs validés](../../../../product/objectifs-valides.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)

## Vérification

La surface administrative d'audit XP est `/admin/gamification/xp-audit` et
doit appeler `checkAdminAccess()` avant toute lecture privilégiée. Les règles
générales d'autorisation restent définies dans la doctrine sécurité dédiée.

Cette spec doit rester alignée avec:

- `apps/web/src/app/api/gamification/badges/list/route.ts`
- `apps/web/src/lib/gamification/*`
- `apps/web/src/components/gamification/*`

Si un changement métier est fait dans le code, cette spec doit être mise à jour dans la même passe.
