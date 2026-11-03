# Spécification canonique de la gamification

> **Statut documentaire : `CURRENT`.**

Ce document est la référence unique à lire en premier pour comprendre la gamification CleanMyMap.

## Leaderboard CURRENT et projection publique

Le contrat CURRENT de classement utilise exclusivement les métriques
`level`, `xp` et `badges`. Pour un utilisateur, elles correspondent à
`currentLevel`, `xpValidated` et `badgeTotal`. Le classement structurel suit
le même contrat public : `collectiveLevel` est dérivé de `structureXpValidated`
avec la courbe XP canonique, sans prérequis individuels et sans ledger XP
structurel parallèle.

`badges` vaut toujours `gradeCount + oneShotCount`. Les grades acquis sont
dédoublonnés par identifiant canonique et le seuil 0 (`Observateur`) n'est pas
acquis. Les jalons CURRENT atteints comptent une fois, même avec 0 XP. Pour
les structures, seules les preuves rattachées sans ambiguïté à un
`organizer_id` canonique sont admissibles. La famille `organisation` est la
seule famille structurelle démontrée ; les familles participation,
exploration, zones propres, régularité, polyvalence, apprentissage,
modération et les reconnaissances historiques restent exclues de ce scope.

L'identité structurelle vient de `actions.organizer_type`,
`actions.organizer_id` et `actions.organizer_name`. Une action spontanée, une
ligne sans `organizer_id` ou une ancienne note sans identifiant ne crée ni ne
fusionne une structure. Les événements XP structurels sont les événements
`progression_events` validés dont `source_table = actions` et dont le
`source_id` pointe vers une action canonique structurée ; chaque événement
est compté une seule fois.

L'ordre est déterministe : `level` trie par niveau, XP validée, badges puis
label public ; `xp` par XP validée, niveau, badges puis label ; `badges` par
total, grades, one-shot, XP validée, niveau puis label. Le rang est recalculé
après le tri choisi.

La route publique dédiée est
`GET /api/gamification/leaderboard/public?scope=user|structure&metric=level|xp|badges`.
Elle ne demande pas de session Clerk mais renvoie uniquement une projection
sanitizée `publicLabel`, `level`, `xpValidated`, `badgeTotal`, `gradeCount`,
`oneShotCount` et `rank`. Le scope utilisateur exige
`profiles.leaderboard_public_opt_in = true` et un label déterminé par
`display_name_mode`; aucun identifiant Clerk, email, metadata, donnée de
modération ou détail de badge n'est public. Le leaderboard est la seule
exception publique Gamification nommée `PUBLIC_LEADERBOARD_EXCEPTION` ; il
n'est jamais une source AuthZ et ne change ni XP, ni badges, ni impact.

La route authentifiée historique
`GET /api/gamification/leaderboard?scope=individual|collective&metric=level|xp|badges`
réutilise les mêmes métriques et le même moteur de projection CURRENT. Le scope
`individual` lit les utilisateurs opt-in ; le scope `collective` délègue au
classement structurel. Cette route détaillée n'a pas de paramètre `period` :
les contrats lifetime et année en cours restent ceux de la reconnaissance
personnelle, séparée du leaderboard.

## Exception publique `TERRITORIAL_LEGENDS_EXCEPTION`

Les Légendes territoriales sont une exception publique distincte du leaderboard
XP. Elles n'ajoutent ni métrique XP, ni badge CURRENT, ni progression parallèle.
Le moteur serveur expose cinq niveaux COG : arrondissement municipal (Paris,
Lyon et Marseille uniquement), commune, département ou équivalent, région ou
équivalent et France entière. Les codes et les relations de parenté sont ceux
de la résolution territoriale officielle et du millésime COG courant ; un
territoire non résolu n'est pas deviné depuis un libellé ou une trace GPS.

Une contribution compétitive est le couple d'une action `approved`,
`post_action_complete`, explicitement publiée, visible et publique, et d'une
participation `confirmed`. L'action est résolue par le service territorial
existant sur son emplacement canonique ; un passage GPS ou une chaîne de
caractères ambiguë ne crée jamais une attribution. Sur une fenêtre glissante de
90 jours en `Europe/Paris`, une même action compte au plus une fois par
utilisateur et par niveau parent. Les actions non résolues ou devenues non
publiables sont exclues.

Le consentement territorial est séparé de
`profiles.leaderboard_public_opt_in`, privé par défaut et conservé dans
`territorial_legend_consents`. Son activation est soumise à la même barrière
d'âge facultative et, si nécessaire, à l'accord parental. La révocation exclut
immédiatement l'utilisateur de la compétition ; une nouvelle activation crée
une nouvelle borne `activated_at`, de sorte qu'aucune contribution antérieure
ne devient rétroactivement compétitive.

La lecture publique
`GET /api/gamification/territorial-leaderboard/public?level=...&territoryCode=...`
ne renvoie qu'un label public, le score, le nombre d'actions distinctes, le
rang et les informations d'égalité, avec pagination par curseur. La lecture
personnelle
`GET /api/gamification/territorial-leaderboard/me?level=...&territoryCode=...`
reste authentifiée, owner-scoped et ne renvoie pas les compétiteurs. Un titre
requiert au moins deux compétiteurs éligibles et un score maximal d'au moins
deux actions distinctes. Les égalités utilisent un rang de compétition
explicite (`1, 1, 3`) et leur taille est exposée.

Cette exception ne modifie pas les routes XP, les leaderboards `level|xp|badges`
ni les dix progressions infinies CURRENT.

### Récompenses territoriales `TERRITORIAL_LEGEND_REWARDS`

Les récompenses sont une extension de cette même exception et restent
`BADGE_ONLY` (`0 XP`). Le registre CURRENT contient exactement cinq familles
évolutives, une par niveau territorial : arrondissement, commune, département,
région et France. Une famille porte deux axes internes : la conquête, attribuée
une seule fois lors de la première attribution effective d’une Légende à
l’utilisateur et au niveau, puis la longévité avec les paliers 7, 30, 90, 180,
365 et 730 jours. Ces paliers ne deviennent pas trente badges indépendants.

Une détention n’avance que lorsqu’une réconciliation quotidienne confirme le
même détenteur, le même niveau et le même code territorial sur la date civile
suivante. Une interruption ferme la période à son dernier jour vérifié ; une
reprise ouvre une nouvelle période et ne complète jamais le trou. Les égalités
au rang 1 sont des détentions valides pour chaque utilisateur concerné, sans
créer de détenteur artificiel. Les changements de détenteur ferment les
périodes sortantes et ouvrent celles du ou des nouveaux gagnants.

`territorial_legend_hold_periods` conserve les périodes vérifiées et leur
empreinte de source. `territorial_legend_award_proofs` conserve les preuves
d’attribution, leur période, leur seuil et leur validité. Les identités de
preuve sont uniques par utilisateur, niveau, territoire, axe et seuil ; les
reprises, recalculs et écritures concurrentes sont donc idempotents. Une preuve
invalidée reste dans l’audit mais n’est plus rechargée comme fait CURRENT. Une
révocation du consentement exclut immédiatement la compétition et arrête la
période courante ; elle ne transforme pas une attribution historique déjà
prouvée en nouvelle attribution.

Une correction historique passe par `invalidate_territorial_legend_history` :
elle invalide une période et/ou ses preuves sous verrou service-only, conserve
les lignes et leurs empreintes pour l’audit, et ne reconstruit aucune journée
non prouvée. Les faits CURRENT ne rechargent ensuite que les preuves encore
actives.

Le RPC `reconcile_territorial_legend_snapshot` sérialise la journée par verrou
PostgreSQL et est appelé par la réconciliation événementielle ainsi que par le
job quotidien `territorial-legends`. Après le snapshot, les utilisateurs
concernés repassent dans la réconciliation CURRENT existante, qui écrit leurs
preuves dans `progression_events` avec `BADGE_ONLY`, sans XP, sans second ledger
et sans modification des dix progressions historiques.

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

## Niveau, statut d'engagement et badge

Ces trois notions sont volontairement distinctes et ne doivent pas être
interprétées comme trois noms pour la même progression :

| Notion | Contrat CURRENT | Source canonique | Ce qu'elle ne signifie pas |
| --- | --- | --- | --- |
| **Niveau** | progression générale numérique dérivée du ledger XP et des prérequis de contribution | `progression_events`, `progression/progression-rules.ts`, `progression/progression-formulas.ts` et `progression.summary` | ni une famille de badge, ni un rôle AuthZ |
| **Statut d'engagement** | reconnaissance qualitative ordonnée `Observateur → Contributeur → Référent → Mentor → Coordinateur` | `engagement-status.ts` | ni un badge spécialisé, ni une permission |
| **Badge** | progression spécialisée ou jalon dans une famille métier | `BADGE_DEFINITIONS` / `CURRENT_BADGE_DEFINITIONS` dans `badge-catalog.ts` | ni le niveau global, ni le statut qualitatif |

### Contrat CURRENT des règles de niveau

Le contrat CURRENT versionné `ProgressionRulesV2` est exposé par
`apps/web/src/lib/gamification/progression/progression-rules.ts` sous la version stable
`progression-rules-v2`. Le contrat historique `progression-rules-v1` reposait
sur `minValidatedActions` et n'est plus l'identité du runtime CURRENT. V2
conserve le calcul XP triangulaire et remplace le
garde-fou spécifique au créateur d'actions par des `verifiedContributions` :
des faits métier canoniques, validés et dédupliqués. Les familles CURRENT
vérifiables sont la participation confirmée, l'organisation validée, les Clean
Zones validées, l'apprentissage vérifié et la modération effectivement
résolue. Une même action organisée et participée ne compte qu'une seule fois
comme contribution principale ; ses métriques spécialisées ne sont pas
additionnées comme autant de contributions indépendantes.

La diversité reste une condition distincte et peut inclure les familles de
progression CURRENT démontrées, notamment exploration, régularité et
polyvalence, sans transformer leurs événements en contributions principales.
Les critères de qualité moyenne et de ratio de validation restent applicables
aux contributions d'organisation ; ils ne bloquent pas artificiellement un
participant, un apprenant ou un modérateur qui n'organise pas d'action.
`computePotentialLevel`, `computeCurrentLevel` et `assessLevelRequirements`
consomment cette même source.

L'évaluation d'un niveau expose l'XP actuelle et requise, les niveaux potentiel
et réel, le nombre de contributions vérifiées, les familles vérifiées et les
conditions satisfaites et manquantes sous forme d'identifiants et de valeurs.
Les libellés traduits restent dans les surfaces UI ; ils ne font pas partie du
calcul métier. Le niveau global mesure ainsi un engagement vérifié transversal,
et non le seul nombre d'actions créées. V2 conserve les seuils numériques et
les formules CURRENT ; le changement de version identifie une évolution de
sémantique du contrat d'audit et de projection, pas une nouvelle monnaie XP ni
un nouveau ledger.

Le catalogue de badges porte une identité stable, une famille, le statut
`CURRENT` ou `LEGACY`, l'échelle, la métrique, la source métier, la visibilité,
la règle de progression ou de jalon et la politique XP. Les surfaces peuvent
conserver leurs façades de rendu, mais elles doivent résoudre ces métadonnées
depuis ce catalogue. Une famille CURRENT ne doit donc pas changer d'identité
ou de grade selon qu'elle est lue par `/api/gamification/me`,
`/api/gamification/badges/list` ou le profil.

Les libellés historiques `Contributeur regulier`, `Contributeur confirme`,
`Pilier terrain` et `Referent impact` sont classés `LEGACY` : ils restent
lisibles dans les anciens payloads, mais ne sont plus une seconde définition
du statut d'engagement. `Mohs`, les badges Forms, les badges de zone sensible
et les reconnaissances d'action/qualité/collectif historiques sont également
secondaires ou `LEGACY` dans le catalogue ; ils ne créent aucune nouvelle
famille CURRENT.

### Inventaire des identités de badge

Le catalogue CURRENT est consommé par les builders de `badges/families.ts`,
les états terrain de `terrain-progressions.ts`, les cartes du profil
(`InfiniteBadgesPanel`) et les builders de la lecture `progression.summary` de
`/api/gamification/me`. Les grades sont ensuite calculés par leur
module métier, jamais redéfinis par une page.

| Famille canonique | Échelle | Métrique | Surfaces principales |
| --- | --- | --- | --- |
| `explorer` | exploration | `unique_places_visited` | badge list, profil, progression Exploration |
| `participant` | participant | `participation_count` | badge list, progression Participation |
| `organisation` | gem | `validated_organized_actions_count` | profil, progression Organisation |
| `clean-zones` | atmosphere | `eligible_clean_zones` | badge list, progression Zones propres |
| `regularity` | gem | `consecutive_active_months` | profil, progression Régularité |
| `versatility` | gem | `validated_context_cycles` | profil, progression Polyvalence / Équilibre des contextes |
| `learning` | learning | `validated_learning_events` | quiz, badge list, progression Apprentissage |
| `moderation` | gem | `resolvedModerationCases` | profil autorisé, progression Modération |

### Reconnaissances d’action scolaire

Le catalogue canonique contient aussi trois identités `action_collective`,
strictement attachées à une action : `school_first_mission`,
`school_documented_sorting` et `school_field_debrief`. Elles sont visibles dans
l’attestation de l’action et dans les projections autorisées de cette action,
jamais dans l’inventaire ou le solde XP d’un élève.

Une reconnaissance n’est active que si le cadre `school` est explicitement
confirmé par le créateur ou un organisateur canonique autorisé et que l’action
est `approved`, `post_action_complete`, publiée, visible et `public`. La
détection automatique de la composition, un quiz affiché, une photo ou une
action simplement commencée ne prouvent pas ce cadre. La composition utilisée
après finalisation est exclusivement celle du bilan canonique ; la prévision
de préparation ne la remplace jamais et une composition finale absente ou
incohérente reste inconnue. Les trois jalons sont descriptifs, idempotents,
réconciliables et valent `0 XP` : aucune récompense n’est calculée à partir du
nombre d’enfants, de la masse, des mégots, d’un rendement estimé ou d’un
classement. Une correction, un rejet, une annulation, une dépublication, un
masquage, une privatisation ou une reclassification hors scolaire désactive la
projection sans effacer l’audit ; la réconciliation vérifie la révision de
l’action dans une transaction PostgreSQL bornée pour éviter la réactivation
d’un état périmé.

Les jalons CURRENT ont chacun leur identité `milestone:<id>` dans le même
catalogue : `premiere_trace_utile`, `trace_fondatrice`, `boucle_bouclee`,
`mobilisateur`, `donnee_exemplaire`, `parcours_documente`,
`mesure_tracable`, `tri_documente`, `formalites_preparees`,
`participation_retrouvee`, `parrainage_utile`, `premiere_moderation`,
`premiere_validation_participation`, `premiere_correction_impact_justifiee`
et `moderateur_polyvalent`.

Les identités `forms`, `mohs`, `sensitive-zone`, ainsi que les groupes
`legacy-level-recognition`, `legacy-quality-recognition`,
`legacy-collective-recognition` et `legacy-action-badges`, restent
`LEGACY`/compatibilité. Les paliers quiz historiques par type et équilibrés
sont des alias de `learning`; ils ne forment pas deux familles concurrentes.
Les anciennes chaînes produites par `deriveBadges()` sont indexées comme
libellés LEGACY, tandis que le niveau et le statut d'engagement sont exposés
par leurs contrats propres.

### Inventaire utilisateur CURRENT

`progression.summary` dans `/api/gamification/me` est la représentation
utilisateur exhaustive des entrées gamifiées applicables. Elle réutilise les
définitions du registre CURRENT : aucune liste d'objectifs propre à l'UI ne doit
être créée. Les progressions infinies et les jalons one-shot exposent leur
catégorie canonique, leur politique XP, leur révision de règles et leur état.

Une progression infinie reste toujours `in_progress` après sa première
contribution ; `completed` ne décrit jamais l'ensemble d'une échelle infinie.
À zéro, `Observateur` est un repère non acquis et la progression est
`not_started`. Pour un jalon, `in_progress` n'est autorisé que si un progrès
intermédiaire calculable existe dans le domaine ; un jalon binaire reste
`not_started` jusqu'à sa preuve. Les entrées `NON_GAMIFIED` et les mécaniques
`authorized_moderation` non applicables sont absentes de cet inventaire.

Chaque mécanique CURRENT porte également `introducedInRulesRevision`. La
révision est un entier monotone distinct de `rulesVersion` ; aucune comparaison
lexicale de version n'est autorisée. `progression_profiles` conserve
`current_applied_rules_revision` et `last_acknowledged_rules_revision`.
La première est avancée uniquement par le flux de projection/réconciliation ;
l'acquittement UI ne modifie que la seconde et ne peut pas dépasser la
révision réellement appliquée.
`isNewSinceLastRulesMigration` vaut vrai uniquement pour une mécanique
applicable introduite dans la dernière révision appliquée et non encore
acquittée. Cette nouveauté est indépendante de l'état : elle peut être
`not_started`, `in_progress` ou `completed`.

Une réconciliation qui applique une nouvelle révision complète son reçu avec
`catalogChanges.newProgressionIds`, `catalogChanges.newMilestoneIds` et
`catalogChanges.retiredMechanicIds`. Le bouton « J'ai vu les nouveautés »
appelle `POST /api/gamification/me/acknowledge-rules-migration`. Cet
acquittement masque seulement le marquage NEW courant ; il conserve les
mécaniques, les faits et les reçus historiques.

### Reçu canonique de réconciliation

Une réconciliation CURRENT qui modifie l'état utilisateur produit un
`GamificationReconciliationReceipt`, contrat structuré défini par
`apps/web/src/lib/gamification/reconciliation/gamification-reconciliation-receipt.ts`. Le
reçu est calculé depuis le même plan déterministe que les mutations du ledger
et expose :

- `xp` et `level` avant/après, leur delta et la direction du niveau ;
- les progressions ajoutées, retirées ou modifiées ;
- les badges déverrouillés, retirés ou changés de grade ;
- les jalons déverrouillés ou retirés ;
- les compteurs d'événements ajoutés, modifiés et retirés ;
- `previousRulesVersion`, `currentRulesVersion`, `reasonCategory` et
  `hasUserVisibleChanges`.

Les éléments sont identifiés par les IDs canoniques des registres. Le reçu est
persisté dans `app_notifications` sous un payload versionné et appartient
exclusivement à son utilisateur ; les RLS interdisent la lecture d'un autre
compte et l'écriture client. `seen_at` et `acknowledged_at` sont nullable. Un
rebuild idempotent sans conséquence visible ne crée aucun reçu. Le front-end
consomme ce contrat et ne déduit jamais un delta depuis le seul total XP ni
depuis des logs texte.

### Recalcul scientifique des contributions personnelles

Les mesures individuelles sont des attributions du total de l'action : elles
ne sont jamais additionnées à `actions.cigarette_butts` une seconde fois et
elles ne créent aucune XP proportionnelle aux kg ou aux mégots. Une évolution
de conversion peut toutefois modifier les paliers Mohs qui dépendent d'une
valeur dérivée, si sa source originale est encore identifiable. Le moteur
relit alors les lots, la masse source et leur état avec la méthode courante,
sans modifier la mesure observée, la valeur historique ambiguë, sa provenance
ou son ancienne version.

La chaîne d'application est ordonnée :

1. relecture des participations confirmées et des actions admissibles ;
2. recalcul des valeurs dérivées éligibles et des attributions individuelles ;
3. convergence atomique des paliers Mohs par identité logique stable ;
4. rafraîchissement idempotent du profil, des badges et des niveaux concernés.

Les suppressions, les actions rejetées, les dépassements du total collectif,
les valeurs `NULL`, les zéros explicites et les historiques sans provenance
recalculable restent explicitement distingués. Les événements LEGACY et les
reçus historiques sont conservés. Une exécution concurrente ou interrompue
retourne un conflit rejouable ; un dry-run expose les différences, la méthode,
l'empreinte des sources et la trace du reçu sans écrire dans les sources
métier. Le recalcul scientifique ne change pas les événements de validation
d'action lorsque seul un facteur environnemental évolue.

L'historique secondaire affiche au plus les 50 reçus les plus récents ; cette
fenêtre de présentation ne détermine ni le pending ni ses compteurs. Les
reçus acquittés restent dans l'historique, tandis que le pending sélectionne
uniquement les reçus avec `acknowledged_at IS NULL`. Un deep-link utilise
`/sections/gamification?receipt=<UUID opaque de notification>` : l'UUID de la
notification est borné, ne contient pas le `reconciliationId` composite et le
serveur résout le reçu avec `user_id`, le type de notification et la
validation de `receipt.userId`. Une cible conservée peut donc être ouverte
hors des 50 lignes ; une cible malformée, inexistante ou étrangère est
ignorée. `seen_at` désigne la première consultation de la notification,
depuis la cloche ou le tableau de bord, et non une visite implicite de la page.

## Index des modules

- [Taxonomie et spécialisations](./gamification-taxonomie.md)
- [Hiérarchie des sources et échelles](./gamification-echelles.md)
- [Familles de badges](./gamification-badges.md)
- [XP, réconciliation et collection SPOGOMI](./gamification-xp-spogomi.md)

Ces sous-documents constituent la même spécification canonique. Aucune autre fiche route-first n'est touchée.
