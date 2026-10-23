# XP, réconciliation et collection SPOGOMI

> Module associé à [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md). Statut : CURRENT.

## Règles d attribution XP

- une récompense XP doit être unique par source logique;
- chaque attribution doit avoir un `source_table` et un `source_id` stables;
- `progression_events` est le journal d audit, pas la source de vérité métier;
- la reconstruction CURRENT suit `sources métier → GamificationRulesV1 →
  computeExpectedGamificationState → reconcileUserGamification`; le ledger
  peut donc être recalculé conceptuellement sans perdre les faits métier;
- l'identité logique d'un événement CURRENT reste stable entre versions de
  règles et sa métadonnée porte `rulesVersion`, la mécanique, la source,
  `awardKind` et le palier éventuel; un changement de montant remplace l'XP
  attendue, il n'ajoute pas une compensation;
- les événements LEGACY hors responsabilité explicite du moteur CURRENT sont
  conservés; une règle `BADGE_ONLY` conserve seulement la preuve de badge et
  une règle `NON_GAMIFIED` retire sa projection CURRENT.
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
- [Direction visuelle préparatoire des badges](../../../../design-system/GAMIFICATION_BADGES_VISUAL_DIRECTION.md) — document `PLAN` distinct du contrat métier.

Les choix graphiques finaux des badges ne sont pas encore `CURRENT`. La
direction préparatoire est documentée dans
`documentation/design-system/GAMIFICATION_BADGES_VISUAL_DIRECTION.md` ; aucun
asset final ne doit être dérivé automatiquement de cette direction avant la
stabilisation de l’architecture de gamification. Cette spec reste la source de
vérité pour les familles, règles, XP, paliers et critères d’éligibilité.

## Vérification

La surface administrative d'audit XP est `/admin/gamification/xp-audit` et
doit appeler `checkAdminAccess()` avant toute lecture privilégiée. Les règles
générales d'autorisation restent définies dans la doctrine sécurité dédiée.

Cette spec doit rester alignée avec:

- `apps/web/src/app/api/gamification/badges/list/route.ts`
- `apps/web/src/lib/gamification/*`
- `apps/web/src/components/gamification/*`

Si un changement métier est fait dans le code, cette spec doit être mise à jour dans la même passe.
## Collection SPOGOMI privée et répétable

Les distinctions CleanMyMap SPOGOMI ne sont pas des distinctions officielles
présumées de SPOGOMI France. `spogomi_collector`, `spogomi_referee`, les six
médailles, `spogomi_double_podium` et `spogomi_organizer` sont des exemplaires
répétables par événement, conservés dans une projection serveur privée et
reconstructible. Leur clé logique est `(user_id, event_id, badge_type_id)` ;
l'année civile issue de la date locale officielle ne participe pas à l'unicité.

`badgeTotal` reste `gradeCount + oneShotCount`. Les exemplaires SPOGOMI sont
exposés séparément par `spogomiAwardCount`,
`spogomiDistinctBadgeTypes` et `spogomiEventsParticipated`, avec les deux
progressions spécialisées sans limite (`collector` et `referee`). Ils ne
deviennent pas de nouvelles progressions XP CURRENT.

Le seul XP supplémentaire est le jalon global `spogomi_first_referee` à `+1`
une seule fois. Il est produit par `progression_events` depuis une mission
d'arbitrage réellement certifiée ; les permissions, l'inscription et le rôle
attribué ne sont pas des preuves. Le ramassage confirmé utilise uniquement la
progression `participation` existante et les médailles sont `BADGE_ONLY`.

Les médailles consomment exclusivement une projection officielle certifiée du
classement. Le code ne calcule ni rang, ni départage, ni conversion de mégots.
Une égalité non résolue ou un classement provisoire laisse l'attribution en
attente. Les corrections, révocations et reconstructions sont idempotentes et
historisées, sans effet sur les mesures physiques ni sur les événements d'un
autre événement. La lecture est bornée au compte courant ; aucune identité
privée de roster ou de mineur n'est publiée par défaut.

La réconciliation d'un événement SPOGOMI prévalide les faits paginés nécessaires
pour chaque utilisateur affecté avant de muter la collection privée et réutilise
un snapshot unique pour le jalon global `spogomi_first_referee`. Si la
réconciliation XP est interrompue après la mutation atomique des badges, le
résultat est explicitement partiel et rejouable ; il n'est pas présenté comme
une réconciliation complète. Cette frontière ne prétend pas fournir une
transaction globale entre la RPC des badges et le ledger `progression_events`.

La section `/sections/gamification` consomme cette collection privée via
`GET /api/gamification/spogomi/collection`. Elle affiche le nom public de la
compétition, la date locale, le rôle ou le rang dérivé de l'identité canonique
du badge et l'état courant (`active`, `révoquée` ou remplacée après correction).
Les filtres année/type/événement ne regroupent jamais deux occurrences de même
`badge_type_id` sur des événements distincts. La fiche publique
`/spogomi/[eventSlug]` ne révèle aucun badge ; après liaison authentifiée,
`GET /api/spogomi/events/[eventId]/identity-link` expose seulement les badges
du compte pour cet événement et un état d'attente si l'événement n'est pas
encore certifié.
