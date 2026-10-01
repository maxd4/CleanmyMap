# Vendor Exit Strategy

## Objet

Ce document couvre le lot de mitigation du lock-in Vercel / Supabase :

- mitigation du lock-in Vercel / Supabase ;
- scripts d'export deja disponibles ;
- zones a isoler ;
- procedure de migration cible.

## Dependances prioritaires

### Supabase

Dependances actives :

- base Postgres managée ;
- storage ;
- migrations SQL ;
- clients serveur et navigateur ;
- scripts de synchronisation, d'export et de restauration versionnée.

Points d'appui deja presents :

- `apps/web/supabase/migrations/*`
- `npm run data:archive:supabase`
- `npm run backup:actions` et `npm run restore:actions` pour l'état action
  versionné, avec plan préalable et écriture atomique confirmée
- flux Google Sheet vers Supabase retire et non supporte
- `npm run backend:supabase:push`
- `npm run backend:supabase:preview:ensure`

### Vercel

Dependances actives :

- build et hosting ;
- environnement runtime ;
- sync d'environnement ;
- analytics et speed insights ;
- deploiements pilotes via API.

Points d'appui deja presents :

- `apps/web/vercel.json`
- `npm run backend:vercel:env:sync`
- `npm run metrics:cicd`
- `scripts/reports/cicd-metrics-report.mjs`

## Strategie de reduction progressive

### Etape 1 - Sauvegardes et exports obligatoires

- conserver un export regulier des donnees metier (`data:archive:supabase`) ;
- documenter les datasets critiques exportables en CSV/JSON/PDF ;
- verifier que les migrations SQL restent suffisantes pour reconstruire le schema.

### Etape 2 - Isolation des SDK

- limiter les acces directs aux SDK Vercel / Supabase dans les composants UI ;
- privilegier des modules d'acces concentres dans `lib/*` et `scripts/*` ;
- interdire les appels disperses a de nouveaux services sans couche d'abstraction minimale.

### Etape 3 - Capacite de re-hebergement

- garder la compatibilite `Next.js nodejs runtime` hors dependance exclusive au runtime Vercel ;
- maintenir les variables d'environnement dans un format exportable ;
- documenter les exigences minimales de build, de stockage et d'observabilite.

### Etape 4 - Simulation de migration

- cible base : Postgres managé non Supabase ou auto-heberge ;
- cible hosting : plateforme Node/Next compatible ou container standard ;
- cible observabilite : systeme tiers interchangeable si Sentry/Vercel deviennent indisponibles.

## Scripts et artefacts de sortie existants

| Besoin | Artefact actuel |
| --- | --- |
| Export des donnees Supabase | `npm run data:archive:supabase` |
| Backup/restauration de l'etat action | `npm run backup:actions` / `npm run restore:actions` |
| Push schema / migrations | `npm run backend:supabase:push` |
| Associer / reactiver un preview Supabase | `npm run backend:supabase:preview:ensure` |
| Sync env Vercel | `npm run backend:vercel:env:sync` |
| Audit des deploiements Vercel | `npm run metrics:cicd` |
| Check hygiene avant release | `npm run pre-release:check` |

## Risques restants

- authentication encore fortement liee a Clerk ;
- storage et RLS encore fortement couples a Supabase ;
- analytics Vercel et instrumentation front encore dependants du contexte de deploiement ;
- migration de runtime couteuse si des conventions Vercel implicites s'accumulent.

## Prochaine iteration utile

1. documenter un exercice de restauration sur environnement neutre ;
2. ajouter un inventaire des points d'entree Vercel / Supabase dans le code ;
3. etendre ensuite la strategie a Clerk et PostHog.
