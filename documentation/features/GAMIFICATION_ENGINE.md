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
- la métrique `Zone sensible apaisée` reste hors des sept progressions infinies :
  sa qualification est figée à la validation dans `progression_events`, puis
  ses seuils gemme sont projetés par des événements idempotents `+1 XP`;
  l'état courant d'une zone ne révoque jamais cette preuve historique.
- les GET, loaders de page et lectures de profil sont read-only ; les
  attributions de progression sont déclenchées par une mutation métier ou par
  le rebuild serveur explicite `rebuildUserGamificationBadges`.
- le rebuild/backfill est idempotent et ne doit jamais être appelé par une
  lecture publique ou un rendu de page.
- les écritures d'audit et notifications sont des effets secondaires et ne doivent pas devenir la preuve métier.
- Le registre CURRENT de `apps/web/src/lib/gamification/progression-utils.ts`
  classe tous les `event_type` dans exactement trois catégories : une des sept
  progressions infinies (`participation`, `organisation`, `exploration`,
  `clean_zones`, `regularity`, `versatility`, `learning`), `milestone` pour les
  jalons one-shot ou `non_progression` pour les métriques et compatibilités
  hors taxonomie.
- Chaque progression expose le contrat typé commun
  `GamificationProgressionState` : valeur courante, badge courant, prochain
  badge, pourcentage et contribution au total XP. Cette contribution n'est pas
  un solde séparé.
- Les quatre progressions terrain principales sont matérialisées par les
  métriques canoniques `participation`, `organisation`, `exploration` et
  `clean_zones`; elles partagent ce contrat sans partager leur compteur ni
  leur famille de badges.
- L'XP globale est calculée à partir de la somme des événements actifs des
  sept progressions et des événements one-shot. Aucun `progression_id` SQL
  supplémentaire n'est requis : la classification est dérivée de manière
  déterministe du registre des `event_type`.
- les lectures Clean Zones courantes utilisent `trash_spotter_spots`.
- les anciennes identités d'événement liées à `spots` peuvent être reconnues uniquement pour préserver l'historique et empêcher une réattribution d'XP ; la table legacy n'est pas une source courante de candidats.
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
