# Familles de badges

> Module associé à [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md). Statut : CURRENT et compatibilité.

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
- le compteur technique `eligibleFormsCount` du classement batch additionne
  les lignes de formulaires qui satisfont effectivement les critères
  d'éligibilité pour les actions rattachées à l'utilisateur : une action avec
  deux lignes éligibles contribue donc `2`, tandis que les brouillons,
  doublons, suppressions, tests et formulaires incomplets contribuent `0`;
- ce compteur batch n'est pas une parité avec la RPC
  `load_gamification_user_counters` : celle-ci compte des clés distinctes
  `(action_id, group_id)` et applique en plus les filtres `approved` et
  `zone_propre` de son contrat SQL;
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
- parcours de préparation effectivement publié (`published_at` présent), puis finalisation et validation CURRENT ; une ancienne valeur `preparationState` ne constitue jamais une preuve,
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

Mohs est une surface d'impact personnelle historique, distincte des neuf axes
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
