# Méthodologie de fonctionnement du site

Ce document décrit comment CleanMyMap fonctionne d'un point de vue technique et opérationnel. Il sert de fiche de lecture rapide pour comprendre l'architecture, les services connectés et le chemin réel d'une requête utilisateur.

## Périmètre

Le site repose sur `Next.js 15` avec App Router, `TypeScript` et `Tailwind CSS 4`.

Le dépôt est organisé comme un monorepo centré sur `apps/web`, avec :

- les pages dans `apps/web/src/app`;
- les composants réutilisables dans `apps/web/src/components`;
- la logique métier et les services dans `apps/web/src/lib`;
- la documentation dans `documentation/`.

La séparation attendue est simple :

- les pages orchestrent;
- les composants affichent;
- les modules `lib/` calculent et accèdent aux services;
- les routes API servent d'interface serveur.

## Schéma d'ensemble

```mermaid
flowchart TD
  U[Utilisateur] --> N[Navigation web]
  N --> W[Next.js 15 / App Router]
  W --> C[Composants UI]
  W --> A[API Routes]

  A --> S[(Supabase)]
  A --> R[Resend]
  W --> P[PostHog]
  W --> E[Sentry]

  G[GitHub] --> V[Vercel]
  Cx[Codex] --> G
  V --> W
  D[LWS / Domaine] --> V
```

## Architecture applicative

Le front et le back vivent dans la même application Next.js, mais avec des responsabilités séparées :

- les pages et layouts composent l'expérience;
- les composants client restent aussi légers que possible;
- les calculs sensibles et les accès aux données passent côté serveur;
- les appels à des services tiers sont encapsulés dans `lib/` ou dans des routes API.

La carte Leaflet suit une règle stricte :

- `react-leaflet` est chargé dynamiquement;
- le rendu se fait avec `ssr: false`;
- aucun accès à `window` ne doit avoir lieu au SSR;
- les couches cartes et marqueurs doivent rester compatibles avec le rendu initial.

## Données et backend

### Supabase

Supabase est la base de données et la couche backend principale.

Il sert à :

- stocker les données métier;
- exposer les accès sécurisés côté serveur;
- gérer certains flux de stockage;
- alimenter les pages de pilotage et les rapports.

La règle du projet reste la même :

- pas de SQL brut;
- clients Supabase uniquement;
- prudence maximale sur les accès serveur.

### Clerk

Clerk gère l'authentification et les sessions.

Le site s'appuie sur Clerk pour :

- identifier l'utilisateur;
- protéger les routes privées;
- injecter le contexte d'accès côté serveur;
- synchroniser les droits et profils.

## Services externes

### GitHub et Vercel

GitHub est le dépôt source. Vercel est la plateforme de déploiement.

Le flux standard est le suivant :

- commit sur GitHub;
- preview ou build Vercel;
- validation des routes et des variables d'environnement;
- déploiement en production après contrôle.

### Codex

Codex est l'outil utilisé pour modifier le code, créer des fichiers, corriger les bugs et vérifier les changements dans le dépôt.

Il n'exécute pas le site en production.
Son rôle est d'assister la production du code et de la documentation.

### PostHog

PostHog sert à l'analytics produit.

Il permet de suivre :

- les pages vues;
- certains événements clés;
- les parcours de navigation;
- les usages utiles au pilotage.

### Sentry

Sentry sert à remonter les erreurs techniques et les régressions observées en production.

Il est utilisé pour :

- détecter les exceptions;
- regrouper les incidents;
- raccourcir le diagnostic;
- conserver un historique d'erreurs exploitable.

### Resend

Resend gère les mails transactionnels et notifications sortantes.

Il intervient pour :

- les emails de contact;
- les messages transactionnels;
- les flux qui doivent être envoyés depuis le serveur.

### Nom de domaine LWS

Le nom de domaine du site est géré chez LWS et sert de point d'entrée public.

Dans la logique du projet, ce poste est un coût fixe à suivre, au même titre que l'hébergement et les autres dépendances d'infrastructure.

## Quotas gratuits de référence

Cette section sert de base pour l'onglet `Plans et quotas`.

Règle de lecture:

- le quota principal d'un service doit être la limite la plus proche du plafond;
- les autres limites restent visibles en détail;
- `NA` signifie soit "non publié de façon fiable", soit "pas de plan gratuit pertinent".

Vérification web effectuée le 4 juin 2026 à partir des sources officielles ci-dessous.

| Service | Plan | Quotas gratuits publiés | Statut quota tab | Source officielle |
| --- | --- | --- | --- | --- |
| Vercel | Hobby | 100 GB de Fast Data Transfer; 1 000 000 de function invocations; 100 GB-hours de function duration; 6 000 minutes de build; 1 000 images source; 50 000 web analytics events; 100 déploiements/jour | utilisable | [vercel.com/docs/accounts/plans](https://vercel.com/docs/accounts/plans) |
| Supabase | Free | 50 000 MAU; 500 MB de base; 5 GB d'egress; 1 GB de stockage fichiers; 500 000 invocations Edge Functions; 200 connexions Realtime; 100 messages/s; upload max 50 MB | utilisable | [supabase.com/pricing](https://supabase.com/pricing) |
| Clerk | Hobby | 50 000 MRU par app; 3 seats dashboard; 5 impersonations; sessions fixes de 7 jours; 2 500 créations et 100 000 vérifications pour les API keys M2M | utilisable | [clerk.com/pricing](https://clerk.com/pricing) |
| Resend | Free | 3 000 emails/mois; 100 emails/jour; 1 domaine; 10 000 automation runs; 30 jours de rétention | utilisable | [resend.com/pricing](https://resend.com/pricing) |
| PostHog | Free tier | 1 000 000 events/mois en product analytics; 5 000 recordings/mois en session replay; 1 000 000 requests/mois en feature flags; 1 000 000 rows/mois en managed warehouse | utilisable | [posthog.com](https://posthog.com/posthug) |
| Sentry | Developer / free | 5 GB de logs/mois sont inclus sur tous les plans; quota exact d'erreurs publics non stabilisé -> `NA` | partiel | [sentry.io/changelog/logs-are-generally-available](https://sentry.io/changelog/logs-are-generally-available/) |
| Upstash Redis | Free | 256 MB de données; 10 GB de bandwidth; 500 000 commands/mois | utilisable | [upstash.com/pricing/redis](https://upstash.com/pricing/redis) |
| Upstash QStash | Free | 1 000 messages/jour; 50 GB de bandwidth mensuelle; 1 MB max par message; 10 queues; 10 active schedules; 3 retries; 7 jours de délai max | utilisable | [upstash.com/docs/qstash/overall/pricing](https://upstash.com/docs/qstash/overall/pricing) |
| Pinecone | Starter | 1 projet par organisation; 5 indexes serverless par projet; 2 GB de stockage serverless par projet; 1 000 000 read units/mois; 2 000 000 write units/mois; 1 seule région cloud (`us-east-1`) | utilisable | [docs.pinecone.io/docs/limits](https://docs.pinecone.io/docs/limits) |

Services hors périmètre gratuit documenté:

- `Stripe`: paiement à l'usage, pas de quota gratuit public fixe;
- `LWS / domaine`: coût fixe, pas de quota gratuit à piloter;
- `GPT-5.4 mini / Codex`: outils IA de développement, pas de quota gratuit public exploitable dans cette fiche de quotas web.

Pour le pilotage interne, les services `NA` doivent rester visibles comme "non documentés" plutôt que remplacés par une moyenne.

## IA de développement et ACV

Les modèles utilisés pour coder le site ne doivent pas être mélangés avec les services web de quotas.

Si CleanMyMap n'appelle pas directement un modèle GPT en production, alors ce poste doit rester dans l'onglet `Impact carbone / ACV` et hors de l'onglet `Plans et quotas`.

Références de badge à afficher dans l'ACV:

- `GPT-5.4 mini — développement du site`:
  - `Inclus ACV`
  - `Hors production`
  - `Hors quotas web`
- `Codex — développement du site`:
  - `Inclus ACV`
  - `Hors production`
  - `Hors quotas web`

Règle de pilotage:

- les quotas web concernent seulement les services de production réellement exposés au site;
- les modèles IA de développement restent dans l'analyse de cycle de vie et les coûts projet;
- aucune moyenne externe ne doit remplacer ce découpage.

## Chaîne de fonctionnement

Lorsqu'un utilisateur agit sur le site :

- l'interface Next.js affiche la page ou le module concerné;
- les données nécessaires sont chargées depuis Supabase ou une route API;
- la carte Leaflet, si présente, est chargée sans SSR;
- les événements utiles sont envoyés vers PostHog;
- les erreurs sont capturées par Sentry;
- les notifications sortantes passent par Resend;
- les artefacts de build et de déploiement passent par GitHub et Vercel;
- le domaine LWS pointe vers l'instance publique du site.

## Points de contrôle

Cette méthodologie doit rester alignée avec les règles du dépôt :

- composants client minces;
- logique métier centralisée;
- pas de duplication inutile;
- carte dynamique pour Leaflet;
- traçabilité des changements;
- validation avant publication.

## Documents liés

- [Architecture globale](./master-architecture.md)
- [Vue système](./system-overview.md)
- [Services web stack](../operations/services-stack.md)
- [Fiche technique](../fiche-technique-cleanmymap.md)
- [Gouvernance des données](./data-governance.md)
