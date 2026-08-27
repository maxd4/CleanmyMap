# CleanMyMap Architecture Snapshot

Entrée compacte pour assistants IA. La source globale reste `master-architecture.md`.

## Surfaces actives

```txt
apps/web/                       application web Next.js
apps/web/src/app/               pages et routes API
apps/web/src/components/        UI
apps/web/src/lib/               logique métier, auth, services et data
apps/web/supabase/              configuration et migrations du workspace web
apps/mobile/                     application mobile Expo / React Native
scripts/                        garde-fous et maintenance Node
maintenance/python/             maintenance Python hors runtime principal
documentation/                  architecture, produit, sécurité et opérations
```

## Fichiers d'entrée à forte valeur

```txt
apps/web/src/proxy.ts
apps/web/src/lib/auth/protected-routes.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/actions/data-contract.ts
apps/web/src/lib/actions/unified-source.ts
apps/web/src/lib/actions/types.ts
apps/web/src/lib/sections-registry/config.ts
apps/web/src/app/api/
```

Pour la carte :

```txt
apps/web/src/app/(app)/actions/map/page.tsx
apps/web/src/components/actions/map-feed/actions-map-feed.tsx
apps/web/src/lib/data/map-records.ts
```

## Auth et données

```mermaid
flowchart LR
  User[Utilisateur] --> Web[Next.js]
  Web --> Clerk[Clerk AuthN]
  Web --> API[API Routes]
  API --> AuthZ[AuthZ serveur]
  AuthZ --> Domain[Services métier]
  Domain --> Supabase[(Supabase)]
```

Règles :

- Clerk est l'identité principale du web ;
- Supabase stocke les données ;
- `service_role` reste serveur ;
- RLS ne doit pas être désactivée pour contourner un défaut ;
- les routes sensibles vérifient l'accès côté serveur.

## Application mobile

`apps/mobile/` est la seconde application déployable du même produit CleanMyMap.
Elle est issue de l'ancien `companion-app`, terme conservé uniquement pour
l'historique et les identifiants techniques. Elle partage Clerk, Supabase et
les contrats métier nécessaires avec `apps/web`, sans être une copie ni un
sous-projet indépendant.

L'identité Clerk et la finalisation des métriques par trigger invoker sont
finalisées puis gelées. Les
limites encore ouvertes sont le background headless, `mission_actions`, la
validation opérationnelle et la future évolution produit mobile.

Ne pas considérer comme valide un flux où :

- une identité Supabase anonyme devient implicitement un profil Clerk ;
- le client mobile écrit directement `distance_m` ou `duration_s` ;
- une finalisation contourne l'UPDATE propriétaire vers `completed`.

Voir :

```txt
documentation/architecture/adr/ADR-004-companion-identity.md
documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md
```

## Migrations

Le workspace Supabase canonique possède :

```txt
apps/web/supabase/config.toml
apps/web/supabase/migrations/
```

Il s'agit du seul arbre de migrations éditable. Le garde-fou
`npm run audit:supabase-migration-trees` échoue si un second arbre racine est
recréé.

## Budget de contexte

- commencer par la cible réelle ;
- lire 3 à 5 fichiers utiles avant d'élargir ;
- utiliser `git diff --name-only` et `rg` ciblé ;
- éviter `node_modules`, `.next`, artefacts, backups et lockfiles sauf nécessité.

## Validation

Ciblée :

```bash
npm run checks:changed
```

Complète :

```bash
npm run checks
```

E2E explicite :

```bash
npm run test:e2e
```

## Incident

Runbook :

```txt
documentation/operations/INCIDENT_RUNBOOK_SHORT.md
```
