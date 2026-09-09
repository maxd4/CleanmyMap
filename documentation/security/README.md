# Documentation sécurité — index canonique

Cette page est l'index du domaine `documentation/security/`. Elle oriente vers
les sources de vérité sans recopier leurs contrats détaillés.

## États documentaires

| État | Source | Responsabilité |
|---|---|---|
| `CURRENT` | [`SECURITY.md`](./SECURITY.md) | Doctrine transverse de sécurité interne |
| `CURRENT` | [`authz-authn-regles.md`](./authz-authn-regles.md) | Contrat AuthN/AuthZ et frontières actuellement applicables |
| `CURRENT` | [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md) | Checklist humaine de revue sécurité |
| `CURRENT` | [`CODEX_SECURITY_PLAYBOOK.md`](./CODEX_SECURITY_PLAYBOOK.md) | Exécution sécurité par Codex |
| `CURRENT` | [`PRE_MERGE_CHECKLIST.md`](./PRE_MERGE_CHECKLIST.md) | Contrôles sécurité avant merge |
| `CURRENT` | [`SECURITY_QUICK_REFERENCE.md`](./SECURITY_QUICK_REFERENCE.md) | Rappels courts et invariants fréquents |
| `PLAN / TARGET` | [`authorization-capabilities.md`](./authorization-capabilities.md) | Modèle cible par capacités et périmètres, non descriptif du runtime actuel |
| `COMPATIBILITY` | [`AUTHZ.md`](./AUTHZ.md) | Façade historique vers les deux sources AuthZ |
| `COMPATIBILITY` | [`SECURITY_GUIDE.md`](./SECURITY_GUIDE.md) | Façade historique vers cet index et les contrats spécialisés |
| `AUDIT / SNAPSHOT` | [`github-audit-backlog.md`](./github-audit-backlog.md) | État GitHub historique daté et attaché à un SHA |

## Parcours de lecture

- Modification de code ou de configuration sensible : [`SECURITY.md`](./SECURITY.md), puis le contrat spécialisé concerné.
- Revue humaine : [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md).
- Exécution Codex : [`CODEX_SECURITY_PLAYBOOK.md`](./CODEX_SECURITY_PLAYBOOK.md).
- AuthN/AuthZ : [`authz-authn-regles.md`](./authz-authn-regles.md) pour l'état courant ; [`authorization-capabilities.md`](./authorization-capabilities.md) uniquement pour la cible explicitement marquée.
- Audit ou contrat spécialisé : utiliser directement le document listé ci-dessous.

## Contrats spécialisés `CURRENT`

| Sujet | Source |
|---|---|
| Audit des opérations privilégiées | [`admin-operation-audit.md`](./admin-operation-audit.md) |
| Revue Supabase, RLS, Storage et Realtime | [`supabase-review-checklist.md`](./supabase-review-checklist.md) |
| Advisories de dépendances | [`dependency-advisory-governance.md`](./dependency-advisory-governance.md) |
| Audit des secrets par `npm run security:secrets` | [`regex-audit-sensitive-data.md`](./regex-audit-sensitive-data.md) |
| Rate limiting | [`RATE_LIMITING.md`](./RATE_LIMITING.md) |
| Validation d'URL | [`url-validation-security.md`](./url-validation-security.md) |
| Regex et ReDoS | [`regex-security.md`](./regex-security.md) |
| Prévention XSS DOM | [`dom-xss-prevention.md`](./dom-xss-prevention.md) |

Les autres audits présents dans ce dossier restent des preuves ou des contrats
de leur propre périmètre. Ils ne remplacent pas les sources `CURRENT` ci-dessus.

## Invariants d'entrée

- Une session valide ne suffit pas : le serveur vérifie identité, capacité,
  rôle compatible, scope ou ownership, état métier et projection de données.
- `service_role` reste strictement côté serveur et ne remplace pas l'AuthZ d'un
  utilisateur.
- RLS, permissions RPC, migrations versionnées et `search_path` maîtrisé sont
  conservés pour les flux Supabase concernés.
- Les entrées externes sont typées, bornées, validées, normalisées et rejetées
  explicitement lorsqu'elles sont invalides.
- Les URLs utilisent les helpers de [`apps/web/src/lib/security/validation.ts`](../../apps/web/src/lib/security/validation.ts) ou un parsing `new URL()` adapté.
- Le contenu non fiable n'est pas injecté comme HTML ; les exceptions de scripts,
  styles contrôlés et données sérialisées sont définies par le contrat XSS.
- Une mutation privilégiée suit le contrat d'audit adapté ; un succès n'est
  jamais déclaré avant l'effet réel.

## Commandes d'entrée utiles

```bash
npm run security:secrets
npm run check:doc-governance
npm run check:stack-doc-drift
npm run test:security
```

Pour la procédure de merge, appliquer [`PRE_MERGE_CHECKLIST.md`](./PRE_MERGE_CHECKLIST.md).
Pour les contrôles généraux TypeScript, tests, UI, accessibilité et
performance, suivre les sources de [`documentation/development/`](../development/)
et du [`design-system`](../design-system/README.md), sans les recopier ici.
