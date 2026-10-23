# Taxonomie et spécialisations

> Module associé à [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md). Statut : CURRENT.

## Taxonomie CURRENT et registre des décisions

`GAMIFICATION_REGISTRY` dans
`apps/web/src/lib/gamification/progression-utils.ts` est le registre canonique
unique des mécaniques et signaux métier ; `BADGE_DEFINITIONS` dans
`apps/web/src/lib/gamification/badge-catalog.ts` est le catalogue canonique
des identités de badges. Ces deux registres ont des responsabilités distinctes
et remplacent les anciennes matrices de surface ; il n'existe pas de matrice
produit parallèle à compléter plus tard. Chaque entrée de mécanique porte :

- un `id` stable ;
- une `category` exactement égale à `XP_PROGRESSION`, `XP_MILESTONE`,
  `BADGE_ONLY` ou `NON_GAMIFIED` ;
- un `progressionId` éventuel ;
- une `xpPolicy` explicite ;
- la source métier ;
- le badge ou jalon associé, le cas échéant ;
- la visibilité ;
- la `rulesVersion` applicable ;
- `introducedInRulesRevision`, une révision numérique monotone.

Une donnée disponible mais volontairement exclue est donc enregistrée comme
`NON_GAMIFIED`, avec sa raison CURRENT. Elle ne constitue ni une proposition,
ni un TODO, ni un signal « à traiter plus tard ».

Les dix progressions infinies sont :

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
| `cartography` | Contribution cartographique | `verified_geometry_contributions` | `action_geometry_contributions.accepted`, distinct par `action_id` et utilisateur | `cartography` / `cartography` |
| `product_feedback` | Amélioration du produit | `accepted_product_feedbacks` | `community_bug_reports.qualification_status=accepted`, distinct par `id` et propriétaire | `product-feedback` / `gem` |

Chaque progression suit le contrat commun `GamificationProgressionState` :
`id`, `label`, `description`, `metric`, `sourceDomain`, `badgeFamily`,
`scale`, `infinite`, `currentValue`, `currentBadge`, `nextBadge`,
`progressPercent` et `xpContribution`. `xpContribution` est une contribution
calculée au total global ; il n'existe aucun solde XP indépendant par
progression.

La projection utilisateur de `GET /api/gamification/me` expose pour chaque
entrée de `progression.summary` les champs explicites `awardCategory`,
`grantsXp` et `xpContribution`. `awardCategory` porte la catégorie canonique
de la récompense (`XP_PROGRESSION`, `XP_MILESTONE` ou `BADGE_ONLY`) ; les
composants ne doivent jamais la déduire d'une valeur XP positive ou nulle.
Les signaux `NON_GAMIFIED` restent dans le registre de décision mais ne sont
pas projetés dans le catalogue personnel.

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

Le total XP global est la somme des événements actifs des dix progressions et
des jalons `XP_MILESTONE` autorisés par le registre. Aucun event type ne crée
un second ledger ou une balance par famille.

### Sous-progressions de spécialisations terrain

Les responsabilités terrain validées après l'action sont sept
sous-progressions, et non sept progressions globales supplémentaires :

| Identifiant stable | Libellé | Famille parente | Rôle métier | XP par palier |
| --- | --- | --- | --- | ---: |
| `organizer_primary` | Organisateur référent | `organisation` | `organizer_primary` | 1 |
| `coorganizer` | Coorganisateur | `organisation` | `coorganizer` | 0,75 |
| `group_lead` | Responsable de groupe | `participation` | `group_lead` | 0,5 |
| `cigarette_butts` | Responsable mégots | `participation` | `cigarette_bag_lead` | 0,4 |
| `recyclables` | Responsable recyclables | `participation` | `recyclable_bag_lead` | 0,25 |
| `household_waste` | Responsable ordures ménagères | `participation` | `household_waste_bag_lead` | 0,25 |
| `glass` | Responsable verre | `participation` | `glass_bag_lead` | 0,25 |

La politique versionnée `terrain-specializations-2026.10-v1` compte les
actions distinctes dont l'utilisateur possède une attestation `confirmed`, une
participation finale `action_participants.confirmed` et une action
`approved`, publiée, visible et `post_action_complete`. Le rôle prévu,
l'inscription, l'invitation, une présence non confirmée, une action
inéligible, un changement de quantité de déchets ou une attribution faite par
la seule sélection du rôle ne sont jamais des faits XP. Pour
`organizer_primary` et `coorganizer`, l'attestation conserve l'instantané de la
provenance `action_organizers` observée au moment de la décision ; une
modification ultérieure ne réécrit pas l'histoire.

Les seuils sont `1`, `3`, `5`, `10`, `20`, puis un seuil tous les dix
accomplissements supplémentaires, sans borne supérieure. Chaque couple
`(utilisateur, action, rôle)` est dédoublonné. Les franchissements de
spécialisations distinctes sur une même action conservent leurs badges et
leurs preuves, mais un seul bonus spécialisé est crédité, égal au montant le
plus élevé. Le bonus d'organisation de base, historiquement égal à `1 XP` par
action validée réparti entre organisateurs reconnus, reste indépendant et
inchangé.

Les événements `terrain_specialization_tier_unlock` sont reconstruits depuis
ces preuves et écrits uniquement dans `progression_events`. Leur identité
stable contient la spécialisation, la version, le palier et l'action ; une
correction ou un retrait d'attestation fait donc l'objet d'une mise à jour ou
d'une rétraction par la réconciliation, sans cumul lors d'une reconstruction.
Les badges affichent le palier, le compteur d'actions vérifiées, le prochain
seuil et l'effort restant indéfiniment. Ils ne constituent ni une certification
professionnelle, ni une habilitation réglementaire, ni une permission AuthZ.

La progression `cartography` reconnaît une contribution terrain acceptée sur
une action distincte. Plusieurs GPX ou missions du même utilisateur sur la
même action valent une seule contribution ; GPX puis mobile restent une seule
contribution ; les doublons, retries et reconstructions ne créent aucun nouvel
événement. La preuve est l'existence idempotente dans
`action_geometry_contributions`, puis la réconciliation écrit l'événement
`verified_geometry_contribution` dans `progression_events`. Il n'y a ni XP par
fichier, ni XP par kilomètre, ni XP fondée sur une simple distance cumulée.

### Amélioration du produit

La progression `product_feedback` mesure les retours Bug, Idée et Amélioration
dont la qualification persistée est `accepted` par le workflow produit autorisé.
Les collaborations restent dans le contrat métier du formulaire mais ne sont
pas comptées dans cette progression. La source est filtrée par le propriétaire
du feedback ; un compte de revue ne reçoit donc aucun crédit pour les retours
d'autres utilisateurs.

Chaque identifiant `community_bug_reports.id` est compté une seule fois. Les
états `pending`, `needs_info`, `duplicate` et `rejected`, un formulaire
simplement rempli et une ligne supprimée sont exclus. L'archivage d'un retour
déjà accepté ne retire pas sa preuve tant que la ligne métier existe.

Les paliers sont `1`, `5`, `10`, puis tous les cinq retours. Chaque palier
attribue `+1 XP` dans le ledger `progression_events`; un retour accepté ne
promet pas un XP individuel. La réconciliation reconstruite trie les preuves
par date de décision, date de création et identifiant, puis utilise le retour
franchissant le palier comme source stable de l'événement. Une révocation,
une suppression ou une correction de qualification est donc répercutée par le
rebuild idempotent sans second ledger.

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
