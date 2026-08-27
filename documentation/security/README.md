# Security Entry Point

Lire cette page avant toute modification concernant API, auth, données, CI, secrets ou surfaces publiques.

## Ordre de lecture

1. `PRE_MERGE_CHECKLIST.md`
2. `SECURITY_QUICK_REFERENCE.md`
3. `SECURITY_GUIDE.md`
4. `authz-authn-regles.md`
5. `authorization-capabilities.md`
6. `url-validation-security.md`
7. `regex-security.md`
8. `../backend/RATE_LIMITING.md`
9. `CODEX_SECURITY_PLAYBOOK.md`
10. `supabase-review-checklist.md`
11. `github-audit-backlog.md`
12. `dependency-advisory-governance.md` pour les acceptations de risque de
    dépendances bornées par advisory et par date

## Principes non négociables

### Secrets

- ne jamais committer un secret ;
- ne jamais exposer `service_role` au client ;
- ne pas considérer la documentation comme sûre par nature ;
- exécuter l'audit de secrets même pour les changements Markdown.

Commande :

```bash
npm run security:secrets
```

### AuthN et AuthZ

Une session valide ne suffit pas.

Vérifier :

1. authentification ;
2. capacité demandée ;
3. rôle compatible avec cette capacité ;
4. ownership, organisation, territoire ou autre scope nécessaire ;
5. état métier ;
6. projection de données autorisée ;
7. audit si dérogation sensible.

Références :

```txt
authz-authn-regles.md
authorization-capabilities.md
```

Ne pas traiter les rôles comme une hiérarchie linéaire. Un rôle métier peut disposer d'une capacité forte dans son périmètre sans obtenir un droit global dans les autres domaines.

### Supabase

- RLS reste active ;
- une policy n'est pas contournée par `service_role` côté client ;
- les RPC ont des droits explicites ;
- les migrations sont versionnées ;
- les fonctions sensibles ont un `search_path` maîtrisé.

### API

Chaque endpoint doit être classé :

- public ;
- authentifié ;
- propriétaire ;
- organisateur ;
- organisation ;
- territoire ;
- admin/modération globale ;
- cron/service ;
- webhook signé.

Ne pas se fier uniquement au proxy : le handler doit vérifier la capacité et le scope nécessaires.

### Validation

Les entrées externes doivent être :

- typées ;
- bornées ;
- validées ;
- normalisées ;
- rejetées explicitement si invalides.

## Routes et indexation

Vérifier :

```txt
apps/web/src/lib/auth/protected-routes.ts
apps/web/src/proxy.ts
apps/web/src/lib/seo/indexability.ts
apps/web/src/app/sitemap.ts
apps/web/src/app/robots.ts
```

Une page privée :

- ne doit pas être indexable ;
- ne doit pas apparaître dans le sitemap public.

## Rate limiting et anti-spam

Pour les formulaires publics, utiliser les helpers existants.

Vérifier :

- quota ;
- IP ou identité selon le flux ;
- honeypot ;
- timestamp ;
- payload maximal ;
- réponse 429 homogène.

## Email de test

Ne pas maintenir deux surfaces aux politiques contradictoires.

La route de test recommandée est :

```txt
/api/email/test
```

avec accès admin.

Si `/api/send` est conservée pour la compatibilité locale, son token de test ne doit jamais contourner l'admin en production.

## Application compagnon

Avant production, vérifier :

- identité cohérente avec Clerk ;
- ownership des missions ;
- stockage sécurisé des sessions ;
- absence de `service_role` dans l'app ;
- RPC compatibles avec le rôle appelant ;
- erreurs de finalisation traitées.

## CI

Contrôles à conserver :

```bash
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run test:security
```

L'audit de secrets doit s'exécuter pour les commits documentaires.

## Helpers structurants

```txt
apps/web/src/lib/security/validation.ts
apps/web/src/lib/seo/indexability.ts
apps/web/src/lib/auth/protected-routes.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/profiles.ts
apps/web/src/lib/actions/permissions.ts
apps/web/src/lib/community/discussion-rate-limit.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/clerk-rls.ts
apps/web/src/lib/rate-limit/server.ts
```

Les permissions métier doivent préférer les helpers de capacité propres au domaine plutôt que des comparaisons de chaînes de rôles dispersées.

## Bloquer une livraison si

- secret probable détecté ;
- route sensible sans contrôle serveur ;
- rôle métier transformé implicitement en permission globale ;
- scope organisation/territoire accepté sans relation canonique ;
- page privée indexable ;
- RLS désactivée pour contourner une erreur ;
- `service_role` exposée au client ;
- webhook sans signature requise ;
- entrée critique non validée ;
- CI plus permissive sans justification ;
- test de sécurité critique absent ou cassé.

## Validation complète

```bash
npm run checks
```
