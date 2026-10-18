# Architecture — Guide IA

Point d'entrée de l'architecture CleanMyMap.

## Source de vérité

Lire d'abord :

1. `master-architecture.md` ;
2. ADR pertinents ;
3. document de domaine concerné.

`system-overview.md` reste une façade `COMPATIBILITY` pour les liens
historiques ; il ne porte plus une vue concurrente.

## Vues principales

| Fichier | Rôle |
|---|---|
| `master-architecture.md` | Architecture globale canonique |
| `system-overview.md` | Façade de compatibilité vers l'architecture globale |
| `ARCHITECTURE.md` | Entrée compacte pour assistants |
| `frontend-backend-boundaries.md` | Frontières UI/API/domaine/data |
| `data-governance.md` | Contrats et gouvernance des données |
| `modules-cles-et-dependances.md` | Modules structurants |
| `section-ownership-boundaries.md` | Ownership app/registry/UI |
| `traceability-matrix.md` | Rattachement code/documentation |
| `monolith-split-plan.md` | Radar généré et snapshot des métriques de modularisation |
| `modularity-decisions.md` | Registre canonique des décisions architecturales humaines |
| `refactor-priorities-plan.md` | Plan courant des priorités de refactoring |

## ADR

Décisions existantes :

- `ADR-001-clerk-auth.md` — Clerk comme identité principale ;
- `ADR-002-service-role-key.md` — usage des clés privilégiées ;
- `ADR-003-monorepo-structure.md` — structure du dépôt ;
- `ADR-004-companion-identity.md` — identité de l'application mobile (historique companion) ;
- `ADR-005-next-canary-policy.md` — politique de stabilité Next.js, stable par défaut (contexte canary historique) ;
- `ADR-006-supabase-migrations-source-of-truth.md` — arbre canonique des migrations ;
- `ADR-007-capability-scoped-authorization.md` — autorisation par capacités et périmètres.

## Architecture active

```txt
apps/web/              application web principale
apps/web/src/app/      pages et API routes
apps/web/src/lib/      domaine, services, sécurité, data
apps/web/supabase/     configuration Supabase active du workspace
apps/mobile/           application mobile GPS
scripts/               garde-fous et maintenance
maintenance/python/    maintenance Python hors runtime principal
documentation/         documentation structurée
```

Document fonctionnel de référence :
[méthodologie de création d'itinéraire](methodologie-creation-itineraire.md).

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
- AuthZ par capacité + scope ;
- RLS ;
- frontières serveur/client ;
- routes publiques/protégées/admin ;
- migrations Supabase ;
- quotas Vercel/Supabase ;
- application mobile et géolocalisation.

Pour les permissions et périmètres :

```txt
documentation/security/authorization-capabilities.md
documentation/security/authz-authn-regles.md
```

## Refactoring

Pour un gros fichier :

1. lire `monolith-split-plan.md` pour les mesures et le radar généré ;
2. lire `modularity-decisions.md` pour les décisions architecturales et leurs invariants ;
3. une cible par lot ;
4. conserver props, exports, routes et comportement public ;
5. ajouter ou maintenir les tests ;
6. supprimer l'ancien chemin seulement après validation.

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
