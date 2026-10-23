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
| **Niveau** | progression générale numérique dérivée du ledger XP et des prérequis de contribution | `progression_events`, `progression-rules.ts`, `progression-formulas.ts` et `progression.summary` | ni une famille de badge, ni un rôle AuthZ |
| **Statut d'engagement** | reconnaissance qualitative ordonnée `Observateur → Contributeur → Référent → Mentor → Coordinateur` | `engagement-status.ts` | ni un badge spécialisé, ni une permission |
| **Badge** | progression spécialisée ou jalon dans une famille métier | `BADGE_DEFINITIONS` / `CURRENT_BADGE_DEFINITIONS` dans `badge-catalog.ts` | ni le niveau global, ni le statut qualitatif |

### Contrat CURRENT des règles de niveau

Le contrat CURRENT versionné `ProgressionRulesV2` est exposé par
`apps/web/src/lib/gamification/progression-rules.ts` sous la version stable
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
`apps/web/src/lib/gamification/gamification-reconciliation-receipt.ts`. Le
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
