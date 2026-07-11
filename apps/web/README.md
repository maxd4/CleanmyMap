# CleanMyMap Web — Backend et exploitation

## Pré-requis

- Node.js 20+ ;
- npm ;
- Supabase CLI via `npx supabase` ;
- Vercel CLI si nécessaire ;
- `apps/web/.env.local` copié depuis `.env.local.example`.

Il n'existe pas de second template `.env.example` nécessaire : `.env.local.example` est le modèle local canonique.

## Stack

Lire les versions exactes dans `apps/web/package.json`.

Repères :

- Next.js 16 App Router ;
- React 19 ;
- TypeScript 6 ;
- Clerk ;
- Supabase ;
- Vercel.

## Variables d'environnement

Les variables `NEXT_PUBLIC_*` sont exposables au navigateur.

Les autres restent côté serveur.

### Cœur

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Selon le mode Clerk/Supabase :

```txt
NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE
CLERK_DOMAIN
NEXT_PUBLIC_CLERK_PROXY_URL
```

Ne jamais exposer :

```txt
SUPABASE_SERVICE_ROLE_KEY
CLERK_SECRET_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Développement local

```bash
cp apps/web/.env.local.example apps/web/.env.local
npm run dev
```

Le bypass d'auth local est réservé au développement.

Exemple :

```txt
CMM_DEV_AUTH_BYPASS=1
CMM_DEV_AUTH_BYPASS_ROLE=max
```

Il doit rester inactif en production par construction.

## Supabase

Le workspace Supabase actif est :

```txt
apps/web/supabase/
```

Commande :

```bash
npm run backend:supabase:push -w apps/web
```

Un second arbre de migrations existe encore à la racine. Avant suppression ou déplacement, suivre :

```txt
documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md
```

Ne jamais modifier un seul arbre de migration sans vérifier la stratégie courante.

## Bootstrap backend

Depuis `apps/web` :

```bash
npm run backend:bootstrap
```

Ce flux peut :

1. vérifier le lien Vercel ;
2. pousser les migrations ;
3. synchroniser les variables autorisées.

Ne pas pousser automatiquement une variable de test sensible vers la production.

## Diagnostics

```txt
GET /api/health
GET /api/uptime
GET /api/services
```

- `/api/health` : état minimal du backend ;
- `/api/uptime` : état critique et optionnel ;
- `/api/services` : état des services.

## Email

La surface de test privilégiée est :

```txt
POST /api/email/test
```

Elle requiert un accès admin.

La route historique :

```txt
POST /api/send
```

peut rester pour compatibilité locale, mais son éventuel token de test ne doit jamais contourner l'admin en production.

Configuration :

```txt
RESEND_API_KEY
EMAIL_FROM
CONTACT_EMAIL
NEXT_PUBLIC_CONTACT_EMAIL
```

Aliases legacy acceptés si le code les supporte :

```txt
RESEND_FROM_EMAIL
RESEND_REPLY_TO
```

## Google Sheets

Le Google Sheet n'est plus la source de vérité principale.

Ne pas réactiver un ancien flux d'import sans vérifier :

- contrat actions ;
- provenance ;
- déduplication ;
- statut ;
- géométrie ;
- qualité.

## Sauvegarde et rétention

Commandes existantes :

```bash
npm run data:archive:supabase -w apps/web
npm run data:cleanup:supabase -w apps/web
```

Avant toute suppression distante :

- vérifier archive ;
- vérifier période ;
- vérifier tables ;
- vérifier Storage ;
- vérifier quota.

## Build

```bash
npm run typecheck
npm run test:regression-gates
npm run build
```

En cas de cache incohérent :

```bash
npm run build:clean -w apps/web
```

Ne jamais fabriquer manuellement un fichier interne `.next`.

## Validation globale

Depuis la racine :

```bash
npm run checks
```

## Localité des données

Pour les données liées à la France ou l'UE, privilégier lorsque possible les tenants et régions UE.

Le projet documente actuellement Vercel Functions en `cdg1`.

## Sécurité opérationnelle

- Clerk pour l'identité ;
- AuthZ serveur ;
- RLS Supabase ;
- séparation client anon / serveur service role ;
- entrées validées ;
- secrets hors Git ;
- audit secrets dans la CI ;
- erreurs traitées explicitement.

Références :

```txt
documentation/security/README.md
documentation/architecture/data-governance.md
documentation/development/TESTING.md
```
