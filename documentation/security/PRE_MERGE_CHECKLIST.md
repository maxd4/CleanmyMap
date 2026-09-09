# Contrôles sécurité avant merge — `CURRENT`

Cette checklist est consommée par les skills et reste limitée aux contrôles de
sécurité. Les contrôles généraux de développement sont définis dans
[`documentation/development/`](../development/).

## Routes et indexation

- [ ] Les routes sensibles ont une garde serveur dans `apps/web/src/lib/auth/protected-routes.ts` ou leur contrat équivalent.
- [ ] Le handler vérifie ses capacités et son scope ; l'interface et le proxy ne sont pas considérés comme une autorisation.
- [ ] Les pages privées sont hors indexation et sitemap public.

## Entrées et injections

- [ ] Les entrées externes sont bornées, validées et normalisées.
- [ ] Les URLs utilisent `new URL()` ou `apps/web/src/lib/security/validation.ts`.
- [ ] Les regex sensibles sont bornées et ne contiennent pas de quantificateurs imbriqués non justifiés.
- [ ] Le contrat XSS est respecté pour texte, HTML, styles statiques et données sérialisées dans `<script>`.

## AuthZ, données et secrets

- [ ] Identité, capacité, rôle compatible, ownership/scope et état métier sont vérifiés côté serveur.
- [ ] Les DTO sont minimisés et les cas négatifs de scope sont testés.
- [ ] RLS est active, les RPC sensibles sont permissionnées et `service_role` reste serveur.
- [ ] Une opération privilégiée utilise le contrat d'audit et n'enregistre `success` qu'après l'effet réel.
- [ ] `npm run security:secrets` ne détecte aucun secret.

## Anti-abus

- [ ] Le rate limit est appliqué avec l'identité serveur et le chemin/méthode réels.
- [ ] Les formulaires publics conservent les garde-fous pertinents (`honeypot`, `submittedAt`, BotID) et le contrat HTTP `429`.

## Validation documentaire ciblée

```bash
npm run security:secrets
npm run check:doc-governance
npm run check:stack-doc-drift
git diff --check
```

Pour le code, ajouter les checks de développement adaptés ; cette page ne les
recopie pas.
