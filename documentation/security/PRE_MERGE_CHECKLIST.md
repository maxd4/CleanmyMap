# Prépublication sécurité — gate de lot (`CURRENT`)

**Usage :** contrôle terminal d'un changement sensible, consommé par les skills et les agents. La checklist de **revue de code** appartient à [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md) ; les détails de chaque mesure restent chez leur propriétaire. Une validation de sécurité dépend du risque du lot, pas du nombre de cases cochées.

## Gate par changement

| Surface touchée | Vérifier avant publication | Owner |
|---|---|---|
| API, HTTP ou mutation | Contrat par méthode, cas public et privé, garde avant effet ; tests d'accès autorisé / interdit ; cache et réponse sûrs | [`../development/api-standard.md`](../development/api-standard.md), [`authz-authn-regles.md`](./authz-authn-regles.md) |
| Identité ou droits | Clerk / capability / rôle compatible / ownership / scope / état, sans confiance dans les paramètres utilisateur | [`authz-authn-regles.md`](./authz-authn-regles.md) |
| Supabase / migration / Storage | RLS, GRANT/REVOKE, RPC, compte de service, projections, migrations et preuves SQL lorsqu'exécutables | [`supabase-review-checklist.md`](./supabase-review-checklist.md) |
| Formulaire public, limitation, webhook | Validation stricte, honeypot/timestamp/BotID si justifiés, rate limit et réponse `429`, signature si requise | [`RATE_LIMITING.md`](./RATE_LIMITING.md), code de la route |
| HTML, URL ou regex non fiable | Source/sink, sanitation contextuelle, URL parsée et domaine attendu, ReDoS et longues entrées | [`dom-xss-prevention.md`](./dom-xss-prevention.md), [`url-validation-security.md`](./url-validation-security.md), [`regex-security.md`](./regex-security.md) |
| Mutation admin | Audit de succès **après** effet réel, refus et échec traités, absence de données sensibles | [`admin-operation-audit.md`](./admin-operation-audit.md) |
| SEO d'une route sensible | Noindex/sitemap/canonical cohérents avec l'accès, mais robots/proxy ne remplacent jamais l'AuthZ | [`../seo/README.md`](../seo/README.md), contrat runtime |

## Preuves et clôture

- Exécuter les contrôles de sécurité applicables (notamment `npm run security:secrets`) sur le périmètre Git réellement attribué ; un check ignoré n'est pas un PASS.
- Ajouter ou adapter les tests de refus, borne, scope et projection **lorsque le code concerné change**. Un lot purement documentaire ne doit pas inventer une preuve runtime.
- Vérifier les documents `CURRENT` touchés et les références ; la doctrine générale est [`SECURITY.md`](./SECURITY.md).
- Distinguer défaut introduit, CI rouge préexistante, absence de preuve runtime et dette périphérique. Préserver les changements des autres writers.
- Pour la procédure Git, l'attribution, les hooks, la convergence et le rapport final, appliquer la gouvernance du dépôt et [`../development/TESTING.md`](../development/TESTING.md) plutôt qu'une copie locale de ces règles.
