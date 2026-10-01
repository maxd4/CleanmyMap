# Gouvernance locale — `apps/web/supabase`

Héritage : gouvernance racine → `apps/web/AGENTS.md` → ce périmètre Supabase.
Ces règles concernent la configuration et les migrations du workspace web.

## Arbre de migrations

- `apps/web/supabase/migrations/` est l'unique arbre de migrations éditable et
  canonique ;
- ne créer ni migration ni copie dans un second arbre ;
- les migrations sont append-only. Une exception de replay strictement bornée
  peut corriger localement une migration déjà appliquée uniquement si les
  conditions et la justification de l'ADR-006 sont respectées ; cette
  exception ne permet pas la réécriture générale des migrations publiées ;
- garder la migration et le code consommateur cohérents : schéma, types,
  routes, RPC, UI et tests doivent évoluer ensemble lorsque nécessaire.

## Requêtes et contrats de données

- les changements SQL passent par une migration versionnée ;
- vérifier les erreurs de chaque opération Supabase ;
- régénérer ou réaligner les types lorsqu'un schéma change ;
- avant une requête coûteuse, consulter
  `documentation/database/supabase-table-optimization-playbook.md` ;
- vérifier les permissions pour les chemins propriétaire/non-propriétaire,
  connecté/anonyme et privilégié.

## Sécurité des changements SQL

Toute création ou modification d'une table exposée doit auditer :

- RLS et policies ;
- grants, ownership et rôles appelants ;
- `search_path` ;
- `SECURITY DEFINER` / `SECURITY INVOKER` ;
- contrats RPC, fonctions, triggers et vues concernés.

Ne jamais désactiver RLS pour débloquer un flux. Ne jamais introduire
`service_role` côté client ; ce secret reste réservé aux opérations serveur
autorisées.

## Contrat des migrations SQL non triviales

Pour toute migration qui introduit une RPC, un trigger, une fonction
`SECURITY DEFINER` ou une mutation métier non triviale, rendre vérifiables dans
le SQL ou un commentaire court :

```text
PURPOSE
CALLER
AUTHORIZATION_BOUNDARY
IDEMPOTENCY
ATOMICITY
FAILURE_BEHAVIOR
SEARCH_PATH
GRANTS
```

Une fonction `SECURITY DEFINER` doit permettre d'identifier rapidement qui peut
l'appeler, pourquoi ce mode est nécessaire, son `search_path` et les tables ou
capacités qu'elle expose. Le test d'une migration par lecture de texte ou
regex est un `STATIC_CONTRACT` ; il ne prouve ni atomicité réelle, ni
idempotence, ni contraintes, triggers, RLS ou résultat RPC. Lorsqu'un
`EXECUTED_DB_CONTRACT` n'est pas disponible dans l'environnement supporté,
rapporter `DB_SEMANTICS_NOT_EXECUTED` plutôt que d'assimiler le test statique à
une preuve SQL exécutée.

## Validation Supabase ciblée

Avant de clôturer un changement de migration ou de contrat SQL :

```bash
npm run audit:supabase-migration-trees
npm run test:security -w apps/web
npm run typecheck -w apps/web
```

Ajouter les tests de contrat SQL/RPC directement concernés. Toute application
distante d'une migration reste une opération explicitement autorisée et
distincte de la validation locale.

## Workflow distant lié et diagnostic d'accès

### Contrat Codex d'accès et d'audit

1. `CLI_AUTH` vaut `PASS` dès qu'une commande authentifiée prouve l'accès,
   même si `SUPABASE_ACCESS_TOKEN` est absent de l'environnement. Une commande
   `projects list` terminée avec le code 0 ne suffit pas : le projet cible doit
   être explicitement visible dans sa sortie. Rapporter séparément :

   ```text
   CLI_AUTH_SOURCE = ENV_SECRET | NATIVE_CREDENTIAL_STORE | FALLBACK_FILE | UNKNOWN
   ```
2. Un audit Advisors exhaustif utilise MCP security + performance, ou le CLI
   avec `--level info --fail-on none --output-format json`. La sortie CLI par
   défaut n'est jamais considérée comme un inventaire complet.
3. Tout `supabase/` racine non suivi doit être investigué et ne doit jamais
   être committé. L'unique arbre canonique reste `apps/web/supabase/`.

L'authentification CLI et l'authentification plugin/MCP sont indépendantes :

```text
CLI             → session CLI sécurisée ou scoped PAT / SUPABASE_ACCESS_TOKEN
Plugin/MCP      → authentification propre à l'intégration
CLI credentials ≠ MCP credentials
```

`CLI_AUTH=PASS` est une preuve d'accès CLI lorsqu'une commande authentifiée,
par exemple `projects list`, réussit ; l'absence de
`SUPABASE_ACCESS_TOKEN` dans l'environnement ne l'annule pas. Toujours
rapporter `CLI_AUTH_SOURCE` séparément. Un échec CLI avec un MCP fonctionnel
est `CLI_AUTH_BLOCKED`; l'inverse est `MCP_AUTH_BLOCKED`.

Le CLI Supabase est le canal canonique des migrations suivies par Git : les
migrations versionnées vivent exclusivement sous
`apps/web/supabase/migrations/`, puis sont contrôlées avec l'historique
local/distant, la cible liée et `db push --dry-run` avant toute application
explicitement autorisée. Le plugin/MCP reste en lecture seule par défaut pour
l'observation structurée ; ne pas utiliser `apply_migration`, une commande DDL
MCP, `execute_sql` mutatif ou un autre outil MCP comme substitut du CLI.

Le workflow local supporté utilise `npx supabase` contre le projet distant
explicitement lié. Depuis `apps/web`, les contrôles read-only de base sont :

```bash
npx supabase projects list
npx supabase branches list --project-ref <project-ref> --output json
npx supabase migration list --linked
npx supabase db push --dry-run
```

`db push --dry-run` ne mute rien et ne prouve jamais qu'un vrai `db push` a
été exécuté. Un vrai `npx supabase db push` reste une mutation distante et
exige une autorisation explicite.

Le plugin/MCP est le canal privilégié pour l'observation distante structurée :
projet, branches, historique, schéma, logs et advisors. Pour un inventaire
Advisors exhaustif, récupérer séparément `security` et `performance`, avec les
niveaux `ERROR`, `WARN` et `INFO`, via MCP ou avec le fallback CLI explicite :

```bash
npx supabase db advisors --linked --type security --level info --fail-on none --output-format json
npx supabase db advisors --linked --type performance --level info --fail-on none --output-format json
```

La sortie CLI par défaut n'est jamais considérée comme un inventaire complet.
Lorsque disponibles, conserver au minimum `name`, `level`, `title`, `detail`,
`metadata`, `remediation` et `observed_at`. Les nombres de findings restent un
état runtime mutable et ne sont pas un contrat.

Le script `apps/web/scripts/supabase-security-advisors.mjs` reste le garde
contractuel de sécurité/RLS du dépôt ; il ne devient pas un inventaire général.
Le garde CLI et l'inventaire MCP sont rapportés séparément.

### Supabase Log Query

Les requêtes de logs Supabase sont une ressource facturée et soumise à quota.
Par défaut :

```text
SUPABASE_LOG_QUERY_MODE = FORBIDDEN_UNLESS_NEEDED
```

Les opérations suivantes ne justifient jamais à elles seules une lecture des
logs :

- inventaire des migrations ;
- dry-run de migration ;
- Advisors security/performance ;
- inspection du schéma ;
- tests locaux ;
- diagnostic GitHub Actions lorsqu'un log GitHub suffit.

Préférer respectivement la CLI Supabase, le plugin Supabase structuré et les
logs GitHub Actions. L'outil MCP `query_logs`, le Logs Explorer Supabase et
toute Management API de logs sont des opérations coûteuses en quota.

Ne jamais sonder ou poller les logs en boucle, lancer plusieurs recherches
exploratoires larges, commencer par une fenêtre de 24 h, interroger toutes les
sources sans justification ou répéter une requête identique sans avoir analysé
son résultat. La première requête autorisée, uniquement lorsque les logs sont
réellement nécessaires, respecte :

```text
TIME_WINDOW <= 5 minutes
SOURCE = une seule source pertinente
FIELDS = champs strictement nécessaires
FILTER = erreur/request id/status/endpoint connu si disponible
QUERY_COUNT = 1
```

Si le signal est absent, élargir progressivement de 5 min à 15 min puis 1 h,
jamais directement à 24 h. Au-delà de 15 minutes, de plusieurs sources ou de
plus de deux requêtes de logs dans le même diagnostic, STOP et demander une
autorisation explicite à l'utilisateur. `LIMIT` ne constitue pas un budget de
scan suffisant.

Après avoir trouvé un timestamp, un request id, un SQLSTATE ou une autre ancre,
réutiliser cette ancre et interroger uniquement la source adjacente nécessaire.
Ne pas rescanner toute la période. Les logs Supabase ne sont jamais un
mécanisme de monitoring continu.

Toute utilisation de logs Supabase rapporte :

```text
SUPABASE_LOG_QUERY_USED: yes/no
SOURCE:
TIME_RANGE:
QUERY_COUNT:
REASON:
```

`npx supabase link --project-ref <project-ref>` enregistre la cible locale ;
il ne prouve pas qu'une migration est appliquée sur le projet distant. La
preuve d'alignement de l'historique repose sur
`npx supabase migration list --linked`, après vérification de la paire
`local`/`remote`.

En cas de `403`, diagnostiquer l'accès dans cet ordre :

1. vérifier la commande authentifiée et rapporter sa source dans
   `CLI_AUTH_SOURCE` ;
2. vérifier l'identité utilisée par le CLI avec `npx supabase projects list` ;
3. confirmer que le projet et son organisation sont visibles, puis relancer le
   contrôle concerné.

Si le projet n'est pas visible, classer l'incident comme un mauvais compte,
une mauvaise organisation, une permission insuffisante ou un scoped PAT sans
la capacité requise. Les advisors demandent `Advisors Read`; la lecture des
logs demande `Logs Read`; l'application de migrations demande
`Migrations Read-write`. Un rôle Owner/Admin n'est pas intrinsèquement requis
si le scoped PAT possède les permissions minimales nécessaires.

Le scoped PAT ne doit jamais être stocké dans le dépôt ni documenté avec sa
valeur. `SUPABASE_ACCESS_TOKEN` reste un secret de tooling CLI uniquement,
jamais `NEXT_PUBLIC_*` et jamais une variable du runtime applicatif. Il peut
provenir du stockage sécurisé de `supabase login` ou d'un secret store dédié.

`npx supabase db push`, `npx supabase migration repair` et
`npx supabase db reset` ne sont pas des remèdes à un problème d'authentification
ou de scope. Ils sont soit mutatifs, soit réservés au replay CI explicitement
autorisé, et ne doivent pas être utilisés pour contourner un `403`.

Avant un vrai `db push`, lorsque CLI et MCP sont disponibles, comparer la
cible projet, le dernier historique distant, les advisors BEFORE et le
`db push --dry-run`. Un état incompatible est
`SUPABASE_STATE_DIVERGENCE` et bloque la mutation. Pour un lot SQL autorisé,
rapporter séparément les advisors `SECURITY_ADVISORS_BEFORE/AFTER` et
`PERFORMANCE_ADVISORS_BEFORE/AFTER`, ainsi que `NEW_FINDINGS`,
`RESOLVED_FINDINGS` et `UNCHANGED_FINDINGS`. Un nouvel `ERROR` ou `WARN` causé
par le lot bloque la clôture sauf décision explicite.

Un statut de branche `MIGRATIONS_FAILED` est un signal à confronter à
`migration list`, l'état réel du projet, les logs et le dry-run courant ; il ne
justifie pas à lui seul un `repair`, un reset ou un push.

## Runtime local non supporté

- Docker, WSL, Supabase local et les autres runtimes de conteneurs ne font plus
  partie de l'environnement de développement et de validation locale supporté
  sur le poste utilisateur.
- Ne jamais demander à Codex d'installer, démarrer, sonder ou arrêter Docker,
  WSL, un daemon ou un runtime de conteneurs localement.
- Cette règle n'interdit pas un runtime de conteneurs fourni par un runner CI
  hébergé et éphémère, exclusivement dans une CI explicitement dédiée au replay
  Supabase.
- `supabase start`, `supabase status` et `supabase db reset` sont exclus du
  workflow local CURRENT. Ils peuvent uniquement être utilisés dans une CI
  hébergée et éphémère explicitement dédiée au replay Supabase.
- Toute opération locale qui exige réellement un runtime conteneurisé est
  classée `UNSUPPORTED_CONTAINER_RUNTIME` ; ne pas demander l'installation
  d'un runtime en guise de fallback.
- Les opérations Supabase courantes utilisent `npx supabase` contre le projet
  distant explicitement lié. Les commandes distantes en lecture, dont les
  advisors avec `--linked`, restent autorisées ; toute mutation distante reste
  explicite et séparée.
- `apps/web/supabase/config.toml` et l'arbre des migrations restent canoniques.
  Leur conservation ne constitue pas un support du runtime Supabase local.
