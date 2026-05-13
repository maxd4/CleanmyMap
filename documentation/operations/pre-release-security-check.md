# Pre-release Security Check

## Objet

Ce document formalise le lot `securite publication` demande dans `documentation/plans/ateliers_DU.md` :

- inventaire des variables sensibles ;
- checks pre-release ;
- verification des variables potentiellement exposees au client.

## Commandes de controle

- Check pre-release bloquant :
  - `npm run pre-release:check`
- Audit secrets complementaire :
  - `npm run security:secrets`
- Suite de tests securite :
  - `npm run test:security`

## Inventaire des variables d'environnement

### Variables publiques attendues cote client

Ces variables sont autorisees cote navigateur et doivent rester prefixees `NEXT_PUBLIC_` :

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_REGION`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENABLED`

### Variables strictement serveur

Ces variables ne doivent jamais etre envoyees au client :

- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PINECONE_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`
- `UPTIMEROBOT_API_KEY`
- `CLOUDFLARE_API_TOKEN`

## Controles implementes

### 1. Script pre-release

Le script `scripts/pre-release-check.mjs` verifie :

- la presence de fichiers interdits a la racine (`.env.production`, `service-account.json`, `secrets.json`) ;
- la presence de mots-cles sensibles uniquement dans les fichiers susceptibles d'entrer dans le bundle client (`use client`, pages/layouts/templates client) ;
- l'echec explicite de la commande si `--exit-on-error` est utilise et qu'un probleme est detecte.

### 2. Hygiene des templates et de la gouvernance

Le template de pull request impose deja :

- une revue humaine des sorties IA ;
- un controle du poids numerique ;
- un renvoi vers `documentation/ai-guides/GOVERNANCE.md`.

### 3. Verification des expositions

Source de verite :

- schema env : `apps/web/src/lib/env.ts`

Regle de lecture :

- toute variable `NEXT_PUBLIC_*` est presumee exposable ;
- toute variable non prefixee `NEXT_PUBLIC_*` doit rester en contexte serveur ;
- toute nouvelle cle de secret doit etre ajoutee a cet inventaire et couverte par les checks pre-release si le risque d'exposition cote client est realiste.

## Limites

- le scan repose sur des mots-cles et ne remplace pas un audit de flux complet ;
- il ne detecte pas toutes les fuites indirectes via serialisation, logs ou payloads externes ;
- les endpoints API doivent continuer a etre verifies par tests et revue humaine.

## Suite recommandee

- ajouter un test dedie sur la liste des variables publiques autorisees ;
- brancher `npm run pre-release:check` dans le workflow CI si le bruit est acceptable ;
- etendre l'inventaire aux services operationnels ajoutes apres mai 2026.
