# Moteur de gamification

Ce document est le point d'entrée technique de la gamification CleanMyMap.
Il ne duplique pas les seuils, badges ni règles métier détaillées.

## Sources de vérité

Ordre de confiance :

1. runtime :
   - `apps/web/src/app/api/gamification/`
   - `apps/web/src/lib/gamification/`
   - `apps/web/src/components/gamification/`
2. spécification fonctionnelle canonique :
   - `documentation/pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md`
3. direction produit :
   - `documentation/product/gamification-non-competitive.md`
   - `documentation/product/gamification-inventory.md`
4. sécurité et autorisations :
   - `documentation/security/authz-authn-regles.md`

Le code et les tests priment si une divergence apparaît.

## Frontières techniques

- `progression_events` est l'unique journal CURRENT de progression XP et
  `progression_profiles` sa projection persistante. L'XP est une unité de
  progression non dépensable : aucune fonctionnalité CURRENT ne doit lire ou
  écrire un sol de points pour attribuer, afficher ou consommer la progression.
- `progression_events` journalise les événements de progression avec une identité logique stable `(user_id, event_type, source_table, source_id, status_phase)` et une écriture idempotente. `occurred_on` décrit la date métier ; il ne déduplique pas à lui seul des sources distinctes.
- Le contrat versionné `GAMIFICATION_RULES_V1` est la projection des règles
  CURRENT. `computeExpectedGamificationState` calcule sans mutation les
  événements, jalons, badges et compteurs attendus à partir des faits métier ;
  `reconcileUserGamification` compare ensuite cet état au ledger et INSERT,
  UPDATE ou retire uniquement les événements CURRENT qu'il possède.
- Les événements produits par la reconstruction portent dans `metadata` leur
  `rulesVersion`, `mechanicId`, `progressionId` ou `milestoneId`, source,
  `awardKind`, palier éventuel et `logicalId`. L'identité logique ne dépend pas
  de la version de règles afin qu'un changement de montant fasse un UPDATE et
  non un cumul XP.
- Une évolution `XP_MILESTONE → BADGE_ONLY` conserve la preuve attendue en
  ramenant l'XP dérivée à zéro ; `BADGE_ONLY → NON_GAMIFIED` retire la
  projection CURRENT. Les lignes LEGACY et les faits métier ne sont jamais
  effacés indistinctement.
- `points_ledger` et `user_points` sont conservées uniquement comme surfaces
  COMPATIBILITY/LEGACY pour les données et routes historiques. Elles ne sont
  plus une source de vérité ni une dépendance des flux CURRENT.
- La route historique `/api/gamification/analytics/points` et son loader,
  ainsi que le script `apps/web/scripts/backfill-action-gamification.mjs`,
  restent les derniers consommateurs explicites de ces tables. Aucun écran
  CURRENT ne les appelle ; leur retrait relève d'une décision de compatibilité
  séparée et le script reste un outil de réparation historique.
- les sources métier restent propriétaires de leurs données ; le journal XP ne remplace jamais la source métier.
- la métrique `Zone sensible apaisée` reste hors des huit progressions infinies :
  sa qualification est figée à la validation dans `progression_events`, puis
  ses seuils gemme canoniques `1, 3, 5, 8, 10, 15, 20, puis +5` sont projetés
  par des événements idempotents `sensitive_zone_milestone` à `+1 XP` ; l'état
  courant d'une zone ne révoque jamais la preuve historique. Cette mécanique
  ne crée ni progression infinie ni solde XP indépendant.
- les GET, loaders de page et lectures de profil sont read-only ; les
  attributions de progression sont déclenchées par une mutation métier ou par
  le rebuild serveur explicite `rebuildUserGamificationBadges`.
- le rebuild/backfill est idempotent et ne doit jamais être appelé par une
  lecture publique ou un rendu de page.
- les écritures d'audit et notifications sont des effets secondaires et ne doivent pas devenir la preuve métier.
- Le registre CURRENT `GAMIFICATION_REGISTRY` de
  `apps/web/src/lib/gamification/progression-utils.ts` est l'unique catalogue
  de décision des mécaniques métier. Chaque entrée porte un `id`, une
  `category` parmi `XP_PROGRESSION`, `XP_MILESTONE`, `BADGE_ONLY` et
  `NON_GAMIFIED`, un `progressionId` éventuel, une `xpPolicy`, une source
  métier, un badge/jalon éventuel, une `visibility`, une `rulesVersion` et une
  `introducedInRulesRevision`.
  Une donnée disponible mais non récompensée est donc une décision
  `NON_GAMIFIED` explicite, jamais un backlog implicite.
- Les huit progressions infinies sont `participation`, `organisation`,
  `exploration`, `clean_zones`, `regularity`, `versatility`, `learning` et
  `moderation` (cette dernière étant limitée aux comptes autorisés par AuthZ).
- Les jalons CURRENT avec XP sont `Première trace utile`, `Parrainage utile`,
  `Boucle bouclée`, `Mobilisateur`, `Donnée exemplaire` et `Modérateur
  polyvalent`. Les autres jalons CURRENT sont `BADGE_ONLY`.
- Les événements historiques `impact_badge`, `form_*` et
  `sensitive_zone_*` restent des compatibilités de journal lorsqu'ils existent
  déjà ; ils ne constituent pas une nouvelle catégorie CURRENT ni une promesse
  implicite d'évolution.
- La section canonique `Données disponibles mais volontairement non gamifiées`
  de la spécification détaille les exclusions de poids, mégots, démographie,
  textes libres, inscriptions, preuves auxiliaires, difficulté, qualité,
  confiance et dons. Une réouverture exige une modification explicite du
  registre et de sa `rulesVersion`.
- Chaque progression expose le contrat typé commun
  `GamificationProgressionState` : valeur courante, badge courant, prochain
  badge, pourcentage et contribution au total XP. Cette contribution n'est pas
  un solde séparé.
- `/api/gamification/me` expose `progression.summary`, la lecture
  utilisateur canonique consommée par les surfaces Gamification et profil.
  Elle est construite depuis le registre CURRENT et distingue les huit
  progressions infinies des jalons one-shot `XP_MILESTONE` ou `BADGE_ONLY` ;
  les entrées `NON_GAMIFIED` en sont exclues. `summary.xpTotal` est la somme
  du ledger `progression_events`, et chaque progression/jalon porte sa
  `awardCategory`, son booléen `grantsXp` et sa contribution `xpContribution`
  dérivée des mêmes événements. La réconciliation distingue
  explicitement l'XP de compatibilité historique non rattachée à une mécanique
  CURRENT ; aucun composant ne recalcule un niveau, un badge ou un prochain
  palier.
- La page Gamification sépare visuellement les progressions XP, les jalons avec
  XP et les jalons de reconnaissance `BADGE_ONLY`. Les métriques d'impact
  (poids, mégots, bénévoles, démographie et proxys calculés) restent des
  données d'impact et ne sont pas converties automatiquement en XP.
- La surface utilisateur `/api/gamification/me` et ses acquittements
  (`acknowledge-reconciliation` et `acknowledge-rules-migration`) passent par
  `requireAuthenticatedAccess()`. Le `userId` utilisé pour les lectures et
  mutations est exclusivement celui retourné par ce garde ; aucun client
  Supabase privilégié n'est créé avant la réussite de l'AuthN.
- Une progression infinie est `not_started` tant qu'aucune contribution
  éligible n'est démontrée, puis `in_progress` pour toujours. Son palier
  courant est le dernier palier atteint et son prochain palier est la cible en
  cours ; le palier initial `Observateur` à zéro ne constitue pas un début.
- Un jalon n'est `in_progress` que lorsqu'une progression intermédiaire réelle
  est fournie par sa source canonique. Les jalons binaires ne reçoivent pas de
  pourcentage artificiel. Les mécaniques `authorized_moderation` sont absentes
  de l'inventaire d'un utilisateur non habilité.
- `rulesRevision` est numérique et monotone ; les chaînes `rulesVersion` ne
  sont jamais comparées lexicalement. Le profil conserve la révision appliquée
  et la dernière révision acquittée. Une mécanique est `new` uniquement si
  elle a été introduite dans la dernière révision appliquée applicable au
  compte, indépendamment de son état (`not_started`, `in_progress` ou
  `completed`).
- Les quatre progressions terrain principales sont matérialisées par les
  métriques canoniques `participation`, `organisation`, `exploration` et
  `clean_zones`; elles partagent ce contrat sans partager leur compteur ni
  leur famille de badges.
- L'XP globale est calculée à partir de la somme des événements actifs des
  huit progressions, des événements one-shot et des récompenses historiques
  explicitement conservées en compatibilité, comme `sensitive_zone_milestone`. Aucun
  `progression_id` SQL supplémentaire n'est requis : la classification est
  dérivée de manière déterministe du registre des `event_type`.
- les lectures Clean Zones courantes utilisent `trash_spotter_spots`.
- les anciennes identités d'événement liées à `spots` peuvent être reconnues uniquement pour préserver l'historique et empêcher une réattribution d'XP ; la table legacy n'est pas une source courante de candidats.
- les formulaires restent une preuve de validation et une source de complétude;
  les événements Forms historiques (`form_tier_unlock`, `form_bonus`) sont
  `COMPATIBILITY` et ne sont plus écrits par le rebuild CURRENT;
- les métriques de qualité et de confiance restent des faits dérivés. Les
  seuils `impact_badge` Mohs déjà enregistrés restent lisibles pour
  compatibilité via les attributions personnelles confirmées ; les kg et
  mégots ne constituent pas une progression CURRENT et ne doivent jamais être
  convertis en XP proportionnel à la quantité;
- les règles détaillées de seuils, familles, scopes et attribution restent dans la spec canonique, pas dans ce document.

## Audit XP administratif

La surface courante est :

`/admin/gamification/xp-audit`

Elle appelle `checkAdminAccess()` avant toute lecture privilégiée et consulte
`xp_audit` / `xp_audit_daily` côté serveur.

Les règles générales AuthN/AuthZ ne sont pas redéfinies ici :
consulter `documentation/security/authz-authn-regles.md`.

## Réconciliation administrative des règles

Le changement rétroactif des règles se fait uniquement avec le script serveur
administratif canonique, jamais depuis une page ou une API publique :

```text
npm run gamification:reconcile -w apps/web -- --user <id> --dry-run
npm run gamification:reconcile -w apps/web -- --user <id> --apply
npm run gamification:reconcile -w apps/web -- --all --dry-run
npm run gamification:reconcile -w apps/web -- --all --apply --batch-size 50
```

`--dry-run` est sans écriture : il ne modifie ni Supabase, ni l'audit, ni le
checkpoint. Pour un utilisateur, il expose la version des règles avant/après,
l'XP avant/attendue/delta, les événements à ajouter/modifier/retirer, les
badges et jalons ajoutés/retirés, ainsi que le niveau avant/après. `--all`
retourne les mêmes éléments sous forme d'agrégats.

`--apply` est obligatoire pour muter. Chaque utilisateur est traité
idempotemment par le moteur CURRENT, une opération technique est inscrite dans
`admin_operations_audit`, puis le checkpoint est écrit sous
`apps/web/artifacts/validation/gamification-reconcile/` (chemin ignoré par
Git). Une interruption ou une erreur laisse le dernier utilisateur réussi ;
reprendre avec le même fichier :

```text
npm run gamification:reconcile -w apps/web -- --all --apply --resume <checkpoint.json>
```

Le checkpoint est refusé si sa `rulesVersion` ne correspond plus aux règles
chargées. Une reprise retente l'utilisateur interrompu et ne réécrit pas les
utilisateurs déjà clôturés. Aucun rebuild global de production n'est exécuté
par les validations locales.

Procédure canonique lors d'une évolution :

1. modifier la version et les règles CURRENT ;
2. ajouter ou adapter les tests de reconstruction/réconciliation ;
3. exécuter le `--dry-run` ciblé ou global ;
4. examiner les deltas XP, événements, badges, jalons et niveaux ;
5. lancer un `--apply` contrôlé par lots ;
6. vérifier le checkpoint final, l'audit et la réconciliation d'un échantillon.

Le script utilise la clé Supabase de service uniquement côté serveur/CLI. Les
faits métier, les lignes LEGACY et les tables de sources ne sont jamais
modifiés pour obtenir le résultat gamification.

## Reçu utilisateur de réconciliation

Toute réconciliation qui modifie réellement l'état CURRENT d'un utilisateur
produit un `GamificationReconciliationReceipt` structuré depuis le même plan
que les mutations du ledger. Il contient notamment `xp.before/after/delta`,
`level.before/after/direction`, les progressions ajoutées/retirées/modifiées,
les badges et jalons concernés, les compteurs d'événements, les versions de
règles et une `reasonCategory`. Les entrées utilisent les identifiants
canoniques du registre, jamais des libellés traduits comme identifiants.

Le reçu est conservé dans la boîte de réception existante
`public.app_notifications` avec `type = 'gamification_reconciliation'` et un
payload JSON versionné. Cette table fournit le propriétaire utilisateur,
l'historique et la lecture protégée par RLS ; la migration ajoute
`seen_at`/`acknowledged_at` et une clé d'idempotence par réconciliation. Elle
ne remplace pas `progression_events` et `admin_operations_audit` n'est jamais
utilisé comme boîte de réception.

La route `POST
/api/gamification/me/acknowledge-reconciliation` accepte uniquement un objet
strict contenant `notificationId` sous forme d'UUID. Les propriétés inconnues,
le JSON malformé et toute valeur qui n'est pas un UUID sont rejetés en `400`
avant l'accès privilégié. La mutation reste idempotente et est bornée par
`notificationId`, `user_id`, le type de notification et
`acknowledged_at IS NULL` ; elle ne révèle donc pas si un UUID appartient à un
autre compte.

Lors de la lecture, le payload est validé comme reçu de réconciliation,
non-acquitté et cohérent avec l'utilisateur demandé (`receipt.userId ===
userId`). Un payload malformé, d'un autre type, déjà acquitté ou portant un
propriétaire incohérent est ignoré et n'est jamais transmis à l'UI. Le filtre
SQL `app_notifications.user_id = userId` et les protections RLS restent
obligatoires.

Un rebuild dont `hasUserVisibleChanges` vaut `false` ne crée aucune
notification. Le front-end lit le reçu via le payload structuré et ne
reconstruit pas un delta à partir de deux états incomplets ou du seul total
XP. Les écritures sont serveur uniquement et le payload ne contient aucune
donnée administrative sensible.

Le reçu expose aussi `catalogChanges` avec les IDs canoniques des nouvelles
progressions, des nouveaux jalons et des mécaniques retirées. Une nouveauté
applicable sans XP ni badge est donc visible et peut être acquittée par
`POST /api/gamification/me/acknowledge-rules-migration`. L'acquittement met à
jour uniquement `last_acknowledged_rules_revision`, bornée à
`current_applied_rules_revision`, ainsi que les notifications concernées ; la
révision appliquée reste la propriété du flux de projection/réconciliation. Il
ne supprime ni mécanique, ni preuve métier, ni reçu historique. Une révision
ultérieure remplace la nouveauté de la vue principale, tandis que les reçus
antérieurs restent consultables.

La page `/sections/gamification` propose un historique secondaire, du plus
récent au plus ancien, limité aux 50 derniers reçus du compte courant. Chaque
ligne résume la date, la version CURRENT, le delta XP, le niveau avant/après et
les compteurs de changements ; le détail réutilise le dialogue existant. Un
reçu ciblé peut être ouvert avec `/sections/gamification?receipt=<id>` depuis
la notification ou l'historique. La lecture utilise `Cache-Control: private,
no-store` afin que l'état AFTER et le reçu restent cohérents après une
réconciliation.

La notification globale réutilise `public.app_notifications`. Elle est créée
uniquement pour une réconciliation avec changement visible, et son CTA ouvre
le reçu concerné sans acquitter automatiquement la réconciliation. Les reçus
restent des deltas structurés, sans snapshot exhaustif ; le cleanup explicite
de rétention supprime les reçus `gamification_reconciliation` de plus de 120
jours et conserve uniquement un manifeste de comptage.

## Évolution

Toute modification du moteur doit vérifier ensemble :

- code métier ;
- tests concernés ;
- spec canonique ;
- éventuelle doctrine produit ;
- sécurité si une permission ou une surface privilégiée change.

Ne pas introduire une seconde documentation des seuils ou des familles de badges.
