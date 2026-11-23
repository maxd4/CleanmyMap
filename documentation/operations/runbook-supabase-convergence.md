# Runbook CURRENT — convergence Supabase publiée

Le workflow `.github/workflows/supabase-convergence.yml` maintient le projet
lié avec toute la file canonique de migrations de `main`. Son mode automatique
attend `supabase-sql-proof-ephemeral` via `workflow_run` : ce workflow rejoue
la file complète sur une instance éphémère, le seed, pgTAP, les contrats SQL et
la concurrence PostgreSQL. La convergence vérifie ensuite le dépôt, la branche
`main`, le SHA attesté toujours égal au HEAD distant et le préflight complet
`READY_TO_APPLY` avant toute écriture. Les déclenchements manuel et quotidien
restent read-only. Le workflow n'a pas de déclencheur `pull_request` et utilise
l'environnement GitHub protégé `supabase-production`.

Le workflow SQL accepte aussi `workflow_dispatch` pour relancer la preuve; il
ne peut démarrer que depuis `main` et vérifie que le SHA du run est encore le
`HEAD` distant. Le workflow applicatif `e2e-supabase-ephemeral` conserve ses
contrôles de provenance et ses secrets Clerk Development. Ses résultats et
ceux du backup/restore sont indépendants de l'attestation SQL : leurs échecs
ne sont ni cachés ni utilisés comme preuve SQL positive ou négative. Le runner
SQL canonique n'est pas dupliqué dans ces workflows.

## Préconditions et références

L'environnement fournit uniquement `SUPABASE_ACCESS_TOKEN` et
`SUPABASE_DB_PASSWORD`, sans les écrire dans le dépôt. Le job est limité à
`main`, ses permissions GitHub sont `contents: read`, et sa concurrence est
sérialisée par `supabase-production-migrations`.

La publication Git et l'application Production sont deux étapes indépendantes :
un défaut Supabase, un préflight bloqué ou une preuve manquante ne retient pas
un commit/push autrement publiable. Les protections Git, secrets, intégrité,
concurrence et fast-forward restent obligatoires. Pour une file non vide,
`READY_TO_APPLY` exige que la rétrocompatibilité des consommateurs existants
soit établie lorsqu'une migration modifie ou supprime un contrat SQL. Avant le
préflight, le garde vérifie strictement la source `e2e-supabase-ephemeral`, le
dépôt, la branche `main`, la conclusion `success`, le SHA testé et le `HEAD`
distant courant. Cette décision ne dépend ni d'un déploiement Web externe, ni
d'un manifeste de déploiement.

## Décision et application

Le préflight canonique est exécuté avec :

```text
npm run supabase:migration:preflight -- --dry-run
```

Il réutilise `audit-supabase-release.mjs`, vérifie l'identité CLI, le projet
lié, l'ordre des historiques et la file complète, puis parse strictement les
sorties réelles de `migration list --linked` et `db push --dry-run`. Une sortie
sans payload JSON unique est bloquante. Il distingue le DML exécuté pendant la
migration du DML contenu dans les fonctions ; les cas indécidables sont
`REVIEW_REQUIRED`. Il examine aussi les dépendances SQL, RLS, grants, contrats
consommés et Advisors. Les WARN/INFO historiques restent dans le rapport ;
seuls un risque critique ou une régression explicitement attribuée à la file
bloque l'application.

Les backfills DML ne sont admissibles que par une entrée du manifeste versionné
`scripts/ci/supabase-migration-approvals.json`, qui lie version, identifiant,
chemin, SHA-256 du SQL, justification et chemins/hash des preuves obligatoires. Le
contenu doit rester identique et classé non destructif. La preuve éphémère
enregistre le SHA-256 des migrations et tests exécutés ; la garde refuse une
approbation dont l'empreinte ou une preuve requise manque. Ce manifeste ne peut
pas autoriser un SQL destructif ou indécidable. La preuve actuelle reste une
preuve complète de la file : aucun préfixe partiel n'est appliqué.

`ALIGNED` signifie que l'historique est convergent et qu'il n'y a aucune
migration en attente ; ce statut ne dépend pas de contrôles d'application, mais
les alertes de sécurité restent visibles. `READY_TO_APPLY`, après preuve SQL
complète et provenance exacte, autorise le workflow automatique à exécuter
l'unique commande mutative :

```text
npx supabase db push --linked --yes
```

`BLOCKED` et `DIVERGED`, une preuve absente, un contrôle bloquant ou un SHA
obsolète n'appliquent rien. Le diagnostic reste assaini et publie le statut, la
première migration réellement attribuée ; `GLOBAL` indique un contrôle bloquant
qui ne désigne pas une migration. Les dépendances et contrats incompatibles
restent associés à leur migration. Toute la file reste en attente. Le contrôle
préalable ne retient pas le push Git. Après correction
validée, la reprise est automatique au prochain succès de la preuve SQL ;
aucune confirmation manuelle répétitive n'est requise. Après application, le workflow rejoue le
préflight et exige `ALIGNED`, puis relit les Advisors, les arbres de migration
et les contrats statiques critiques Web. La lane SQL éphémère reste le seul
endroit autorisé pour exécuter les pgTAP mutatifs ; ce workflow ne lance jamais
pgTAP contre la base liée.

Au démarrage éphémère, le diagnostic conserve les états périodiques des services
et les événements Docker observés pendant l'exécution de la CLI. Tant que le
conteneur `db` est actif, les observations distinguent la santé Docker,
`pg_isready` exécuté dans PostgreSQL et une connexion TCP du runner vers le port
configuré. Une disponibilité interne ne prouve donc pas la joignabilité du
runner. Les attributions de service sont séparées en confirmée, suspectée ou
inconnue ; une simple mention dans le journal ne confirme pas une cause. Pour
Supabase CLI 2.117.0, le diagnostic tient compte de l'ordre de bootstrap : santé
de PostgreSQL, initialisation du schéma, jobs temporaires Realtime, Storage et
Auth, migrations et seed, puis services persistants. Les jobs temporaires ne
sont reconnus que par le label exact `com.supabase.cli.project` du projet
configuré, une image de service autorisée et un nom qui ne correspond pas à un
conteneur persistant. Le rapport expose le dernier job démarré, le premier job
échoué et son code de sortie, sans exposer son nom Docker ou son image.

Les lignes de progression comme `Waiting for health checks` et l'appel normal
`Realtime.Tenants.health_check` ne sont pas des erreurs. La classification
repose sur des signaux terminaux précis ou un job temporaire explicitement
échoué ; une erreur de debug non reconnue reste `UNCLASSIFIED`. Le diagnostic
expurgé peut classer les SQLSTATE PostgreSQL connus (syntaxe, dépendance,
données, permissions/RLS, concurrence ou connexion) et ne publie que le code,
la catégorie et un identifiant de migration validé. Pour `22P02`, il peut aussi
indiquer le type PostgreSQL attendu sans conserver la valeur rejetée ; les
messages structurés imbriqués sont analysés mais jamais recopiés dans l’artefact.
`start_phase` indique une
phase observée et ne prouve pas à lui seul qu'elle a échoué ;
`first_failed_step` distingue une cause établie d'une phase de migration dont la
cause reste inconnue. Un arrêt Docker normal ou le nettoyage ne devient jamais
la cause de l'échec.
Journaux bruts, événements complets et détails structurés de la CLI restent dans
des fichiers privés temporaires du runner puis sont supprimés. Seuls services,
phases, états et codes explicitement autorisés paraissent dans les preuves. Un
`die` à code zéro et un `destroy` de nettoyage sont rapportés comme arrêt normal
et nettoyage ; aucun des deux n'est présenté seul comme cause racine.

## Blocages et reprise

Un blocage doit être traité à sa cause : authentification/cible, divergence
d'historique, sortie CLI ambiguë, mutation réelle, incompatibilité SQL, risque
Advisor critique ou revue obligatoire. Il est interdit de réparer l'historique,
de modifier une migration déjà appliquée, d'exécuter une DDL manuelle, de reset
la base ou de relancer aveuglément. Après une correction forward-only validée,
la publication de la migration reste possible indépendamment de son application ;
la convergence reprend automatiquement après une nouvelle preuve éphémère
réussie, ou peut être inspectée manuellement sans contourner les preuves.

### Isolation contrôlée d'un échec de replay

Le dispatch du workflow unique `supabase-sql-proof-ephemeral` accepte aussi le
mode `isolate-replay`. Ce mode garde les permissions `contents: read`, vérifie
que le SHA est le `HEAD` de `main`, et n'utilise aucune identité ni cible
Supabase distante. Il démarre la version CLI du workflow avec une configuration
éphémère minimale où migrations et seed applicatifs sont désactivés. Si ce
bootstrap échoue, le replay applicatif n'est pas lancé. S'il réussit, le mode
active l'arbre canonique en lecture seule par symlink et teste les préfixes
chronologiques par dichotomie, sans seed. Chaque tentative conserve un journal
privé distinct avec son numéro de préfixe, sa version et son code de sortie. La
dichotomie commence par tester le préfixe complet. Elle est suivie d'un rejeu
explicite du préfixe immédiatement précédent, qui doit réussir, puis du
préfixe fautif, qui doit échouer avec le même contexte `supabase db reset`.
Une migration n'est attribuée que si cette frontière PASS/FAIL est reproductible ;
une erreur CLI, un résultat discordant ou un prédécesseur en échec produit
`INCONCLUSIVE` sans version causale.

Après une frontière confirmée, un rejeu `psql` de la migration depuis son
prédécesseur peut être exécuté comme diagnostic complémentaire. Son SQLSTATE,
son type et sa position restent dans un champ distinct `isolatedPsqlDiagnostic`.
Ils ne remplacent jamais le diagnostic du replay Supabase canonique : un
`42501` de `psql` ne démontre pas la cause d'un `22P02` du replay.

Les sorties brutes du CLI, des journaux Docker et des journaux JSON privés de
PostgreSQL restent dans `$RUNNER_TEMP` et sont supprimées avec le runner. Le
seul artefact publié contient le SHA candidat, les hashes des migrations
canoniques, le résultat séparé du bootstrap/replay, le statut de reproductibilité
de la frontière, la version seulement si elle est confirmée, et le SQLSTATE, le
type PostgreSQL allowlisté ou la position numérique quand ils proviennent du
replay canonique. Le diagnostic `psql` est explicitement séparé. L'artefact ne
contient ni instruction SQL complète, ni valeur rejetée, ni message brut. Cette preuve diagnostique ne vaut
pas `REPLAY_FROM_ZERO`, ne lance ni seed ni pgTAP/concurrence, et ne permet
jamais la convergence Production. Le workflow complet reste le seul à produire
l'attestation consommée par `supabase-convergence.yml`.

Les validations locales du contrat de workflow sont :

```text
node --test scripts/ci/supabase-convergence-workflow.test.mjs scripts/ci/supabase-migration-preflight.test.mjs
npm run check:github-actions
```

Une exécution locale du préflight et de `db push --dry-run` reste read-only et
ne constitue pas une preuve d'application, de RLS, de triggers, de concurrence
ou de pgTAP. Sans lane PostgreSQL éphémère autorisée, conserver le statut
`DB_SEMANTICS_NOT_EXECUTED`.

## Application accélérée exceptionnelle

Cette voie ne s'exécute pas via un dispatch read-only et n'est pas autorisée
implicitement par la disponibilité du projet ou un simple préflight favorable.
Elle exige un accord humain explicite pour l'exécution concernée. Avant de la
demander, l'opérateur doit :

1. examiner toutes les migrations en attente et leurs dépendances dans l'ordre
   canonique, sans en exclure aucune;
2. produire et vérifier une sauvegarde récente récupérable (manifeste,
   intégrité et restauration de contrôle selon le runbook backup/restore);
3. obtenir `READY_TO_APPLY` du préflight canonique read-only sur la cible liée,
   sans `BLOCKED`, `DIVERGED`, migration ambiguë ni régression bloquante;
4. obtenir l'accord explicite d'un humain habilité pour le SHA courant de
   `main`, en consignant la revue de file, le résultat du backup et du
   préflight;
5. déclencher manuellement `supabase-sql-proof-ephemeral` sur `main` pour ce
   SHA. Le garde de provenance exige à nouveau le HEAD courant, l'attestation
   SQL complète et `READY_TO_APPLY` avant l'application automatique.

Le dispatch direct de `supabase-convergence.yml` reste read-only. L'accélération
ne lance jamais `db push` depuis un poste local ni ne contourne la preuve ou le
workflow canonique; elle consiste à lancer immédiatement la preuve exacte après
la revue et l'accord explicite.

Si un contrôle manque, la voie accélérée reste bloquée. Elle n'autorise ni SQL
manuel, ni `migration repair`, ni exclusion de migration, ni contournement de
l'environnement protégé. Elle doit utiliser le workflow canonique approuvé;
aucune exception n'est exécutée dans le cadre de ce changement.
