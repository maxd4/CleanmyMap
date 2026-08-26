# Rate limiting - CleanMyMap

Ce document décrit uniquement la protection effectivement présente dans le
runtime actuel. Le store local n'est pas une protection anti-bot, un quota
global ou une garantie multi-instance de production.

## Identité et portée

Les helpers de `src/lib/rate-limit/` résolvent une identité à partir de la
requête serveur reçue :

- requête authentifiée : `authenticated:<Clerk userId>` issu du contexte Clerk
  serveur ; le header client `x-user-id` est ignoré ;
- requête anonyme : `anonymous:<IP>` issu de `request.ip` lorsqu'il est fourni
  par la plateforme, puis de `x-vercel-forwarded-for` ou `x-real-ip` ;
  `x-forwarded-for` n'est pas considéré comme une preuve fiable ;
- développement local : le bypass Clerk existant peut fournir l'identité
  locale configurée, uniquement lorsque `NODE_ENV=development` et que son
  contrat d'hôte/environnement est respecté. Il est désactivé en production.

La clé complète inclut la méthode HTTP et le pathname :

```text
ratelimit:<METHOD>:<pathname>:<authenticated:userId|anonymous:ip>
```

Aucune clé arbitraire fournie par le client n'est acceptée par
`verifyRateLimit()`. Les valeurs comme un email ou un identifiant de payload
ne peuvent donc pas remplacer l'identité de la requête.

Lorsque Upstash est configuré, `verifyRateLimit()` utilise le client partagé de
`src/lib/services/upstash.ts` et un sliding window distribué. La clé complète
inclut la méthode, le pathname et l'identité ; elle est donc commune aux
instances qui parlent au même Redis.

Le `Map` de `src/lib/rate-limit/store.ts` est local au processus et nettoyé
périodiquement. Il n'est utilisé qu'en fallback immédiat si Upstash n'est pas
configuré ou devient indisponible. Il reste best-effort, non distribué et ne
doit pas être présenté comme une garantie de production multi-instance. Une
panne Upstash ne transforme pas la requête en erreur applicative : elle est
journalisée sans secret puis bascule sur ce store local.

## Classification méthode + route

`getRateLimitConfig(pathname, method)` applique les priorités suivantes :

1. routes auth/sign-in/login : profil `auth` ;
2. routes AI, vision et recommendation : profil `ai` ;
3. `POST`, `PUT`, `PATCH`, `DELETE` : profil `write` ;
4. `GET`, `HEAD` : profil `read` ;
5. autres routes `/api/` : profil `api` ;
6. autres chemins : profil `default`.

Les limites par défaut sont :

| Profil | Limite | Fenêtre | Stratégie |
|---|---:|---:|---|
| `default` | 100 | 60 s | sliding window |
| `auth` | 10 | 60 s | sliding window |
| `api` | 50 | 60 s | token bucket |
| `read` | 50 | 60 s | token bucket |
| `ai` | 20 | 60 s | sliding window |
| `write` | 10 | 60 s | sliding window |

La réponse de dépassement contient HTTP `429`, le code
`RATE_LIMIT_EXCEEDED`, un header `Retry-After` en secondes et, lorsque le
résultat du helper est disponible, les headers `X-RateLimit-Limit`,
`X-RateLimit-Remaining` et `X-RateLimit-Reset`.

## Couche BotID anti-automation

Vercel BotID Basic protège les POST effectivement déclenchés par les appels
navigateur CleanMyMap. `initBotId()` est initialisé dans
`apps/web/instrumentation-client.ts`, et `checkBotId()` est appelé au début de
chaque handler serveur concerné, avant `request.json()`, Clerk, Supabase,
Resend, l'IA ou les autres traitements métier.

Les routes protégées sont :

- `/api/chat` ;
- `/api/contact` ;
- `/api/newsletter/subscribe` ;
- `/api/community/bug-reports` ;
- `/api/community/promotion-requests` ;
- `/api/partners/onboarding-requests` ;
- `/api/gamification/quiz/pedagogical-metrics` ;
- `/api/actions` ;
- `/api/community/events`.

Un bot détecté reçoit la réponse stable HTTP `403` avec le code
`BOT_DETECTED`. L'ordre d'exécution est `BotID → rate-limit Upstash (ou
fallback local) → logique métier` : un rejet BotID ne déclenche pas Redis et
un rejet `429` ne déclenche aucun service métier. BotID est un filtre
anti-automation navigateur, pas un quota distribué.

L'audit des appelants du dépôt ne trouve pas de webhook, script de
maintenance ou client machine pour ces neuf POST. Les chemins voisins
`/api/community/events/ops` et `/api/actions/map` ne sont pas déclarés dans la
configuration BotID : ils restent hors de cette protection navigateur et ne
sont pas concernés par ce lot.

## Routes réellement protégées par `verifyRateLimit()`

Ces appels sont présents dans les handlers suivants. Les limites indiquées
sont les options explicitement passées au helper :

| Route | Méthode | Limite | Fenêtre |
|---|---|---:|---:|
| `/api/actions` | `POST` | 10 | 60 s |
| `/api/chat` | `POST` | 20 | 60 s |
| `/api/community/bug-reports` | `POST` | 4 | 300 s |
| `/api/community/events` | `POST` | 6 | 60 s |
| `/api/community/promotion-requests` | `POST` | 3 | 300 s |
| `/api/contact` | `POST` | 3 | 300 s |
| `/api/gamification/quiz/pedagogical-metrics` | `POST` | 10 | 60 s |
| `/api/newsletter/subscribe` | `POST` | 5 | 60 s |
| `/api/partners/onboarding-requests` | `POST` | 3 | 300 s |

Les `GET` de `/api/chat` et `/api/community/events` ne passent pas par
`verifyRateLimit()` dans le code actuel. Certaines routes disposent par
ailleurs de contrôles métier distincts, notamment le quota Supabase des
discussions ; ces contrôles ne sont pas le store rate-limit local décrit ici.

## Middleware et wrappers

`rateLimitMiddleware()`, `withRateLimit()`, `withApiRateLimit()` et
`createRateLimitedHandler()` transmettent explicitement `request.method` et
`request.nextUrl.pathname`. Ils restent des capacités réutilisables, mais
aucun usage runtime de ces wrappers n'a été trouvé dans les routes actuelles et
le `proxy.ts` ne les installe pas.

Le `proxy.ts` actuel assure le contexte Clerk, les protections de pages et les
headers SEO. Il ne fournit pas une limite mémoire globale sur toutes les
requêtes `/api/`.

## Formulaires et contrôles complémentaires

Les formulaires publics concernés conservent leurs contrôles `honeypot` et
`submittedAt` :

- `/api/contact` ;
- `/api/newsletter/subscribe` ;
- `/api/community/bug-reports` ;
- `/api/partners/onboarding-requests`.

Ces contrôles complètent le rate-limit Upstash et son fallback local ; ils ne
remplacent ni BotID ni le quota métier pédagogique.

## Limites de production et prochain lot

BotID Basic fournit une protection anti-automation des flux navigateur.
Upstash est le rate-limit distribué principal avec sliding window ; le `Map`
reste uniquement son fallback local best-effort. Vercel DDoS est une couche
plateforme séparée et n'est pas confondue avec ce contrôle applicatif. Ce lot
ne clôt pas pour autant la protection anti-bot/quota production globale : les
limites métier spécialisées et les contrôles de capacité restent distincts.
