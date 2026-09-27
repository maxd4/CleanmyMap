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

## Taxonomie CURRENT et registre des décisions

`GAMIFICATION_REGISTRY` dans
`apps/web/src/lib/gamification/progression-utils.ts` est le registre canonique
unique des mécaniques et signaux métier. Il n'existe pas de matrice produit
parallèle à compléter plus tard. Chaque entrée porte obligatoirement :

- un `id` stable ;
- une `category` exactement égale à `XP_PROGRESSION`, `XP_MILESTONE`,
  `BADGE_ONLY` ou `NON_GAMIFIED` ;
- un `progressionId` éventuel ;
- une `xpPolicy` explicite ;
- la source métier ;
- le badge ou jalon associé, le cas échéant ;
- la visibilité ;
- la `rulesVersion` applicable.

Une donnée disponible mais volontairement exclue est donc enregistrée comme
`NON_GAMIFIED`, avec sa raison CURRENT. Elle ne constitue ni une proposition,
ni un TODO, ni un signal « à traiter plus tard ».

Les huit progressions infinies sont :

| ID stable | Libellé | Métrique métier | Domaine source | Famille / échelle |
| --- | --- | --- | --- | --- |
| `participation` | Participation | `participation_count` | `action_participants.confirmed` | `participant` / `participant` |
| `organisation` | Organisation | `organised_operations_count` | organisateurs d'actions et opérations collectives | `organisation` / `gem` |
| `exploration` | Exploration | `unique_places_visited` | `user_visited_places` | `explorer` / `exploration` |
| `clean_zones` | Zones propres | `eligible_clean_zones` | `trash_spotter_spots` / `clean_zones` | `clean-zones` / `atmosphere` |
| `regularity` | Régularité | `active_months_total` | actions par mois | `regularity` / `gem` |
| `versatility` | Polyvalence | `validated_context_cycles` | actions et contextes de contribution | `versatility` / `gem` |
| `learning` | Apprentissage | `validated_learning_events` | quiz et contenus d'apprentissage | `learning` / `learning` |
| `moderation` | Modération | `resolvedModerationCases` | `admin_operations_audit` (`moderation` / `success`) | `moderation` / `gem` |

Chaque progression suit le contrat commun `GamificationProgressionState` :
`id`, `label`, `description`, `metric`, `sourceDomain`, `badgeFamily`,
`scale`, `infinite`, `currentValue`, `currentBadge`, `nextBadge`,
`progressPercent` et `xpContribution`. `xpContribution` est une contribution
calculée au total global ; il n'existe aucun solde XP indépendant par
progression.

Les catégories ont le sens suivant :

- `XP_PROGRESSION` : progression infinie, badge évolutif et XP uniquement selon
  les paliers de sa politique ;
- `XP_MILESTONE` : jalon one-shot avec montant XP fixe, attribué une seule fois ;
- `BADGE_ONLY` : jalon ou badge one-shot sans XP ;
- `NON_GAMIFIED` : signal métier explicitement exclu de toute récompense.

Les anciens `classification = impact_badge`, `form_*` et
`sensitive_zone_*` restent des identités de journal pour la compatibilité des
données déjà écrites. Ils ne sont pas une cinquième catégorie CURRENT et ne
créent aucune décision implicite pour de nouveaux signaux.

Le total XP global est la somme des événements actifs des huit progressions et
des jalons `XP_MILESTONE` autorisés par le registre. Aucun event type ne crée
un second ledger ou une balance par famille.

## Données disponibles mais volontairement non gamifiées

Les entrées `NON_GAMIFIED` du registre sont des décisions produit CURRENT. Elles
ne sont pas des propositions ouvertes et ne doivent pas être transformées en
backlog implicite. Elles protègent la qualité des preuves, l'absence de farming
et la séparation entre activité métier, confiance et économie XP.

| Signal métier | Décision CURRENT | Raison |
| --- | --- | --- |
| `wasteKg` comme conversion directe en XP | `NON_GAMIFIED` | saleté initiale non contrôlée, biais territorial, sur-déclaration et confusion entre impact et mérite individuel direct |
| `cigaretteButts` / mégots comme conversion directe en XP | `NON_GAMIFIED` | même justification : mesure déclarative, biais et incitation à sur-déclarer |
| Kg/mégots comme progression CURRENT | `NON_GAMIFIED` | les métriques d'impact restent descriptives et traçables |
| `childrenCount`, `adultCount`, `retiredCount` et répartition démographique | `NON_GAMIFIED` | mesure d'impact social uniquement ; aucune récompense ou badge direct depuis ces catégories |
| `estimatedDifficulty` et `accessibility` | `NON_GAMIFIED` | une action facile ou accessible n'a pas moins de valeur civique ; ces données peuvent seulement informer ou recommander |
| `safetyInstructions`, `recommendedMaterials`, `logisticsNotes`, `checklistBeforeDeparture` | `NON_GAMIFIED` | le texte libre est manipulable et sert la préparation, pas une récompense |
| Activation `groupJoinEnabled` | `NON_GAMIFIED` | l'ouverture aux inscriptions ne vaut pas mobilisation accomplie |
| Clic sur rejoindre, inscription future, acceptation future, annulation ou file | `NON_GAMIFIED` | l'intention future ne vaut pas présence terrain confirmée |
| Génération d'un lien de parrainage | `NON_GAMIFIED` | seul la contribution utile confirmée de l'invité est un jalon rémunéré |
| Montant d'un don | `NON_GAMIFIED` | aucune XP, aucun badge de mérite et aucune influence sur un futur tirage |
| Rôle utilisateur | `NON_GAMIFIED` | l'AuthZ est un garde-fou, pas une récompense |
| Niveau de confiance | `NON_GAMIFIED` | pas d'XP ni de badge farmable ; la confiance reste une propriété dérivée de fiabilité, sécurité et AuthZ |
| Score qualité comme progression infinie | `NON_GAMIFIED` | la qualité peut conditionner un niveau ou déclencher `Donnée exemplaire`, mais ne constitue pas une monnaie |
| Remplissage de formulaire pour lui-même | `NON_GAMIFIED` | Forms reste une preuve de workflow, jamais une activité gamifiée |
| Upload de `photos` | `NON_GAMIFIED` | une photo peut servir de preuve métier à une autre règle sans devenir une mécanique autonome |
| `visionEstimate` | `NON_GAMIFIED` | estimation auxiliaire produite par l'IA, pas un accomplissement récompensé |
| `placeType` | `NON_GAMIFIED` | peut alimenter Exploration ou la diversité descriptive, sans coefficient de mérite |
| Difficulté, durée ou distance comme multiplicateur XP | `NON_GAMIFIED` | une action facile ou accessible n'a pas moins de valeur civique |
| Texte libre des formalités | `NON_GAMIFIED` | seul le milestone déterministe `Formalités préparées` peut reconnaître le workflow |

Cette section ne signifie pas que les faits correspondants sont inutiles : ils
peuvent rester nécessaires à une validation, à l'AuthZ, à un rapport ou à une
explication. Ils ne créent simplement aucun événement XP ou badge CURRENT par
eux-mêmes. Un futur contrat structuré pourrait rouvrir une décision, mais
`CURRENT = NON_GAMIFIED` tant qu'un changement explicite du registre n'a pas
été validé.

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
- sont explicitement `NON_GAMIFIED`: affichage d’une action, clic sur rejoindre,
  inscription `pending` ou `confirmed`, annulation, ajout à une file et
  acceptation préalable;
- une demande de claim post-action `pending` ou `cancelled` est exclue; un claim
  `confirmed` contribue comme toute autre participation finale confirmée;
- base `Observateur` à `0`;
- paliers actuels: `0, 1, 3, 5, 10, 15, 20, 25, 30`;
- XP de palier: `+1` à partir du premier palier utile, jamais sur le niveau `0`.
- seuls les participants finaux `confirmed` comptent; une inscription future,
  une présence communautaire ou un signalement en attente ne créditent pas
  cette progression.

### Modération

But : mesurer les dossiers uniques réellement résolus par un compte autorisé
à effectuer les opérations de modération concernées.

Règles :

- la visibilité est accordée uniquement lorsque le contrat AuthZ courant
  `canViewActionModerationAudit` autorise le rôle actif (`admin` ou `max`) et
  que le compte consulte son propre profil; un libellé d'interface ne donne
  aucun droit;
- la source canonique est `admin_operations_audit`, filtrée sur
  `operation_type = moderation`, `outcome = success` et l'acteur concerné;
  aucun log texte n'est interprété;
- l'identité stable d'un dossier est `action:<target_id>`,
  `participation:<action_id>:<participant_id>` ou
  `clean_place:<source_table>:<target_id>`;
- sont éligibles une décision finale `pending -> approved/rejected` sur une
  action, une décision finale sur une participation ou un `post_action_claim`,
  une validation Clean Place `new -> validated/cleaned`, et une correction
  d'impact réussie avec un motif valide;
- sont exclus les lectures, exports, dry-runs, erreurs, toggles de visibilité,
  corrections automatiques, allers-retours de statut, répétitions d'un même
  dossier, opérations sans décision et opérations sur ses propres données
  lorsqu'elles ne constituent pas une modération réelle;
- le dossier résolu (`moderation_case_resolved`) vaut `0 XP`; seuls les
  événements de palier `moderation_tier_unlock` attribuent `+1 XP` selon
  l'échelle gemme commune, sans balance XP indépendante;
- les one-shots `Première modération`, `Première validation de participation`
  et `Première correction d’impact justifiée` sont `BADGE_ONLY` (`0 XP`);
  `Modérateur polyvalent` est attribué lorsque les trois familles action,
  participation et clean place sont représentées et vaut `+1 XP` une fois;
- la projection est reconstruite depuis l'audit métier : une évolution de
  règle peut donc recalculer la progression et ses récompenses. Le choix
  « première anomalie corrigée » est explicitement **NON-CHOISI**, car aucun
  fait stable ne distingue encore une anomalie d'une simple édition.

### Forms (compatibilité hors taxonomie CURRENT)

But:

- fournir la preuve et la condition de validation d'une action organisée.

Règles:

- action rattachée à un formulaire validé par l admin;
- exclusion des brouillons, suppressions, tests et formulaires incomplets;
- exclusion des actions de type `zone_propre`;
- dédoublonnage par paire `(action_id, group_id)`;
- les formulaires restent lisibles pour l'historique, mais leur complétude ne
  constitue plus à elle seule un fait CURRENT de progression ou de milestone;
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

Les jalons d’action utilisent des événements one-shot stables dans
`progression_events`, avec la preuve de l’action qualifiante dans leurs
métadonnées. Un rebuild ne recalcule pas un fait historique déjà enregistré à
partir d’une fraîcheur courante plus faible.

#### Boucle bouclée

- one-shot;
- `+1 XP`;
- organisateur canonique;
- préparation explicite démontrée (`preparationState` hors brouillon),
  post-action finalisée et validation CURRENT (`approved` +
  `post_action_complete`);
- une action complète créée directement sans ce parcours démontré ne suffit
  pas.

#### Participation retrouvée

- badge one-shot, `0 XP`;
- première ligne `action_participants` finalement confirmée avec
  `participation_source = post_action_claim`, après le workflow de permissions
  CURRENT;
- le claim `pending` ou rejeté/cancelled ne qualifie pas ce badge;
- la ligne confirmée compte déjà une fois dans la progression infinie
  `Participation`; ce badge ne crée donc aucun XP additionnel et reste
  idempotent lors d’un replay.

#### Mobilisateur

- one-shot;
- `+1 XP`;
- action organisée et réellement publiée aux inscriptions de groupe;
- au moins une autre personne dans `action_participants` avec
  `participation_status = confirmed`;
- `groupJoinEnabled` seul, une demande ou une acceptation avant le terrain ne
  suffisent pas.

#### Donnée exemplaire

- one-shot;
- `+1 XP`;
- première action validée avec un snapshot de grade qualité `A` au moment de
  la validation;
- la baisse ultérieure de `freshness` ne révoque pas le fait enregistré.

#### Parcours documenté

- badge one-shot, `0 XP`;
- géométrie exploitable avec provenance canonique vérifiable : GPX validé,
  route provider vérifiée ou équivalent CURRENT;
- aucune préférence arbitraire pour un seul mode de preuve.

#### Mesure traçable

- badge one-shot, `0 XP`;
- méthode et provenance de mesure conformes au contrat déchets CURRENT,
  notamment `wasteMeasurementMethod`, les mesures de mégots et la ventilation
  canonique;
- `wasteKg` seul ne suffit pas.

#### Tri documenté

- badge one-shot, `0 XP`;
- au moins deux flux numériques réels dans la ventilation canonique;
- les catégories vides, fictives ou simplement affichées ne qualifient pas le
  jalon.

#### Formalités préparées

- badge one-shot, `0 XP`;
- toutes les formalités `required` de la qualification applicable sont
  actives, valides pour la qualification et au statut final `sent` du
  workflow;
- ce badge décrit une préparation de dossier et ne constitue jamais une
  certification juridique de conformité.

#### Trace fondatrice

- badge compagnon, `0 XP`;
- réutilise la preuve de `Boucle bouclée` lorsqu’elle existe;
- il ne crée aucun XP supplémentaire pour le même fait.

#### Première trace utile

- identité historique conservée pour les événements déjà enregistrés;
- aucun nouveau crédit ne doit être reconstruit depuis la seule complétude d'un
  formulaire.

### Organisation

But:

- récompenser la création et l organisation d actions de dépollution réelles;
- ne jamais récompenser le simple remplissage du formulaire.

Règles:

- le compte connecté n est pas compté comme organisateur principal sauf pour `Action spontanée`;
- hors `Action spontanée`, les organisateurs doivent être renseignés explicitement;
- pour `Action spontanée`, le formulaire cache les organisateurs et le compte connecté devient l organisateur de référence;
- tant que l action n est pas validée selon le contrat CURRENT, aucun XP n est attribué;
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

- elle ne constitue pas une progression infinie CURRENT supplémentaire et ne crée pas
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

- la création et le partage du lien sont `NON_GAMIFIED` et donnent `0 XP`;
- l inscription via le lien est `NON_GAMIFIED` et donne `0 XP`;
- la première contribution utile confirmée de l invité donne `+2 XP` à l invitant;
- cette attribution est one-shot par filiation persistée et reste idempotente;
- le lien d invitation et la chaîne de parrainage doivent persister;
- une auto-filiation est refusée;
- le badge doit rester non compétitif.

## Badges hérités

### Mohs — badge d'impact historique secondaire

Mohs est une surface d'impact personnelle historique, distincte des huit axes
comportementaux CURRENT. Elle conserve les noms minéraux et son échelle propre,
mais ne devient pas une échelle gemme ni une nouvelle progression CURRENT.
Les seuils déjà enregistrés restent lisibles pour compatibilité ; les signaux
kg/mégots sont `NON_GAMIFIED` lorsqu'ils sont considérés comme une progression
ou une conversion directe en XP.

Les faits sont recalculés depuis les attributions personnelles du contrat
participant : une ligne `action_participants` confirmée vaut une unité, les
mesures individuelles priment et le reliquat est partagé entre les comptes
confirmés sans mesure. Les enfants, les compteurs du formulaire,
`volunteersCount`, `participantsCount` et `effectiveVolunteerUnits` ne sont
jamais le dénominateur.

- Déchets : Mohs utilise `equivalentSecKg` avec la version
  `impact-terrain-2026-waste-moisture-v1` lorsqu'une condition est connue.
  Une quote-part sans condition reste explicitement une quote-part de masse
  collective brute ; une ancienne mesure dont l'humidité est inconnue n'est
  jamais reclassée silencieusement.
- Mégots : le comptage individuel prime ; à défaut, le nombre dérivé par le
  moteur masse/condition `impact-terrain-2026-butts-mass-v1` est utilisé.
- Talc est le niveau initial à `0 XP`. Chaque grade suivant franchi attribue
  `+0,25 XP`, jamais une quantité proportionnelle aux kg ou aux mégots.
- Les pas sont `20 kg` pour les déchets et `2 000 mégots` jusqu'à Diamant :
  chaque famille est plafonnée à `2,25 XP`.
- Les événements historiques réutilisent `infinite_waste_milestone` et
  `infinite_butts_milestone`, avec `classification = impact_badge` et une
  identité stable `mohs:<famille>:grade:<grade>`. Cette classification est une
  compatibilité de journal, pas une cinquième catégorie du registre CURRENT.
- La réconciliation retire les seuils devenus inéligibles après correction et
  recalcule `progression_profiles`. Elle n'écrit jamais `points_ledger` et ne
  supprime pas les compteurs historiques legacy.

L'interface affiche le grade courant, le prochain grade, la barre, la quantité
restante et l'XP du prochain palier. Pour les déchets, elle distingue la masse
brute de l'équivalent sec utilisé par Mohs.

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
