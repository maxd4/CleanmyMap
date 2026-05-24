# Services Web Stack

Ce document explique les services externes réellement utilisés par `apps/web`, comment ils s'activent, et où lire les diagnostics.

## Vue d'ensemble

Les services sont pilotés par la configuration d'environnement et par quelques garde-fous applicatifs:

- Supabase gère la base de données, l'auth côté serveur et le stockage.
- Clerk gère l'identité utilisateur et les sessions front-end.
- PostHog gère l'analytics produit avec consentement.
- Sentry gère la remontée d'erreurs techniques.
- Resend gère les emails transactionnels.
- Stripe gère les paiements et webhooks.
- Upstash gère Redis et QStash.
- Pinecone sert la recherche sémantique / IA.
- Vercel héberge l'application, les cron jobs et les previews.
- Cloudflare et Uptime Robot sont des dépendances externes de supervision/routage.

## Statut réel observé

Les vérifications lancées pendant cette passe ont confirmé:

- `npm run backend:doctor` retourne `vercelLinked=true`, `supabaseLinked=true`, `localEnvHasRequired=true`, `pulledVercelEnvHasRequired=true`.
- `npm run test -w apps/web` sur la suite ciblée `services`, `sentry`, `posthog` passe.
- Les logs Supabase accessibles montrent des appels répétés et réussis vers `actions` et `spots`.
- Les logs PostgreSQL Supabase montrent des connexions autorisées par PostgREST en TLS.

## Références de logs récupérées

- Supabase API: requêtes `HEAD /rest/v1/actions?select=id&limit=1` et `GET /rest/v1/actions`, `GET /rest/v1/spots` avec statuts `206` et `200`.
- Supabase PostgreSQL: connexions `connection authorized` et `connection authenticated` via `postgrest`, utilisateur `authenticator`, TLS actif.
- `backend:doctor`: Vercel et Supabase sont liés et les variables locales / Vercel pullées sont présentes.

La récupération des logs `auth` Supabase a demandé une réauthentification de l'app MCP dans cette session; ils n'ont donc pas pu être lus ici.

## Comment chaque service fonctionne

### Supabase

Rôle:

- base de données principale;
- accès RLS via client anon;
- accès serveur via `SUPABASE_SERVICE_ROLE_KEY`;
- stockage et quotas via les helpers `storage-*`.

Activation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Code clé:

- [apps/web/src/lib/supabase/server.ts](../../apps/web/src/lib/supabase/server.ts)
- [apps/web/src/lib/supabase/client.ts](../../apps/web/src/lib/supabase/client.ts)
- [apps/web/src/lib/supabase/clerk-rls.ts](../../apps/web/src/lib/supabase/clerk-rls.ts)

Logs:

- Supabase API
- Supabase Postgres
- Supabase Storage
- Supabase Auth

### Clerk

Rôle:

- authentification front-end;
- session utilisateur;
- gating des routes privées;
- synchronisation des profils.

Activation:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- éventuels réglages de domaine et d'utilisateurs admin.

Code clé:

- [apps/web/src/components/auth/clerk-localization-provider.tsx](../../apps/web/src/components/auth/clerk-localization-provider.tsx)
- [apps/web/src/lib/clerk-session-config.ts](../../apps/web/src/lib/clerk-session-config.ts)
- [apps/web/src/proxy.ts](../../apps/web/src/proxy.ts)

Logs:

- route `GET /api/health`
- route `GET /api/services`
- proxy server logs sur Vercel

Statut observé au moment de cette passe:

- `GET /api/uptime` remonte `clerk_keys: warning` si les clés Clerk en prod sont encore des clés test.
- le proxy Vercel renvoie des headers `x-clerk-auth-status` et `x-clerk-auth-reason` utiles pour distinguer un vrai refus d'une session absente en navigateur.

### PostHog

Rôle:

- analytics produit;
- suivi des événements et page views;
- host EU/US selon la région du projet.

Activation:

- `NEXT_PUBLIC_POSTHOG_KEY` recommandé
- `NEXT_PUBLIC_POSTHOG_TOKEN` encore accepté mais déprécié
- `NEXT_PUBLIC_POSTHOG_HOST` ou `NEXT_PUBLIC_POSTHOG_REGION`
- consentement analytics côté client

Code clé:

- [apps/web/src/lib/posthog/config.ts](../../apps/web/src/lib/posthog/config.ts)
- [apps/web/src/lib/posthog/client.ts](../../apps/web/src/lib/posthog/client.ts)
- [apps/web/src/lib/posthog/server.ts](../../apps/web/src/lib/posthog/server.ts)
- [apps/web/src/components/ui/conditional-analytics.tsx](../../apps/web/src/components/ui/conditional-analytics.tsx)

Logs:

- console navigateur
- événements PostHog Live Events

### Sentry

Rôle:

- capture des exceptions runtime;
- contexte technique sur les erreurs API;
- support des source maps via upload post-build quand la configuration est complète.

Activation:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` pour l'upload des source maps
- `SENTRY_RELEASE` optionnel, sinon le commit SHA Vercel est utilisé

Code clé:

- [apps/web/src/lib/observability/sentry.ts](../../apps/web/src/lib/observability/sentry.ts)
- [apps/web/src/app/error.tsx](../../apps/web/src/app/error.tsx)
- [apps/web/src/lib/http/api-errors.ts](../../apps/web/src/lib/http/api-errors.ts)
- [apps/web/next.config.ts](../../apps/web/next.config.ts)

Logs:

- console serveur
- issues Sentry

Statut observé au moment de cette passe:

- le runtime Sentry reste actif dès que `NEXT_PUBLIC_SENTRY_DSN` est configuré;
- l'upload des source maps est désormais géré après `next build` via `sentry-cli` avec injection des debug IDs, ce qui évite de faire dépendre la build du plugin Sentry et de ses dépendances natives;
- si `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` ou `SENTRY_PROJECT` manquent, l'upload est sauté sans bloquer le runtime.

### Resend

Rôle:

- emails transactionnels;
- fallback loggable quand la clé n'est pas configurée.

Activation:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CONTACT_EMAIL`
- éventuellement `RESEND_FROM_EMAIL` et `RESEND_REPLY_TO` pour compatibilité.

Code clé:

- [apps/web/src/lib/services/resend.ts](../../apps/web/src/lib/services/resend.ts)
- [apps/web/src/lib/services/email.ts](../../apps/web/src/lib/services/email.ts)
- [apps/web/src/lib/email-config.ts](../../apps/web/src/lib/email-config.ts)

Logs:

- console serveur lors des envois ou du fallback
- web dashboard Resend

Statut observé au moment de cette passe:

- les routes de test `/api/send` et `/api/email/test` renvoient `200 queued` quand `RESEND_API_KEY`, `EMAIL_FROM` et `CONTACT_EMAIL` sont présents.
- quand la configuration manque, les routes renvoient `503 Resend not configured`.
- les erreurs d'envoi sont journalisées côté serveur avec les préfixes `[Resend test]` et `[Email Service]`.

### Stripe

Rôle:

- paiements;
- webhooks.

Activation:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Code clé:

- [apps/web/src/lib/services/stripe.ts](../../apps/web/src/lib/services/stripe.ts)
- [apps/web/src/app/api/stripe/webhook/route.ts](../../apps/web/src/app/api/stripe/webhook/route.ts)

Logs:

- Stripe Dashboard
- logs de webhooks

Statut observé au moment de cette passe:

- `POST /api/stripe/webhook` renvoie `503` si `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` manque.
- `GET /api/stripe/webhook` n'est pas supporté et retourne `405 Method Not Allowed`, ce qui est normal pour un webhook.
- les signatures invalides sont journalisées avec le préfixe `[Stripe Webhook]`.

### Upstash

Rôle:

- Redis pour le cache et les flux asynchrones;
- QStash pour les jobs et messages programmés.

Activation:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`

Code clé:

- [apps/web/src/lib/services/upstash.ts](../../apps/web/src/lib/services/upstash.ts)

Logs:

- console serveur
- tableaux de bord Upstash

### Pinecone

Rôle:

- index sémantique pour les fonctions IA.

Activation:

- `PINECONE_API_KEY`

Code clé:

- [apps/web/src/lib/services/pinecone.ts](../../apps/web/src/lib/services/pinecone.ts)

Logs:

- dashboard Pinecone
- console serveur

### Vercel

Rôle:

- hébergement;
- previews;
- cron jobs;
- analytics de plateforme.

Activation:

- projet lié dans `.vercel`
- variables d'environnement syncées
- `apps/web/vercel.json` pour les cron jobs
- fonction Node.js par défaut en région Paris (`cdg1`) pour rapprocher le compute des données et des utilisateurs franciliens.

Code clé:

- [apps/web/vercel.json](../../apps/web/vercel.json)
- [apps/web/src/app/layout.tsx](../../apps/web/src/app/layout.tsx)

Logs:

- `vercel logs`
- dashboard Vercel
- `npm run backend:doctor`

Région:

- la configuration projet et le déploiement doivent rester en `cdg1` sauf exception explicite.
- si une route a des données dépendantes d'une autre géographie, surcharger la région au niveau de cette route plutôt que d'élargir tout le projet.

### Cloudflare et Uptime Robot

Rôle:

- routage/CDN/protection;
- surveillance externe.

Activation:

- `CLOUDFLARE_API_TOKEN`
- `UPTIMEROBOT_API_KEY`

Logs:

- dashboards respectifs
- console serveur si des appels API échouent

## Variables de configuration

Les variables sensibles ne doivent pas être recopiées en dur dans le code.

- les variables publiques commencent par `NEXT_PUBLIC_`;
- les secrets serveur restent hors client;
- le template de référence est [apps/web/.env.example](../../apps/web/.env.example);
- la liste des variables sensibles est maintenue dans [documentation/operations/pre-release-security-check.md](pre-release-security-check.md).

## Diagnostic minimal

Pour vérifier l'état de base du stack:

```bash
npm run backend:doctor
npm run security:secrets
npm run test -w apps/web src/app/api/services/route.test.ts
```

## Lecture rapide

Si un service ne répond plus, commence par:

- vérifier la variable d'environnement correspondante;
- lire `GET /api/health`;
- lire `GET /api/services`;
- consulter le dashboard du service;
- relancer le test ciblé du module associé.
