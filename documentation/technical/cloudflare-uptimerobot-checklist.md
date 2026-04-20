# Cloudflare + UptimeRobot Checklist (Cutover Next.js)

## Decision tree monitoring -> diagnostic -> action
```mermaid
flowchart TD
  A[Alerte monitoring recue] --> B{Endpoint en echec ?}
  B -- /api/health --> C[Incident P1]
  B -- /api/uptime --> D[Incident P2]
  B -- Route UI --> E[Incident UX]
  C --> C1[Verifier logs Vercel + env critiques]
  D --> D1[Verifier dependances externes (Sentry/Upstash)]
  E --> E1[Verifier DNS/Cloudflare cache]
  C1 --> F{Resolution < 5 min ?}
  D1 --> F
  E1 --> F
  F -- Oui --> G[Clore incident + noter cause]
  F -- Non --> H[Rollback DNS/deploiement]
```
Fallback statique:
```md
![Monitoring decision tree fallback](../../../archive/fallback-monitoring-decision-tree.png)
```

## Objectif
Sécuriser le passage en production de `apps/web` avec supervision active et rollback rapide.

## Pré-requis
- Projet Vercel en production avec déploiement vert.
- Variables d'environnement production complètes (`NEXT_PUBLIC_*`, Clerk, Supabase, Sentry, PostHog, Resend, Stripe).
- Domaine principal validé.

## Étapes Cloudflare (DNS)
1. Confirmer l'enregistrement cible Vercel (CNAME/Apex selon configuration Vercel).
2. Réduire temporairement le TTL DNS avant cutover (ex: 300s).
3. Basculer l'entrée DNS principale vers la cible Vercel.
4. Vérifier propagation DNS depuis au moins 2 résolveurs publics.
5. Activer HTTPS strict et forcer HTTPS.
6. Vérifier cache Cloudflare:
   - Pas de cache agressif sur routes API `/api/*`.
   - Cache autorisé sur assets statiques Next.js.

## Étapes UptimeRobot
Créer des monitors HTTP(S):
1. `GET /api/health` (intervalle 1 min, alerte critique immédiate).
2. `GET /api/uptime` (intervalle 5 min, alerte warning).
3. `GET /` (intervalle 5 min, alerte warning).
4. `GET /dashboard` (intervalle 5 min, alerte warning; auth monitor si possible via synthetic check dédié).

## Seuils d'alerte recommandés
- P1: endpoint health indisponible > 2 min.
- P2: uptime endpoint dégradé > 10 min.
- P2: page d'accueil indisponible > 5 min.

## Vérification post-cutover (30 min)
1. Smoke test manuel:
   - Connexion Clerk.
   - Création action (`/actions/new`).
   - Lecture historique (`/actions/history`).
   - Lecture carte (`/actions/map`).
2. Contrôler logs Vercel + erreurs Sentry.
3. Contrôler évènements PostHog côté client/serveur.

## Condition de rollback
Rollback immédiat si un des points suivants survient:
- `GET /api/health` échoue > 5 min.
- Taux d'erreur API > 10% sur 10 min.
- Échec de création d'action sur le flux nominal.
