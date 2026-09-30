# Domaine Gamification

Ce dossier porte les contrats et calculs de progression de l'application web :
XP, niveaux, statuts, badges, jalons et événements de contribution.

## Contrat courant

Le contrat publié courant est `progression-rules-v2`, représenté par
`ProgressionRulesV2` et `PROGRESSION_RULES_V2` dans
`progression-rules.ts`. Cette version décrit la sémantique actuelle des
contributions vérifiées ; elle conserve les formules et seuils existants.

La progression reste déterministe et dérivée de faits métier vérifiés. Les
consommateurs importent les types et règles depuis leur module propriétaire ;
un barrel ne doit pas recréer une seconde identité du contrat.

## Reconstruction CURRENT

Le moteur CURRENT est reconstructible depuis les faits métier canoniques. Le
contrat versionné est `GAMIFICATION_RULES_V1` dans
[`gamification-rules.ts`](./gamification-rules.ts). La chaîne de calcul est :

```text
sources métier → GamificationRulesV1 → computeExpectedGamificationState
→ reconcileUserGamification → progression_events → profil/niveaux/badges
```

`computeExpectedGamificationState` est pur : il ne lit jamais le ledger et ne
modifie aucune donnée. Le contrat porte `rulesVersion` pour l'identification
humaine et `rulesRevision` pour les comparaisons monotones ; chaque mécanique
CURRENT porte aussi `introducedInRulesRevision`. Chaque événement attendu porte
une identité logique stable et une provenance (`rulesVersion`, `rulesRevision`,
`mechanicId`, `introducedInRulesRevision`, source, `awardKind` et palier lorsque
nécessaire). Le reconciler ne possède que les événements
CURRENT explicitement identifiés ; les événements LEGACY et les sources métier
restent préservés. Une évolution de règle met à jour ou retire la projection
CURRENT, elle n'ajoute jamais une compensation additive.

Le profil conserve `currentAppliedRulesRevision` et
`lastAcknowledgedRulesRevision`. La nouveauté est orthogonale à l'état : une
mécanique introduite par la dernière révision applicable peut être
`not_started`, `in_progress` ou `completed`. L'action utilisateur
`POST /api/gamification/me/acknowledge-rules-migration` acquitte l'affichage
sans supprimer la mécanique, ses faits ni l'historique des reçus.

La lecture `GET /api/gamification/me` et les deux acquittements de cette
surface utilisent `requireAuthenticatedAccess()` ; les handlers ne dérivent
jamais l'identité depuis une autre source après le garde et n'initialisent pas
de client Supabase privilégié avant l'AuthN. L'acquittement de
réconciliation accepte uniquement `{ notificationId: UUID }` sans propriété
supplémentaire. Sa mutation reste owner-scoped et idempotente, sans révéler
qu'une notification existe pour un autre compte.

Les tests de reconstruction couvrent notamment `XP → XP`, `XP → BADGE_ONLY`
et `BADGE_ONLY → NON_GAMIFIED`, avec baisse possible de l'XP et du niveau.

## Reçu utilisateur de réconciliation

`gamification-reconciliation-receipt.ts` porte le contrat structuré
`GamificationReconciliationReceipt`. Le reconciler le construit depuis le
même plan déterministe que les écritures `progression_events`, puis le
persiste dans `app_notifications` uniquement lorsqu'une conséquence visible
existe. Le payload contient les versions de règles, les valeurs XP et niveaux
avant/après, les identifiants canoniques des progressions, badges et jalons,
ainsi que les compteurs d'événements ajoutés, modifiés et retirés et
`catalogChanges` (`newProgressionIds`, `newMilestoneIds`,
`retiredMechanicIds`). Une nouvelle mécanique applicable reste un changement
visible même si elle ne produit encore ni XP ni badge.

Un plan sans changement visible ne crée aucune notification. La persistance
reste propriétaire de l'utilisateur et protégée par RLS ; `app_notifications`
est une boîte de réception utilisateur, jamais un remplacement de
`admin_operations_audit`. Le client peut extraire le reçu avec
`getGamificationReconciliationReceipt` sans recalculer le delta.

Le loader ignore tout payload qui n'est pas un reçu de réconciliation valide,
qui est déjà acquitté ou dont `receipt.userId` ne correspond pas à l'utilisateur
demandeur. Cette vérification complète le filtre SQL par
`app_notifications.user_id` et ne modifie ni le reçu persistant ni le moteur
de réconciliation.

## Outil de réconciliation administrative

Le plan de diff en lecture est porté par
`gamification-reconciliation-plan.ts` et le traitement par lots par
`gamification-reconcile-runner.ts`. L'interface serveur est le script
`apps/web/scripts/gamification-reconcile.mjs` :

```text
--user <id> --dry-run | --apply
--all --dry-run | --apply [--batch-size N] [--resume <checkpoint.json>]
```

Le dry-run ne fait aucune écriture. L'apply réutilise le reconciler CURRENT,
journalise l'opération technique et conserve un checkpoint local ignoré par
Git pour permettre la reprise. Le runner et le plan sont testés sans accès
réseau ; aucune exécution globale de production ne fait partie de la suite
locale.

## Frontières

- les formules et règles pures restent indépendantes du rendu ;
- la persistance, les écritures d'événements et les lectures Supabase passent
  par leurs capacités dédiées ;
- l'UI consomme les contrats de progression mais ne recalcule pas les règles ;
- `GamificationSummary`, construit par `getUserProgression`, est la lecture
  utilisateur canonique des progressions et jalons. Il dérive `xpTotal` et
  les contributions depuis `progression_events`, expose les niveaux et le
  prochain palier déjà calculés, et porte explicitement l'XP de compatibilité
  qui ne relève d'aucune mécanique CURRENT. Les surfaces Gamification et
  profil ne reconstruisent pas ces valeurs localement.
- les futures récompenses communautaires ne sont pas un runtime Gamification.

## Sous-domaine referrals

Le parcours de parrainage possède sa propre capacité sous
[`referrals/`](./referrals/) :

- `referrals.ts` porte les invitations, l'identité du parrainage, les caches
  invalidés et la réconciliation des récompenses ;
- `referral-lineage.ts` porte les graphes, chaînes d'ancêtres, vues et
  classements de lignage ;
- `referral-reconciliation.ts` porte l'idempotence et la réconciliation des
  contributions utiles ;
- `referrals-cache.ts` porte la lecture serveur mise en cache du résumé.

Les tests et leurs helpers vivent avec cette capacité dans `referrals/`.
Les consommateurs importent directement le module propriétaire, sans barrel
global ni façade à l'ancien chemin. Les dépendances vers les notifications et
la progression restent celles des modules existants ; ce découpage ne modifie
ni les règles XP, ni le registre CURRENT, ni les migrations.

Une récompense future pourra partager un fait métier vérifié, mais ne doit pas
modifier les invariants de progression : XP non achetable et non dépensable,
niveau et badge sans avantage probabiliste, et aucune contribution financière
ne donnant de ticket. Un badge de mérite reste déterministe.

La spécification fonctionnelle canonique reste
[`gamification-SPEC_CANONIQUE.md`](../../../../../documentation/pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md).

## Validation

Les tests de progression restent auprès des modules concernés. Pour une
modification locale :

```text
npm run test -w apps/web -- src/lib/gamification
npm run typecheck -w apps/web
npm run lint -w apps/web
```
