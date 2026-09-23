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
- les écritures d'audit et notifications sont des effets secondaires et ne doivent pas devenir la preuve métier.
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
