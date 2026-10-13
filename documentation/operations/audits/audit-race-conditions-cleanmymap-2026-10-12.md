# Audit ciblé des risques de concurrence, CleanMyMap

> Statut : `AUDIT`, preuve de lecture du code, non `CURRENT` runtime.
>
> Date : 12 octobre 2026. Dépôt : `maxd4/CleanmyMap`, branche `main`.
>
> Baseline étudiée : `0b6a2d8a2512b6ba479e188fdabb0b7670e16b39`.
> Actualisation après nouveau commit : `b74caaf9c2bcb0750cd8bb3417f4e8ed730ab0c3`.
>
> **Limites** : audit read-only, pas de test exécuté, pas de preuve de déploiement Vercel ou de migrations appliquées sur Supabase. Les scénarios de concurrence sont inférés du code, pas observés en production. Relecture d'un échantillon transversal orienté risques et découverte sur l'arbre complet, non revue manuelle exhaustive de chacune des 153 routes API et 242 migrations SQL.

## Méthode et périmètre

Le dépôt à la baseline comporte 5 639 chemins, 153 handlers `route.ts`, 242 migrations SQL et plus de 1 100 fichiers de tests web. Le recensement de l'arbre, les recherches de patterns (`idempotency`, `FOR UPDATE`, `concurrent`, `inFlight`, `upsert`) et les lectures ciblées ont couvert les frontières métier suivantes : SPA/web API, Supabase, SPOGOMI, Actions et participations, gamification, mobile/GPS, snapshots, chat et CI. Les fichiers spécialisés `AGENTS.md`, les contrats `documentation/architecture/data-governance.md`, `documentation/features/spogomi.md` et `documentation/development/TESTING.md` ont été consultés.

Une recherche textuelle n'est pas une preuve d'absence de race condition. Les systèmes externes, les transactions réelles et la totalité des callers n'ont pas été exécutés. Les priorités expriment le risque de dommage potentiel, pas un incident avéré.

## Matrice des constats

| ID | Gravité relative | Frontière | Constat sur la baseline / le dernier main lu | Preuve | Traitement |
|---|---|---|---|---|---|
| R01 | P0 initial, corrigé dans le code | Certificats SPOGOMI | `FOR UPDATE` sur certificat actif absent ne verrouille aucune ligne. La nouvelle migration `00021` ajoute un verrou transactionnel par couple et un index unique partiel. | Code SQL initial et correctif `00021` | **Code corrigé** au SHA `b74caaf9`, **application distante et propriétés concurrentes non vérifiées** |
| R02 | P1 | Composition SPOGOMI | Recomposition en requêtes HTTP distinctes avec détachement, suppression, création et réaffectation ; échec partiel possible. | `preparation-service.ts`, `autoComposeTeams` | RPC transactionnelle, validation d'état, test en base |
| R03 | P1 | Verrouillage SPOGOMI | Les lectures de composition, la transition des équipes et celle de l'événement ne forment pas une transaction. `moveParticipantToTeam` dépend d'un état `event` potentiellement périmé. | `preparation-service.ts`, `lockSpogomiTeams`, `moveParticipantToTeam` ; triggers initiaux | RPC commune et garde de modification après verrouillage, tests entrelacés |
| R04 | P1 | File mobile | Deux `enqueue` ou un `enqueue` et un `remove` peuvent perdre une modification en lecture-écriture d'index. | `apps/mobile/lib/storage.ts` | Sérialiser par propriétaire avec tests Promise contrôlées |
| R05 | P1 | Réconciliation mobile | Une Promise `pendingReconciliationInFlight` globale fait partager une exécution entre propriétaires distincts. | `apps/mobile/lib/linked-mission-service.ts` | Reconciliation in-flight par propriétaire et garde d'identité |
| R06 | P1 | GPS offline | L'envoi puis le rejeu utilisent `insert` sans identité stable de point. Une réponse perdue après commit autorise le doublon. | `apps/mobile/tasks/gps-task.ts`, `storage.ts`, migration GPS `20260506000024` | Identité stable + unique en base + insert idempotent, preuve de retry |
| R07 | P1 | Profil gamification | Plusieurs lectures/calculs peuvent se croiser et un ancien `upsert` écraser un total récent. | `progression-tracking.ts`, `progression-profile-refresh.ts` | Protection serveur inter-instances et test de réconciliation concurrente |
| R08 | P1, investigation ciblée | Journal gamification | `reconcileUserGamification` sépare lecture des faits, plan, insert/update/delete et reçus. Un autre reconciler peut agir entre les étapes. | `gamification-reconciliation.ts` | Confirmer contrat, puis préserver cohérence, idempotence et receipts dans la même correction R07 |
| R09 | P2 | Snapshots publics | Déduplication `inFlightRefreshes` propre au process ; `upsert` par jour sans ordre imposé ni invalidation atomique ; stale overwrite possible entre instances. | `public-surface-snapshot-service.ts`, `public-surface-snapshots.ts` | Protection contre version périmée et test multi-requêtes |
| R10 | P2, investigation ciblée | Référence GPX SPOGOMI | Upsert du parcours, lecture puis réécriture de `actions.preparation_data` séparées. Échec ou concurrence peut rendre les sources incohérentes ou écraser un champ modifié en parallèle. | `preparation-service.ts`, `attachOfficialGpx` | Faire converger dans le lot de préparation SPOGOMI, préserver les autres métadonnées |

### R01 : correction publiée en cours d'audit

Le commit `b74caaf9c2bcb0750cd8bb3417f4e8ed730ab0c3` ajoute `apps/web/supabase/migrations/20261012000021_spogomi_certificate_reissue_concurrency.sql` :

- abandon de la contrainte réellement nommée par PostgreSQL lors de la migration antérieure ;
- index unique partiel `spogomi_volunteer_certificates_active_user_event_key` sur `(user_id,event_id)` avec `status='active'` ;
- `pg_advisory_xact_lock` avec la même clé avant toute lecture active, tant pour l'émission que pour la révocation ;
- ajout d'un test **statique** de présence de ces éléments.

La race « absence de ligne à verrouiller » n'est donc plus un défaut de code actif selon la version examinée. Les propriétés à démontrer en `EXECUTED_DB_CONTRACT` : deux émissions à vide donnent un seul certificat actif ; deux réémissions concurrentes restent sérielles ; émission et révocation ne produisent pas d'état interdit ; une référence révoquée n'est jamais réutilisée ; les historiques sont cohérents ; des données antérieures incompatibles ne bloquent pas l'application de l'index. Aucune migration distante n'a été exécutée ou inspectée pendant l'audit.

### R02 et R03 : frontières SQL atomiques de la préparation SPOGOMI

`autoComposeTeams` lit les inscrits, détache les affectations, supprime les équipes précédentes, insère de nouvelles équipes et assigne les participants par requêtes distinctes. `lockSpogomiTeams` lit et valide l'effectif avant d'écrire les statuts des équipes puis l'état événement dans deux opérations. `moveParticipantToTeam` se fie à l'état d'un objet `event` chargé en amont. Un verrouillage simultané à un déplacement peut valider une ancienne composition, et un échec de recomposition peut laisser un état partiel. Le SQL initial consulté n'institue pas de garde serveur cohérent contre ces transitions.

**Décision technique** : une RPC transactionnelle pour chacune des opérations de composition, déplacement et verrouillage, toutes synchronisées par le même verrou de ligne `spogomi_events` (ou primitive transactionnelle équivalente et homogène). Verrouiller avant de relire et valider les effectifs. Mettre la transition des équipes et celle de l'événement dans une seule transaction. Si la composition est déjà verrouillée, la modification doit être refusée côté base, même avec un ancien objet événement. Protéger les écritures directes privilégiées qui contourneraient la RPC, de façon ciblée. Conserver une composition stable par event, l'unicité des numéros et les identités des inscrits ; aucun changement de barème sportif.

### R04 et R05 : files de réconciliation mobiles

`storage.ts` protège déjà les mutations du **buffer GPS** par `withGpsBufferMutation`, mais `enqueuePendingLinkedMissionReconciliation` et `removePendingLinkedMissionReconciliation` utilisent des lectures/écritures d'index non sérialisées. Reproduire deux appels `enqueue(A)` / `enqueue(B)` lisant tous deux `[]`, puis deux écritures successives : A ou B est perdu. Reproduire également un `remove(A)` concurrent d'un `enqueue(B)`.

`linked-mission-service.ts` utilise une unique `pendingReconciliationInFlight: Promise<void> | null` : le traitement du compte B peut être coalescé avec celui du compte A et ne pas s'exécuter. Décision : sérialisation par owner de l'index, déduplication de mission, verrou de réconciliation par owner et confirmation de l'identité Clerk au moment du transport. Ne pas confondre lock mémoire intra-process avec garantie de synchronisation multi-process ; les effets serveur restent idempotents.

### R06 : identité durable des points GPS

L'insertion directe dans `gps-task.ts` est suivie de `bufferPoint` lors d'erreur réseau ; le rejeu `flushBufferOnce` appelle `.insert(buffer)` puis efface les enregistrements après acquittement. Le serveur peut avoir inséré le point sans que le client reçoive la réponse. La table GPS initiale possède un `id bigint` attribué par le serveur et un index non unique `(mission_id,recorded_at)`, pas un identifiant de mesure transporté à travers les tentatives.

**Décision technique** : créer une identité de point côté client au moment de la mesure, la conserver dans le buffer et l'utiliser dans toutes les tentatives de transport ; index unique par mission et identité de point, sans dédupliquer deux mesures sur leur seul `recorded_at`. Une migration append-only doit être compatible avec les points historiques. Insérer avec contrat idempotent (`ON CONFLICT DO NOTHING` ou équivalent autorisé par RLS), sans masquer les erreurs de validation ni celles d'ownership. Tester ack perdu, retries, redémarrage, différences de points et identité de compte. Vérifier la conséquence sur les métriques de distance et les contributions géométriques.

### R07 et R08 : ordonnancement de la gamification

`refreshProgressionProfile` lit le journal d'XP puis `persistProgressionProfileRefresh` persiste des totaux calculés en mémoire via `upsert(user_id)`. Aucun token de génération source ni condition d'écriture n'empêche le résultat d'une lecture ancienne de passer après le résultat récent. `reconcileUserGamification` applique plusieurs mutations après planification, hors transaction globale.

**Décision technique** : imposer un contrat serveur partagé de cohérence par utilisateur entre les faits canoniques, le journal et les projections, avec ordre de génération ou révision source vérifiée au commit. Une Promise en mémoire Next.js ne suffit pas en multi-instance. Ne pas doubler le moteur de formules XP ni introduire un second ledger. Les notifications et receipts ne doivent pas annoncer un état rejeté ou périmé. Démontrer : réponses réseau volontairement inversées, deux réconciliations du même user, deux users parallèles, retry et aucun retrait de fait plus récent.

### R09 : snapshots matériels

Le module `public-surface-snapshot-service.ts` déduplique par Map mémoire (`snapshotKey:version`) dans un même process. La persistance `public-surface-snapshots.ts` fait un upsert sur `snapshot_key,snapshot_date`, avec `generated_at` recalculé dans chaque requête. Deux instances peuvent effectuer la reconstruction en parallèle ; la plus ancienne peut finir en dernier et remplacer le payload. Une invalidation peut croiser une reconstruction en cours. Il s'agit d'une projection recalculable, donc P2 plutôt qu'un défaut d'intégrité canonique. Décision : ne pas installer Redis/Upstash par défaut ; protéger l'ordre des versions au niveau de la persistance, borner le coût des recalculs et couvrir les courses d'invalidation.

### R10 : métadonnées du parcours officiel

`attachOfficialGpx` effectue un upsert `spogomi_event_routes`, puis un read-modify-write de la colonne JSON `actions.preparation_data`. Une mutation concurrente d'autres champs dans le JSON peut être perdue. Conserver la source géométrique SPOGOMI canonique et faire converger le résumé Action avec une fonction de mise à jour transactionnelle ciblée ; conserver toutes les métadonnées non SPOGOMI et ne pas transformer le GPX officiel en géométrie observée.

## Contrôles déjà positifs dans le code, non validés runtime

- Création d'événement SPOGOMI : réservation de clé, empreinte immutable, lease de traitement, index unique de corrélation d'Action.
- Import de roster : réservation, unicité de fichier/lignes, reprise et vérification de complétude.
- Soumission/certification SPOGOMI : RPC dédiées, contrôles de version, verrous SQL et erreurs de conflit.
- Classements officiels SPOGOMI : RPC atomique avec verrous et vérification de snapshot source.
- Organisateurs et invitations Actions : migrations atomicité et verrouillage par action.
- Participation finale : récupération de conflit d'unicité lors de la demande de rattachement.
- Buffer mobile : sérialisation intra-process des mutations GPS et déduplication des flush concurrents d'un propriétaire ; ceci ne protège pas le scénario de réponse réseau perdue.
- Snapshot public : coalescing dans un même process, testé par Vitest ; ceci ne garantit pas le multi-instance.

La présence de ces protections ne prouve pas l'absence d'autres races. Les domaines Chat, notifications et imports ont été explorés sans anomalie suffisamment établie pour recommander une correction hors périmètre.

## Stratégie de tests et d'outillage

La CI possède déjà `.github/workflows/e2e-supabase.yml`, qui démarre un Supabase éphémère et rejoue les migrations sur GitHub Actions. Elle est préférable aux tests destructifs sur la base distante et à la création d'un nouveau service de coordination.

1. **Vitest, tests à ordonnancement contrôlé** : deux Promise bloquées par des barrières explicites, scénarios de changement d'identité, réponse HTTP perdue, résolution inversée, assertion de l'invariant final.
2. **PostgreSQL à deux sessions** : transactions concurrentes réelles, verrous et index ; définir `lock_timeout` et `statement_timeout` bornés ; vérifier les lignes finales et l'audit ; répéter les permutations déterministes. Exécuter dans la CI Supabase éphémère existante ; toute nouvelle dépendance doit être justifiée par l'impossibilité d'utiliser les outils présents.
3. **Contrôles statiques** : utiles comme garde-fou architectural (présence d'index/RPC), mais ne pas les renommer en tests d'atomicité.
4. **Aucune mutation de production** pour l'audit. Observation read-only éventuelle du statut des migrations, du nombre de lignes incohérentes et des index, via accès autorisé ; ne pas supposer la base distante alignée sur les migrations Git.

Pas de besoin démontré de Redis, BullMQ, nouveaux webhooks, framework de tâches ou scanner externe. Si la CI ne peut pas gérer deux connexions PostgreSQL reproductibles avec son outillage existant, envisager seulement une petite dépendance de test `pg`, sans l'importer au runtime.

## Intégration recommandée, lots indépendants

**Lot A, SPOGOMI préparation et composition** : R02, R03 et R10. RPC/guards, transactions, contrats de métadonnées GPX et tests en base ; documentation spécialisée `documentation/features/spogomi.md`, fiche(s) des pages concernées selon changement UX. Inclure R01 uniquement pour *tests SQL de la migration déjà publiée*, sans réintroduire sa correction.

**Lot B, mobile synchronisation GPS** : R04, R05, R06. File et réconciliation owner-scoped, idempotence de points GPS, migration append-only, tests de retry et identité, docs mobile et données impactées.

**Lot C, gamification** : R07 et R08. Invariant par utilisateur, détection d'écritures obsolètes, test de deux réconciliations et receipts/notifications cohérents ; documentation existante du domaine.

**Lot D, snapshots** : R09. Interdire les régressions de fraîcheur dans la persistance partagée et couvrir invalidation concurrente ; uniquement si le coût et la fraîcheur réelle du snapshot justifient cette protection additionnelle. Pas de nouveau service.

Chaque lot requiert les tests ciblés, `npm run checks:changed` ou le contrôle canonique applicable, la preuve réelle du contrat DB si modifié, puis commit isolé/push `main` par Codex selon la gouvernance ; ChatGPT relit le nouveau `main` après publication.

## État des preuves

`CODE_REVIEW` : effectuée sur les chemins listés à la baseline avec actualisation du commit certificat.

`STATIC_CONTRACT` : fichiers de tests inspectés, **non exécutés**.

`EXECUTED_BEHAVIOR` : **NON EXÉCUTÉ**.

`EXECUTED_DB_CONTRACT` : **DB_SEMANTICS_NOT_EXECUTED**.

`REMOTE_MIGRATION_STATE` : **NON OBSERVÉ**.

`PRODUCTION_CONCURRENCY_INCIDENT` : **NON PROUVÉ**.

`TOUT_LE_DÉPÔT_FORMELLEMENT_EXEMPT_DE_RACES` : **NON PROUVÉ** ; une telle garantie ne résulte pas d'une revue statique.
