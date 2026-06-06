# Security Entry Point

Lire cette page en premier avant toute modification sur les surfaces publiques, privées ou CI.

## Ordre de lecture

1. [Contrôles avant merge](./PRE_MERGE_CHECKLIST.md)
2. [Référence rapide](./SECURITY_QUICK_REFERENCE.md)
3. [Guide complet](./SECURITY_GUIDE.md)
4. [Validation d'URL](./url-validation-security.md)
5. [Regex et ReDoS](./regex-security.md)
6. [Rate limiting](../backend/RATE_LIMITING.md)
7. [Codex Security Playbook](./CODEX_SECURITY_PLAYBOOK.md)
8. [Supabase Linked Advisories Report](./supabase-linked-advisories-2026-05-20.md)
9. [SQL injection hardening audit](./sql-injection-hardening-audit.md)
10. [Supabase review checklist](./supabase-review-checklist.md)
11. [Checklist Performance & Quotas Vercel](../development/performance-quotas-vercel-checklist.md)

## Checklist courte

- Routes publiques vs privées
  - Une route sensible doit être dans `PROTECTED_ROUTE_PATTERNS` ou bloquée au niveau handler.
  - Les routes privées ne doivent pas apparaître dans `PUBLIC_APP_SITEMAP_PATHS`.
- Robots / sitemap / noindex
  - Les pages internes doivent avoir `robots.index = false`.
  - Les pages publiques indexables doivent être cohérentes avec `sitemap.ts`.
- Validation d'URL
  - Utiliser `new URL()` ou les helpers de `src/lib/security/validation.ts`.
  - Refuser les hôtes factices et les schémas non prévus.
- Regex à risque
  - Pas de quantificateurs imbriqués.
  - Longueurs bornées avant validation.
  - Alternatives ordonnées de la plus longue à la plus courte.
- Rate limiting / anti-spam
  - Les formulaires publics doivent passer par `createPublicRateLimitResponse()`.
  - Les garde-fous `honeypot` et `submittedAt` doivent rester déterministes.
- Secrets / env
  - Lancer `npm run security:secrets` avant merge.
  - Ne jamais ajouter de secret en dur dans les docs ou le code.
- GitHub Actions
  - Garder les permissions minimales par job.
  - Les changements Dependabot sur l'auth, les secrets, le routage ou la CI passent en revue renforcée.

## Helpers réutilisables

- `src/lib/security/validation.ts`
- `src/lib/seo/indexability.ts`
- `src/lib/auth/protected-routes.ts`
- `src/lib/community/discussion-rate-limit.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/clerk-rls.ts`
- `src/lib/rate-limit/server.ts`

## Rapports

- [Supabase Linked Advisories Report](./supabase-linked-advisories-2026-05-20.md)
- Use this report to verify that the linked Supabase project is aligned with the hardened repository state after a push.

## Quand bloquer un merge

Bloquer si l'un des points suivants est faux:

- une route privée est indexable ou présente dans le sitemap
- un formulaire public renvoie un 429 non homogène
- une validation d'URL utilise un substring au lieu d'un parsing explicite
- une regex sensible n'a pas de borne ou contient un backtracking inutile
- une permission CI est plus large que nécessaire
