# Security Entry Point

Lire cette page en premier avant toute modification sur les surfaces publiques, privées ou CI.

## Ordre de lecture

1. [Contrôles avant merge](./PRE_MERGE_CHECKLIST.md)
2. [Référence rapide](./SECURITY_QUICK_REFERENCE.md)
3. [Guide complet](./SECURITY_GUIDE.md)
4. [Validation d'URL](./url-validation-security.md)
5. [Regex et ReDoS](./regex-security.md)
6. [Rate limiting](../backend/RATE_LIMITING.md)

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

## Quand bloquer un merge

Bloquer si l'un des points suivants est faux:

- une route privée est indexable ou présente dans le sitemap
- un formulaire public renvoie un 429 non homogène
- une validation d'URL utilise un substring au lieu d'un parsing explicite
- une regex sensible n'a pas de borne ou contient un backtracking inutile
- une permission CI est plus large que nécessaire
