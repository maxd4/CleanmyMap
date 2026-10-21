# Architecture : index de lecture Codex

Statut : `CURRENT` (index). Source globale : [`master-architecture.md`](./master-architecture.md).

## Routage par responsabilité

| Signal de tâche | Source à lire | Statut / portée |
|---|---|---|
| Architecture générale, stack, projections, owners | [`master-architecture.md`](./master-architecture.md) | CURRENT, synthèse transversale |
| Frontière Server/Client, bundle et hydratation | [`frontend-backend-boundaries.md`](./frontend-backend-boundaries.md) | CURRENT, frontières runtime |
| Rubriques, navigation, ownership UI | [`section-ownership-boundaries.md`](./section-ownership-boundaries.md) | CURRENT, registre ↔ rendu ↔ route |
| Données, ingestion, gouvernance | [`data-governance.md`](./data-governance.md) | CURRENT, détails du contrat |
| Documents, contenus et validation | [`content-validation.md`](./content-validation.md) | Source spécialisée |
| Interfaces techniques versionnées | [`technical-inventory.md`](./technical-inventory.md) | Inventaire, vérifier contre les manifestes |
| Matrice route → composant → API | [`traceability-matrix.md`](./traceability-matrix.md) | Inventaire contextuel, pas source runtime |
| Itinéraires | [`methodologie-creation-itineraire.md`](./methodologie-creation-itineraire.md) | Méthodologie de domaine |
| Risque / serviceabilité Paris | [`paris-pressure-risk-model.md`](./paris-pressure-risk-model.md), [`paris-municipal-cleaning-serviceability.md`](./paris-municipal-cleaning-serviceability.md), [`route-predicted-risk-integration.md`](./route-predicted-risk-integration.md) | Contrats spécialisés |
| Taxonomie déchets | [`waste-taxonomy-governance.md`](./waste-taxonomy-governance.md) | Gouvernance spécialisée |
| Audit de surface produit | [`product-surface-accessibility-audit.md`](./product-surface-accessibility-audit.md) | AUDIT, ne pas inférer CURRENT |
| Décisions de modularisation | [`modularity-decisions.md`](./modularity-decisions.md) | Décisions humaines |
| Radar / métriques de monolithes | [`monolith-split-plan.md`](./monolith-split-plan.md) | Snapshot / dérivé, vérifier fraîcheur |
| Refactors encore à conduire | [`refactor-priorities-plan.md`](./refactor-priorities-plan.md) | PLAN, jamais preuve runtime |
| Vue système historique | [`system-overview.md`](./system-overview.md) | COMPATIBILITY : ne pas étendre |
| Fonctionnement général et quotas datés | [`methodologie-fonctionnement-site.md`](./methodologie-fonctionnement-site.md) | Mélange explicatif et relevés datés : ne pas prendre les chiffres pour des quotas actuels |
| Symboles et inventaire | [`ACTION_SYMBOL_INVENTORY.md`](./ACTION_SYMBOL_INVENTORY.md) | Inventaire, vérifier runtime |

## ADR : historique décisionnel, pas copie des contrats

- [`ADR-001`](./adr/ADR-001-clerk-auth.md) : identité Clerk ; [`ADR-002`](./adr/ADR-002-service-role-key.md) : service role serveur.
- [`ADR-003`](./adr/ADR-003-monorepo-structure.md) : monorepo ; [`ADR-004`](./adr/ADR-004-companion-identity.md) : mobile.
- [`ADR-005`](./adr/ADR-005-next-canary-policy.md) : politique historique canary de Next.js ; [`ADR-006`](./adr/ADR-006-supabase-migrations-source-of-truth.md) : arbre de migrations.
- [`ADR-007`](./adr/ADR-007-capability-scoped-authorization.md) : capacité et scope.

## Priorité de preuve

`runtime + tests réellement pertinents` → `contrat CURRENT propriétaire` → `index` → `snapshot/audit`. Ne pas recopier les contrats sécurité, SQL, mobile ou scientifiques dans une seconde synthèse. Pour sécurité et permissions : [`../security/README.md`](../security/README.md) ; pour mobile : [`../../apps/mobile/README.md`](../../apps/mobile/README.md).
