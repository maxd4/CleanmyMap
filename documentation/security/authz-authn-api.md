# Secrets, API et validation

> Module associé à [authz-authn-regles.md](./authz-authn-regles.md). Statut : CURRENT.

## Secrets

Les secrets restent côté serveur.

Exemples :

```txt
SUPABASE_SERVICE_ROLE_KEY
CLERK_SECRET_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CRON_SECRET
```

Commande :

```bash
npm run security:secrets
```

## Frontières API

Le test :

```txt
apps/web/src/app/api/api-boundary.test.ts
```

doit protéger au minimum :

- familles API sensibles ;
- health endpoints publics ;
- absence de doublons dans les patterns protégés.

Tests complémentaires :

```txt
apps/web/src/proxy.protected-routes.test.ts
apps/web/src/lib/seo/indexability.test.ts
```

Le fait qu'une route soit protégée ne prouve pas que chaque capacité interne de cette route est autorisée correctement.

La frontière account/profile suit en plus ce tableau :

| Route | But | Écriture autorisée | Autorité AuthZ |
|---|---|---|---|
| `POST /api/account/active-profile` | Changer le rôle actif / la persona UX | `activeRole` uniquement ; `activeProfile` accepté comme entrée legacy | session + `role` réel + `getSwitchableProfiles(role)` |
| `POST /api/account/profile-role` | Ancien sélecteur de rôle | aucune ; route retirée (`410`) | session seulement pour retourner le retrait |

Une réponse positive de la mutation doit retourner le `role` résolu,
`activeRole` et l'`activeProfile` appliqué afin que le client puisse se
réaligner sans réinterpréter les métadonnées Clerk.

## Annuaire partenaire : frontière de publication

`/partners/dashboard` est une surface de gouvernance admin-only : sa page appelle
`requireAdminAccess()` avant toute lecture des demandes, fiches ou contacts
persistés. La capacité est calculée depuis `ACTIVE_ROLE` ; `admin` et `max` sont
acceptés, tandis qu’un rôle attribué mais actif `benevole`, `elu` ou autre ne
reçoit ni les données privées ni le panneau de revue.

`POST /api/partners/onboarding-requests` exige une session Clerk et conserve
la demande dans `partner_onboarding_requests`. La fiche liée est créée dans
`partner_annuaire_entries` par une RPC server-only idempotente ; une création
ne vaut jamais validation administrative.

La soumission accepte une clé `Idempotency-Key` stable (16 à 160 caractères)
pour une même intention ; à défaut, l'ancien `submittedAt` reste accepté pour
compatibilité. La clé est bornée par l'identité Clerk côté serveur. Un replay
du même payload retourne la demande existante sans renvoyer les notifications
administratives (`200`), tandis qu'une réutilisation avec payload, email
d'acteur, périmètre ou consentement différent est refusée (`409`) avant toute
nouvelle écriture. Une création initiale retourne `201`.

`POST /api/admin/partners/published-directory` exige `requireAdminAccess`, un
motif et la confirmation explicite existante. La RPC de revue synchronise la
demande source, la fiche et `admin_operations_audit` dans une transaction.
Seule la décision `accepted` rend la fiche éligible à la projection publique ;
`pending_admin_review` et `rejected` restent invisibles.

La table annuaire est RLS server-only. La projection publique ne contient pas
`private_admin_contact`, et une panne de cette lecture est une erreur de
service, non une réponse `200` avec zéro fiche.

## Checklist avant modification sensible

```txt
□ Session requise ?
□ Capacité exacte identifiée ?
□ Rôle compatible ?
□ Scope minimal identifié ?
□ Ownership / organisation / territoire vérifié côté serveur ?
□ État métier vérifié ?
□ Projection de données minimale ?
□ Input validé ?
□ RLS cohérente ?
□ RPC correctement permissionnée ?
□ Override séparé du flux normal ?
□ Motif requis ?
□ Audit requis ?
□ Tests négatifs de scope présents ?
```

## Validation

```bash
npm run test:security
npm run test
npm run typecheck
npm run lint
```

Pour une modification structurante :

```bash
npm run checks
```

## Références

```txt
documentation/security/authorization-capabilities.md
documentation/architecture/adr/ADR-007-capability-scoped-authorization.md
apps/web/src/lib/domain-language.ts
apps/web/src/lib/profiles.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/actions/permissions.ts
```

## Frontière serveur SECURITY-03

Les routes qui utilisent un client Supabase privilégié gardent leur décision
d'accès HTTP explicite : `service_role` est seulement un moyen technique et ne
prouve jamais l'identité, la capacité, le scope ou l'ownership de l'appelant.
Les identifiants, chemins de fichier, filtres et paramètres d'agrégation sont
donc validés avant chaque lecture ou mutation sensible.

`GET /api/reports/elus-dossier` reste disponible aux comptes connectés pour une
projection agrégée bornée. Le JSON et le Markdown ne contiennent pas les
identifiants individuels nécessaires aux traitements internes. Les anciennes
lignes `reports.file_path` ne sont pas suffisantes pour signer un objet Storage
privé : faute de métadonnées canoniques liant fichier, scope et payload, la
route refuse le cache legacy et conserve l'export PDF généré dans le navigateur.

Un `bug_report` est acheminé uniquement vers `CLERK_IMU_OWNER_USER_ID` après
lecture Clerk fraîche et confirmation du couple identifiant exact +
`publicMetadata.role=max`. Une panne Clerk, une configuration absente ou un
rôle non conforme produisent une indisponibilité explicite ; aucune ligne
`profiles.role_label=admin` et aucun identifiant de l'expéditeur ne peuvent
devenir un destinataire de remplacement.

Les routes de promotion, de gestion des rôles, de profil actif, de compte
mobile et d'export coûteux appliquent le rate limit distribué existant avec
une politique fail-closed. Les lectures publiques restent les seules surfaces
qui peuvent utiliser le best-effort lorsque leur contrat l'autorise.
