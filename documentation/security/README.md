# Security Entry Point

Lire cette page avant toute modification concernant API, auth, données, CI, secrets ou surfaces publiques.

## Ordre de lecture

1. `PRE_MERGE_CHECKLIST.md`
2. `SECURITY_QUICK_REFERENCE.md`
3. `SECURITY_GUIDE.md`
4. `authz-authn-regles.md`
5. `authorization-capabilities.md`
6. `admin-operation-audit.md`
7. `url-validation-security.md`
8. `regex-security.md`
9. `../backend/RATE_LIMITING.md`
10. `CODEX_SECURITY_PLAYBOOK.md`
11. `supabase-review-checklist.md`
12. `github-audit-backlog.md`
13. `dependency-advisory-governance.md` pour l'état courant de la mitigation
    par backport local versionné `image-size@2.0.3`, couvrant les advisories
    documentées, sans expiration ni renouvellement périodique

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
admin-operation-audit.md
```

Ne pas traiter les rôles comme une hiérarchie linéaire. Un rôle métier peut disposer d'une capacité forte dans son périmètre sans obtenir un droit global dans les autres domaines.

### Audit des opérations admin

Une opération admin mutable ou un effet externe privilégié doit être évalué selon le contrat `admin-operation-audit.md`.

Règles essentielles :

- AuthZ avant audit ;
- acteur canonique issu de l'identité serveur ;
- une tentative autorisée = un audit final pertinent ;
- `success` uniquement après effet réussi ;
- `partialMutation` uniquement si une écriture partielle est connue ;
- before/after par allowlist ;
- stages et codes d'erreur bornés ;
- aucune PII, payload brut ou erreur fournisseur dans le journal.

Le mécanisme transversal est :

```txt
apps/web/src/lib/admin/audit/operation-audit.ts
```

Le domaine Actions conserve sa spécialisation :

```txt
apps/web/src/lib/actions/moderation-audit.ts
```

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

Si `/api/send` est conservée pour la compatibilité locale, son token de test ne doit jamais contourner l'admin en production et le parcours local ne doit pas être artificiellement journalisé comme une opération admin sans acteur canonique.

Les envois de test effectués par un admin suivent `admin-operation-audit.md`.

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
apps/web/src/lib/admin/audit/operation-audit.ts
apps/web/src/lib/actions/moderation-audit.ts
apps/web/src/lib/community/discussion-rate-limit.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/clerk-rls.ts
apps/web/src/lib/rate-limit/server.ts
```

Les permissions métier doivent préférer les helpers de capacité propres au domaine plutôt que des comparaisons de chaînes de rôles dispersées.

## Bloquer une livraison si

- secret probable détecté ;
- route sensible sans contrôle serveur ;
- mutation admin sensible non auditée sans justification ;
- audit déclarant un succès avant l'effet réel ;
- audit contenant PII, payload brut ou erreur fournisseur sans nécessité contractuelle ;
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
