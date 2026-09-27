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
  métier, un badge/jalon éventuel, une `visibility` et une `rulesVersion`.
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
- `/api/gamification/me` expose aussi `progression.catalog`, représentation
  exhaustive des mécaniques CURRENT applicables. Elle est construite depuis le
  registre CURRENT et distingue les huit progressions infinies des jalons
  one-shot `XP_MILESTONE` ou `BADGE_ONLY` ; les entrées `NON_GAMIFIED` en sont
  exclues.
- Une progression infinie est `not_started` tant qu'aucune contribution
  éligible n'est démontrée, puis `in_progress` pour toujours. Son palier
  courant est le dernier palier atteint et son prochain palier est la cible en
  cours ; le palier initial `Observateur` à zéro ne constitue pas un début.
- Un jalon n'est `in_progress` que lorsqu'une progression intermédiaire réelle
  est fournie par sa source canonique. Les jalons binaires ne reçoivent pas de
  pourcentage artificiel. Les mécaniques `authorized_moderation` sont absentes
  de l'inventaire d'un utilisateur non habilité.
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

## Évolution

Toute modification du moteur doit vérifier ensemble :

- code métier ;
- tests concernés ;
- spec canonique ;
- éventuelle doctrine produit ;
- sécurité si une permission ou une surface privilégiée change.

Ne pas introduire une seconde documentation des seuils ou des familles de badges.
