# Contrat de configuration des environnements

Statut : `CURRENT`

Portée : CleanMyMap web, outils opératoires et mobile Expo

Ce document décrit la séparation durable entre les environnements. Il ne
contient aucune valeur réelle, aucun token et aucune clé exploitable.

## Règle canonique

`apps/web/.env.local.example` est le seul template de configuration locale
versionné. Une copie locale peut être créée sous `apps/web/.env.local`, mais ce
fichier reste ignoré par Git et ne doit jamais contenir une clé de Production.

Le contrat applicatif est contrôlé par `npm run check:env-contract`. Le contrôle
compare les noms de variables de :

- `apps/web/.env.local.example` ;
- `apps/web/src/lib/env.ts` ;
- `apps/web/src/types/env.d.ts` ;
- les accès statiques `process.env` sous `apps/web`.

Les variables plateforme (`NODE_ENV`, `CI`, `VERCEL*`, métadonnées de commit) et
les variables de tooling explicitement justifiées sont dans l’allowlist du
check. Une nouvelle exception doit être nommée et justifiée dans
`scripts/checks/check-env-contract.mjs` ; une variable applicative ne doit pas
être ajoutée à cette allowlist pour masquer une divergence.

Le check ne lit ni ne compare les valeurs. Ses erreurs exposent uniquement des
noms de variables.

## Environnements et sources

| Contexte | Source de vérité | Règle d’usage |
|---|---|---|
| Localhost | `apps/web/.env.local.example`, puis fichier local ignoré | Valeurs Clerk `pk_test_*` / `sk_test_*`; jamais de secret Production. `.env.local` est l’unique source runtime locale. |
| Vercel Development | Variables Development du projet Vercel lié | Instance Clerk Development et projet Supabase de développement. Un pull explicite peut alimenter le fichier local, mais ne crée pas une seconde source runtime. |
| Vercel Preview | Variables Preview du projet Vercel, idéalement scoping par branche | Configuration de test/recette isolée; aucune promotion implicite vers Production. |
| Vercel Production | Variables Production du projet Vercel | Source de vérité distante; clés Clerk `live` et secrets de Production. Ne pas reconstruire cet environnement depuis `.env.local`. |
| Tests | Fixtures, mocks et variables injectées par le runner | Pas de lecture implicite de secrets locaux; les tests doivent utiliser des valeurs fictives non sensibles. |
| Expo mobile | Configuration Expo du projet mobile, uniquement variables publiques nécessaires au bundle | Les secrets restent côté API web; aucune clé serveur dans `EXPO_PUBLIC_*`. Le checkout courant ne contient pas de consommateur Expo d’environnement versionné. |

### Localhost humain et Codex

Ces deux usages localhost sont volontairement distincts :

- `HUMAN_LOCAL` : session Clerk réelle, `CMM_DEV_AUTH_BYPASS` absent ou à `0`.
  Aucun rôle privilégié n’est déduit de l’hôte `localhost` et l’absence de
  session reste une absence d’authentification.
- `CODEX` : lanceur local explicite avec `CMM_DEV_AUTH_BYPASS=1` et une
  identité synthétique (`dev-max`, `dev-admin` ou `dev-benevole`). Cette
  identité sert aux validations locales uniquement et ne modifie aucune
  allowlist Clerk ni métadonnée distante.

Changer `CMM_DEV_AUTH_BYPASS_ROLE` à la main ne donne pas de rôle en
Production : le bypass est refusé hors développement.

### Commandes de contrôle

Depuis la racine :

```powershell
npm run check:env-contract
node scripts/checks/check-env-contract.mjs --ref=<commit>
```

Le second mode est celui des contrôles d’un candidat Git : il lit exactement
l’arbre du commit indiqué, sans utiliser les fichiers dirty ou untracked du
checkout.

Pour inspecter un environnement Vercel, utiliser la commande explicitement
scopée à l’environnement visé. Les actions de synchronisation restent
limitées à `development` par défaut; Preview demande une action explicite et
une branche. Production reste distante et ne doit pas être écrasée par une
source locale.

## Matrice des variables

Légende : `R` = requise dans ce contexte, `O` = optionnelle, `—` = non
attendue, `P` = fournie par la plateforme, `L` = locale/outillage uniquement.
`PUBLIC` signifie qu’une exposition côté client est prévue par le nom ou le
service; `SECRET` signifie serveur/CI uniquement. Une variable optionnelle peut
rester vide lorsque la fonctionnalité correspondante n’est pas activée.

| VARIABLE | SERVICE | PUBLIC/SECRET | LOCAL | DEVELOPMENT | PREVIEW | PRODUCTION | SOURCE | CONSOMMATEUR |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Web | PUBLIC | R | R | R | R | Vercel / template local | URLs, Clerk, liens |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | PUBLIC | R | R | R | R | Supabase / Vercel | clients Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | PUBLIC | R | R | R | R | Supabase / Vercel | clients Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | SECRET | R | R | R | R | Supabase / Vercel | stores serveur/admin |
| `SUPABASE_STORAGE_QUOTA_BYTES` | Supabase | SECRET | O | O | O | O | Vercel / template local | quotas stockage |
| `SUPABASE_STORAGE_QUOTA_GB` | Supabase | SECRET | O | O | O | O | Vercel / template local | quotas stockage |
| `SUPABASE_DB_URL` | Supabase CLI | SECRET | L | L | L | — | CLI local/CI | audits et tooling |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI | SECRET | L | L | L | — | CLI local/CI | branches et tooling |
| `POSTGRES_URL_NON_POOLING` | Supabase CLI | SECRET | L | L | L | — | Supabase/CI | audits DB |
| `CLERK_SECRET_KEY` | Clerk | SECRET | R test | R test | R selon preview | R live | Clerk Dashboard / Vercel | AuthN serveur |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | PUBLIC | R test | R test | R selon preview | R live | Clerk Dashboard / Vercel | Clerk frontend |
| `NEXT_PUBLIC_CLERK_PROXY_URL` | Clerk | PUBLIC | O | O | O | O | Vercel / template local | proxy Clerk |
| `NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE` | Clerk/Supabase | PUBLIC | O | O | O | O | Clerk Dashboard / Vercel | JWT Supabase |
| `CLERK_DOMAIN` | Clerk | PUBLIC | O | O | O | O | Clerk Dashboard / Vercel | domaine satellite |
| `CLERK_IS_SATELLITE` | Clerk | CONFIG | O | O | O | O | Vercel / template local | configuration Clerk |
| `CLERK_SATELLITE_AUTO_SYNC` | Clerk | CONFIG | O | O | O | O | Vercel / template local | synchronisation Clerk |
| `CLERK_ALLOWED_PARTIES` | Clerk | CONFIG | O | O | O | O | Clerk Dashboard / Vercel | contrôle d’audience |
| `CLERK_ADMIN_USER_IDS` | Clerk | SECRET | O | O | O | O | Vercel / gestion opérateur | allowlist AuthZ |
| `CLERK_MAX_USER_IDS` | Clerk | SECRET | O | O | O | O | Vercel / gestion opérateur | allowlist AuthZ |
| `CLERK_IMU_OWNER_USER_ID` | Clerk | SECRET | O | R | R | R | Clerk Dashboard / Vercel | owner IMU exact par instance |
| `CLERK_IMU_OWNER_EMAIL` | Clerk | CONFIG | O | R | R | R | Clerk Dashboard / Vercel | email principal owner vérifié |
| `RESEND_API_KEY` | Resend | SECRET | O | O | O | R si email | Resend / Vercel | email serveur |
| `RESEND_FROM_EMAIL` | Resend | CONFIG | O | O | O | O | Resend / Vercel | expéditeur email |
| `RESEND_REPLY_TO` | Resend | CONFIG | O | O | O | O | Resend / Vercel | réponse email |
| `RESEND_TEST_TOKEN` | Resend | SECRET | O | O | O | — | tests/CI | tests email |
| `EMAIL_FROM` | Email | CONFIG | O | O | O | O | Vercel / template local | expéditeur par défaut |
| `CONTACT_EMAIL` | Email | CONFIG | O | O | O | O | Vercel / template local | contact et notifications |
| `CREATOR_INBOX_EMAIL` | Email | CONFIG | O | O | O | O | Vercel / template local | inbox créateur |
| `STRIPE_SECRET_KEY` | Stripe | SECRET | O | O | O | R si Stripe | Stripe / Vercel | paiements serveur |
| `STRIPE_WEBHOOK_SECRET` | Stripe | SECRET | O | O | O | R si webhook | Stripe / Vercel | validation webhook |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | PUBLIC | O | O | O | O | Sentry / Vercel | SDK navigateur |
| `NEXT_PUBLIC_SENTRY_RELEASE` | Sentry | PUBLIC | O | O | O | O | CI/Vercel | release frontend |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Sentry | PUBLIC | O | O | R | R | Vercel | contexte frontend |
| `SENTRY_DSN` | Sentry | CONFIG | O | O | O | O | Sentry / Vercel | SDK serveur |
| `SENTRY_ORG` | Sentry | CONFIG | L | L | L | L | Sentry / CI | upload sourcemaps |
| `SENTRY_PROJECT` | Sentry | CONFIG | L | L | L | L | Sentry / CI | upload sourcemaps |
| `SENTRY_AUTH_TOKEN` | Sentry | SECRET | O | O | O | O | Sentry / CI | upload sourcemaps |
| `SENTRY_RELEASE` | Sentry | CONFIG | O | O | O | O | CI/Vercel | release serveur |
| `SENTRY_ENVIRONMENT` | Sentry | CONFIG | O | O | O | O | Vercel | contexte serveur |
| `SENTRY_CLI_BIN` | Sentry CLI | L | L | L | L | L | poste/CI | override build |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | PUBLIC | O | O | O | O | PostHog / Vercel | analytics navigateur |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | PostHog | PUBLIC | O | O | O | O | PostHog / Vercel | analytics legacy |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | PUBLIC | O | O | O | O | PostHog / Vercel | endpoint analytics |
| `NEXT_PUBLIC_POSTHOG_REGION` | PostHog | PUBLIC | O | O | O | O | PostHog / Vercel | région analytics |
| `UPSTASH_REDIS_REST_URL` | Upstash | PUBLIC | O | O | O | O | Upstash / Vercel | endpoint rate-limit |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | SECRET | O | O | O | O | Upstash / Vercel | rate-limit serveur |
| `PINECONE_API_KEY` | Pinecone | SECRET | O | O | O | O | Pinecone / Vercel | recherche vectorielle |
| `QSTASH_TOKEN` | Upstash QStash | SECRET | O | O | O | O | QStash / Vercel | tâches différées |
| `UPTIMEROBOT_API_KEY` | UptimeRobot | SECRET | O | O | O | O | UptimeRobot / CI | monitoring |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | SECRET | O | O | O | O | Cloudflare / CI | opérations DNS/API |
| `GITHUB_TOKEN` | GitHub | SECRET | L | L | L | — | GitHub Actions | scripts GitHub |
| `GH_TOKEN` | GitHub | SECRET | L | L | L | — | GitHub Actions | fallback CLI |
| `GITHUB_API_TOKEN` | GitHub | SECRET | L | L | L | — | GitHub Actions | API GitHub |
| `CLEANMYMAP_SHEET_URL` | CleanMyMap/Google Sheets | SECRET | O | O | O | O | Vercel / opérateur | import admin |
| `CRON_SECRET` | CleanMyMap | SECRET | O | O | O | R si cron | Vercel | routes cron |
| `IMPORT_DRY_RUN_SECRET` | CleanMyMap | SECRET | O | O | O | O | Vercel / opérateur | preuve import |
| `VISION_TRAINING_ENABLED` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | entraînement vision |
| `NEXT_PUBLIC_ENABLE_SUPABASE_CHAT_REALTIME` | CleanMyMap/Supabase | PUBLIC | O | O | O | O | Vercel / template local | chat realtime |
| `NEXT_PUBLIC_GAMIFICATION_WS` | CleanMyMap | PUBLIC | O | O | O | O | Vercel / template local | WebSocket gamification |
| `ALLOW_LOCAL_FILE_STORE_FALLBACK` | CleanMyMap | CONFIG | O | O | — | — | local/CI | fallback local |
| `ALLOW_LOCAL_ACTION_STORE_IN_PROD` | CleanMyMap | CONFIG | — | — | — | O explicite | opérateur | garde-fou store |
| `CMM_DEV_AUTH_BYPASS` | CleanMyMap | LOCAL | R | — | — | — | `.env.local` | auth dev |
| `CMM_DISABLE_DEV_AUTH_BYPASS` | CleanMyMap | LOCAL | O | — | — | — | `.env.local` | auth dev |
| `CMM_DEV_AUTH_BYPASS_ROLE` | CleanMyMap | LOCAL | O | — | — | — | `.env.local` | identité dev |
| `CMM_DEV_AUTH_BYPASS_DISPLAY_NAME` | CleanMyMap | LOCAL | O | — | — | — | `.env.local` | identité dev |
| `CMM_DEV_AUTH_BYPASS_USERNAME` | CleanMyMap | LOCAL | O | — | — | — | `.env.local` | identité dev |
| `CMM_DEV_AUTH_BYPASS_USER_ID` | CleanMyMap | LOCAL | O | — | — | — | `.env.local` | identité dev |
| `IMPACT_PROXY_VERSION` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | impact proxy |
| `IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | impact proxy |
| `IMPACT_PROXY_CO2_KG_PER_WASTE_KG` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | impact proxy |
| `IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | impact proxy |
| `IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE` | CleanMyMap | CONFIG | O | O | O | O | Vercel / template local | impact proxy |

### Variables plateforme et outillage hors template applicatif

Ces noms peuvent apparaître dans les accès statiques, mais ne sont pas des
variables applicatives à recopier dans `.env.local.example` :

- `NODE_ENV`, `CI`, `PORT` ;
- `VERCEL`, `VERCEL_ENV` et tout nom `VERCEL_*` ;
- `GIT_COMMIT_SHA` ;
- `SENTRY_CLI_BIN` ;
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`,
  `POSTGRES_URL_NON_POOLING` et `DATABASE_URL` pour le tooling.

Leur allowlist et leur justification sont versionnées dans
`scripts/checks/check-env-contract.mjs`. Une variable métier ou une clé de
service ne doit pas être classée plateforme uniquement pour éviter son ajout
au contrat.

## Règles par fournisseur

### Clerk

- Localhost, Development et les Preview de développement utilisent une paire
  issue de la même instance Clerk Development : `pk_test_*` avec `sk_test_*`.
- Production utilise la paire Clerk Production : `pk_live_*` avec `sk_live_*`.
- Une clé `live` ne doit jamais entrer dans `.env.local`, et une clé `test` ne
  doit pas être déployée en Production.
- `CLERK_ADMIN_USER_IDS` et `CLERK_MAX_USER_IDS` restent des listes opératoires
  indépendantes et disjointes, mais aucune liste, métadonnée, email creator ou
  ligne Supabase ne peut accorder IMU. Le rôle `max` exige le couple owner
  exact de l’instance et l’email principal Clerk `verified`. Production et
  Development ont chacun leur propre ID owner.

### Supabase

`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` peuvent être
utilisées par le client selon les protections Supabase prévues. Les accès
serveur utilisent `SUPABASE_SERVICE_ROLE_KEY`, qui reste strictement serveur/CI
et n’entre jamais dans un bundle public. Les variables DB/CLI sont réservées
aux audits et opérations explicitement demandées.

### Resend et Stripe

Les clés Resend et Stripe restent côté serveur. Les webhooks Stripe valident
`STRIPE_WEBHOOK_SECRET`; aucune clé secrète ne doit être copiée dans une
variable `NEXT_PUBLIC_*`. Les valeurs de test sont réservées à Development,
Preview et aux tests isolés.

### Sentry et PostHog

Les DSN, hosts, releases et régions peuvent être des identifiants publics de
collecte. `SENTRY_AUTH_TOKEN` reste secret et sert uniquement à l’upload des
sourcemaps. Les tokens PostHog historiques restent limités à la surface
analytics prévue et ne doivent pas être confondus avec un secret serveur.

### Upstash et Pinecone

Les URLs d’endpoint peuvent être publiques dans la configuration nécessaire au
client, mais les tokens Upstash, QStash et Pinecone restent serveur/CI. Ils
sont configurés séparément pour Development, Preview et Production.

## Tests et Expo mobile

Les tests doivent injecter leurs variables dans le runner ou utiliser des
fixtures. Ils ne doivent pas dépendre de la présence accidentelle d’un
`.env.local` de développeur. Le garde-fou doit pouvoir s’exécuter sans secret
réel.

Le mobile Expo ne partage pas les secrets web. Si une variable est nécessaire
au bundle, elle doit être explicitement `EXPO_PUBLIC_*` et non sensible; toute
opération nécessitant Clerk secret, Supabase service role, Resend, Stripe,
Sentry auth, Upstash ou Pinecone passe par l’API serveur CleanMyMap.

## Procédure d’évolution

Lorsqu’une nouvelle variable est introduite :

1. définir son propriétaire et sa classification public/secret ;
2. l’ajouter à `.env.local.example`, `src/lib/env.ts` et `src/types/env.d.ts`
   si elle est applicative ;
3. documenter son environnement et son consommateur dans la matrice ;
4. ajouter ou adapter un test du garde-fou si une règle nouvelle est créée ;
5. exécuter `npm run check:env-contract` et les tests ciblés ;
6. ne jamais committer `.env.local`, une valeur réelle ou un fichier
   `.env.development`, `.env.preview` ou `.env.production`.

Le check est exécuté comme contrôle global read-only, dans la CI et sur chaque
arbre `PUSH_CANDIDATE` avant les validations dynamiques. Il ne modifie aucun
fichier d’environnement.
