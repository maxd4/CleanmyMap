# Sécurité — index de responsabilité

**État : `CURRENT` (routage documentaire).** Ce fichier ne définit ni permissions nouvelles, ni autorité distincte du runtime. Pour chaque changement : lire le propriétaire exact, son code et ses tests. La doctrine d'ensemble est [`SECURITY.md`](./SECURITY.md) ; la politique publique de signalement est le `SECURITY.md` racine.

## Autorité et sélection

| Question | Source documentaire | Autorité exécutable / vérification |
|---|---|---|
| AuthN/AuthZ réellement appliquées | [`authz-authn-regles.md`](./authz-authn-regles.md) (`CURRENT`) | `apps/web/src/lib/authz.ts`, fragments `apps/web/src/lib/auth/api-authorization-contract.*.ts`, handlers et tests API |
| Autorisation future par capacités | [`authorization-capabilities.md`](./authorization-capabilities.md) (`PLAN / TARGET`) | **Ne pas** traiter cette matrice comme des droits livrés |
| Doctrine sécurité transversale | [`SECURITY.md`](./SECURITY.md) (`CURRENT`) | Code, garde-fous et configuration concernés |
| Contrat et erreurs HTTP | [`../development/api-standard.md`](../development/api-standard.md) (`CURRENT`) | Handler API, consommateurs, `apps/web/src/lib/http/api-errors.ts` |
| Opérations privilégiées et journal d'audit | [`admin-operation-audit.md`](./admin-operation-audit.md) | `apps/web/src/lib/admin/audit/operation-audit.ts` et tests |
| Supabase RLS, RPC, Storage | [`supabase-review-checklist.md`](./supabase-review-checklist.md), [`../architecture/data-governance.md`](../architecture/data-governance.md) | Migrations canoniques, politiques RLS, code et tests SQL exécutés si disponibles |
| Limites de débit | [`RATE_LIMITING.md`](./RATE_LIMITING.md) | `apps/web/src/lib/rate-limit/` et tests de route |
| XSS, HTML, contexte script | [`dom-xss-prevention.md`](./dom-xss-prevention.md) | Composants réellement rendus, tests |
| URL et protocoles | [`url-validation-security.md`](./url-validation-security.md) | `apps/web/src/lib/security/validation.ts` |
| Regex / ReDoS | [`regex-security.md`](./regex-security.md) | Entrées bornées et tests négatifs |
| Détection de secrets | [`regex-audit-sensitive-data.md`](./regex-audit-sensitive-data.md) | `npm run security:secrets` et scopes Git réels |
| CSP | [`csp.md`](./csp.md) | Configuration HTTP et tests CSP |
| Dépendances | [`dependency-advisory-governance.md`](./dependency-advisory-governance.md) | Contrôleur d'audit et rapport du SHA concerné |
| GitHub Actions | [`github-actions-hardening.md`](./github-actions-hardening.md) | Workflows, permissions et checks |
| DAST public passif | [`dast-zap-baseline.md`](./dast-zap-baseline.md) | Exécution réelle et compte rendu daté |

## Lecture par opération

1. **API / mutation** : classifier la route (`public-safe`, authenticated, owner, admin-like, service ou webhook). Une route publique n'exige pas une session par défaut, mais conserve validation, projection, limites et anti-abus justifiés. Les ressources privées et mutations nécessitent AuthN/AuthZ serveur adaptées. Lire le contrat méthode par méthode et les tests des branches de refus.
2. **Données** : identifier ressource, acteur, scope, relation, état métier et projection. Ni `activeProfile`, ni un ID fourni par le client, ni `service_role` ne remplace la décision d'accès HTTP.
3. **Opération admin** : journaliser l'issue réelle, pas un succès avant mutation ; conserver le contrat spécialisé de l'audit.
4. **Secrets / providers** : lire la règle spécialisée et vérifier la portée réelle du code, des logs et des artefacts. Une réussite de scan n'est pas une preuve exhaustive d'absence de données sensibles.

## Entrées Codex et compatibilité

| Usage | Chemin | État |
|---|---|---|
| Procédure de sécurité Codex | [`CODEX_SECURITY_PLAYBOOK.md`](./CODEX_SECURITY_PLAYBOOK.md) | `CURRENT`, procédure spécialisée, non source AuthZ alternative |
| Revue technique des changements | [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md) | `CURRENT`, checklist spécialisée |
| Vérification de publication | [`PRE_MERGE_CHECKLIST.md`](./PRE_MERGE_CHECKLIST.md) | `CURRENT`, gate de fin de lot |
| Repères rapides et exemples | [`SECURITY_QUICK_REFERENCE.md`](./SECURITY_QUICK_REFERENCE.md) | `CURRENT`, rappel non normatif |
| Ancienne entrée AuthZ | [`AUTHZ.md`](./AUTHZ.md) | `COMPATIBILITY` (ne pas enrichir) |
| Ancien guide transversal | [`SECURITY_GUIDE.md`](./SECURITY_GUIDE.md) | `COMPATIBILITY` (ne pas enrichir) |
| Audit des secrets historique / méthode | [`regex-audit-sensitive-data.md`](./regex-audit-sensitive-data.md) | `CURRENT` pour procédure de scan seulement |

## Preuves historiques (non CURRENT)

- [`github-audit-backlog.md`](./github-audit-backlog.md), [`supabase-linked-advisories-2026-05-20.md`](./supabase-linked-advisories-2026-05-20.md), [`sql-injection-hardening-audit.md`](./sql-injection-hardening-audit.md) : audits / snapshots à relire sur le SHA et le service pertinents.
- Autres contrôles de sécurité (`dom-xss-prevention.md`, `dependency-advisory-governance.md`, etc.) : appliquer leur état explicite, pas un statut supposé depuis cet index.
- Registre des contrôles de déception et anti-abus : [`SECURITY.md`](./SECURITY.md) et `scripts/checks/security-deception-registry.json`. Honeypot de formulaire, canary de sécurité et preuve de production ne sont pas interchangeables.

## Validation proportionnée

Les commandes `npm run security:secrets`, `npm run check:doc-governance`, `npm run check:stack-doc-drift` et `npm run test:security` sont des points d'entrée **selon le périmètre** ; les niveaux de preuve et la sélection réelle des tests appartiennent à [`../development/TESTING.md`](../development/TESTING.md). `security:dependencies` est à examiner lors d'un changement de dépendances ou pour investiguer un advisory. Une CI rouge préexistante doit être distinguée d'une régression du lot.
