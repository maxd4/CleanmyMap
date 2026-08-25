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

Le `Map` de `src/lib/rate-limit/store.ts` est local au processus et nettoyé
périodiquement. En production, chaque instance possède son propre compteur :
une requête peut donc être répartie entre plusieurs instances sans compteur
global partagé. Le repository n'utilise pas Redis, Upstash, Supabase ou un
autre store distribué pour ce contrôle.

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

La réponse de dépassement des wrappers contient HTTP `429`, le code
`RATE_LIMIT_EXCEEDED` et un header `Retry-After` en secondes.

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

Ces contrôles complètent le rate-limit local et ne le rendent pas distribué.

## Limites de production et prochain lot

Ce lot ne clôt pas la protection anti-bot ou quota production. Le prochain lot
doit placer une défense adaptée avant les fonctions coûteuses et les appels
Supabase, par exemple Vercel BotID/edge et/ou un limiteur distribué approprié
aux routes concernées. Aucune de ces protections futures n'est considérée
comme active dans le présent document.
