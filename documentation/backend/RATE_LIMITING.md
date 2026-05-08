# Rate Limiting - CleanMyMap

Ce document reflète les limites effectivement appliquées dans le repo au `proxy.ts`, dans `src/lib/rate-limit/*` et dans les routes sensibles.

## 1. Limites Edge / Proxy

Le proxy applique un contrôle en mémoire sur les requêtes `POST /api/*`.

### Limite générique

- `30 requêtes / 60s` par IP

### Limites spécifiques

| Route | Limite | Fenêtre |
|---|---:|---:|
| `/api/newsletter/subscribe` | 5 | 60s |
| `/api/actions/simple` | 4 | 300s |
| `/api/analytics/funnel` | 20 | 60s |
| `/api/community/bug-reports` | 6 | 60s |
| `/api/community/events` | 8 | 60s |
| `/api/community/promotion-requests` | 3 | 300s |
| `/api/partners/onboarding-requests` | 3 | 300s |
| `/api/chat` | 20 | 60s |

Le proxy renvoie une réponse 429 homogène via les helpers de `src/lib/security/validation.ts`.

## 2. Limites serveur réutilisables

`src/lib/rate-limit/types.ts` définit les valeurs par défaut utilisées par `verifyRateLimit()`.

| Profil | Limite | Fenêtre |
|---|---:|---:|
| `default` | 100 | 60s |
| `auth` | 10 | 60s |
| `api` | 50 | 60s |
| `ai` | 20 | 60s |
| `write` | 10 | 60s |

Ces valeurs sont consommées par:

- `src/lib/rate-limit/server.ts`
- `src/lib/rate-limit/middleware.ts`
- les handlers qui appellent `verifyRateLimit()`

## 3. Formulaires publics et anti-spam

Les formulaires publics utilisent deux garde-fous:

- `honeypot`
- `submittedAt` avec délai minimal

Les routes concernées doivent garder une réponse 429 homogène:

- `src/app/api/newsletter/subscribe/route.ts`
- `src/app/api/actions/simple/route.ts`
- `src/app/api/community/promotion-requests/route.ts`
- `src/app/api/partners/onboarding-requests/route.ts`
- `src/app/api/community/bug-reports/route.ts`

## 4. Quotas discussion

Les canaux discussion utilisent `reserve_community_message_slot` côté Supabase.

Comportement observé:

- `cooldown` avec `retryAfterSeconds`
- `daily_limit`
- réponse 429 homogène avec `error`, `kind`, `status`, `code`

Routes concernées:

- `src/app/api/community/events/route.ts`
- `src/app/api/community/bug-reports/route.ts`
- `src/app/api/chat/route.ts`

## 5. Vérifications à faire avant merge

- La limite d'une route ajoutée ou modifiée est documentée ici.
- Les réponses 429 restent homogènes.
- Les garde-fous anti-spam sont couverts par des tests.
- Les limites sensibles ne changent pas sans mise à jour de la documentation et des tests.

## 6. Notes d'implémentation

- Le store en mémoire du proxy reste local à l'instance.
- Le repo ne dépend d'aucun nouveau fournisseur externe pour ce contrôle.
- Les routes écrites doivent préférer `verifyRateLimit()` ou un helper explicite plutôt qu'une logique inline dupliquée.
