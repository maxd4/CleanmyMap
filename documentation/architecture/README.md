# Architecture — Guide IA

Point d'entrée de l'architecture CleanMyMap.

## Source de vérité

Lire d'abord :

1. `master-architecture.md` ;
2. `system-overview.md` ;
3. ADR pertinents ;
4. document de domaine concerné.

## Vues principales

| Fichier | Rôle |
|---|---|
| `master-architecture.md` | Architecture globale canonique |
| `system-overview.md` | Vue runtime rapide |
| `ARCHITECTURE.md` | Entrée compacte pour assistants |
| `frontend-backend-boundaries.md` | Frontières UI/API/domaine/data |
| `data-governance.md` | Contrats et gouvernance des données |
| `modules-cles-et-dependances.md` | Modules structurants |
| `section-ownership-boundaries.md` | Ownership app/registry/UI |
| `traceability-matrix.md` | Rattachement code/documentation |
| `monolith-split-plan.md` | Plan courant de modularisation |

## ADR

Décisions existantes :

- `ADR-001-clerk-auth.md` — Clerk comme identité principale ;
- `ADR-002-service-role-key.md` — usage des clés privilégiées ;
- `ADR-003-monorepo-structure.md` — structure du dépôt.

Décisions à intégrer avec cet audit :

- `ADR-004-companion-identity.md` — identité de l'application compagnon ;
- `ADR-005-next-canary-policy.md` — usage d'une version canary de Next.js ;
- `ADR-006-supabase-migrations-source-of-truth.md` — arbre canonique des migrations.

## Architecture active

```txt
apps/web/              application web principale
apps/web/src/app/      pages et API routes
apps/web/src/lib/      domaine, services, sécurité, data
apps/web/supabase/     configuration Supabase active du workspace
companion-app/         application mobile GPS
scripts/               garde-fous et maintenance
maintenance/python/    maintenance Python hors runtime principal
documentation/         documentation structurée
```

## Règles de modification

Avant une décision d'architecture :

1. vérifier le code réel ;
2. identifier les contrats publics ;
3. consulter les ADR existants ;
4. éviter une nouvelle abstraction si un module canonique existe ;
5. ajouter un ADR seulement pour une décision durable et transversale.

## Points sensibles

- identité Clerk ↔ Supabase ;
- `service_role` strictement serveur ;
- RLS ;
- frontières serveur/client ;
- routes publiques/protégées/admin ;
- migrations Supabase ;
- quotas Vercel/Supabase ;
- app compagnon et géolocalisation.

## Refactoring

Pour un gros fichier :

1. lire `monolith-split-plan.md` ;
2. une cible par lot ;
3. conserver props, exports, routes et comportement public ;
4. ajouter ou maintenir les tests ;
5. supprimer l'ancien chemin seulement après validation.

## Validation

Après changement architectural :

```bash
npm run checks
```

Selon le périmètre :

```bash
npm run test:security
npm run test:regression-gates
npm run build
npm run test:e2e
```
