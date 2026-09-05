# Admin domain helpers

Ce dossier contient les contrats transversaux et helpers propres aux surfaces d'administration de CleanMyMap.

Il ne doit pas devenir un répertoire générique pour toute logique utilisée par une page admin. La logique métier reste dans son domaine d'origine lorsqu'elle appartient à Actions, Community, Reports, Supabase, etc.

## Frontières

```text
lib/admin/
├── audit/        journal transversal des opérations administratives
├── import/       preuve du parcours dry-run / confirmation d'import
├── moderation/   outils de revue admin des actions et signalements
├── access.ts     compatibilité / helpers d'accès admin
├── response.ts   réponses et identifiants d'opération admin
└── autres modules admin spécialisés conservés à la racine
```

Les sous-dossiers possèdent leurs propres README.

## Audit

Répertoire :

```text
apps/web/src/lib/admin/audit/
```

Module canonique :

```text
operation-audit.ts
```

Il persiste et lit `admin_operations_audit`.

Le contrat documentaire complet est :

```text
documentation/security/admin-operation-audit.md
```

`email-test-audit.ts` est un adaptateur borné pour les routes d'email de test. Il ne remplace pas le journal canonique.

## Import

Répertoire :

```text
apps/web/src/lib/admin/import/
```

`dry-run-proof.ts` construit et vérifie la preuve entre un dry-run d'import et sa confirmation.

La mutation métier de l'import reste dans le domaine Actions. Ce dossier ne doit pas devenir un second service d'import.

## Modération

Répertoire :

```text
apps/web/src/lib/admin/moderation/
```

Il contient les outils directement liés aux écrans et opérations de revue admin :

- schémas de corrections de modération ;
- client de modération ;
- lecture et mutation des signalements modérables.

L'audit spécialisé Actions reste volontairement dans :

```text
apps/web/src/lib/actions/moderation-audit.ts
```

Cette séparation signifie :

```text
mécanisme transversal d'audit
→ lib/admin/audit

contrat métier d'audit Actions
→ lib/actions
```

## AuthN / AuthZ

Ce dossier ne définit pas à lui seul les permissions.

Références canoniques :

```text
apps/web/src/lib/authz.ts
apps/web/src/lib/profiles.ts
documentation/security/authz-authn-regles.md
documentation/security/authorization-capabilities.md
```

Rappel de vocabulaire :

```text
max = identifiant technique canonique
IMU = libellé produit
super-admin = alias de max
```

Ces termes désignent le même rôle utilisateur. `service_role` reste une identité technique serveur distincte.

## Règles de placement

Avant d'ajouter un fichier dans `lib/admin`, déterminer sa responsabilité.

Placer ici :

- mécanisme transversal d'audit admin ;
- helper réellement partagé par plusieurs surfaces admin ;
- contrat propre au backoffice et non à un domaine métier autonome.

Ne pas placer ici par défaut :

- logique métier Actions ;
- logique Community ;
- persistence Reports ;
- logique Supabase générique ;
- service email global ;
- permissions métier uniquement parce qu'une page admin les consomme.

## Règles d'audit

Une mutation ou un effet externe privilégié doit suivre le contrat :

```text
documentation/security/admin-operation-audit.md
```

Principes principaux :

- AuthZ avant audit ;
- acteur canonique issu du serveur ;
- une tentative = un audit final pertinent ;
- `success` seulement après effet réussi ;
- stages et codes bornés ;
- `partialMutation` uniquement lorsqu'une écriture partielle est connue ;
- before/after par allowlist ;
- aucune PII ou erreur fournisseur brute.

## Imports

Préférer des imports directs :

```ts
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
```

Ne pas créer de barrel export uniquement pour raccourcir les chemins.

Les chemins de sous-dossiers expriment la responsabilité et doivent rester visibles.

## Tests

Lors d'un déplacement ou d'une évolution :

- mettre à jour les mocks Vitest ;
- vérifier les routes consommatrices ;
- exécuter les tests ciblés ;
- exécuter le typecheck ;
- rechercher les anciens chemins ;
- vérifier `git diff --check`.

Une restructuration ne doit pas modifier silencieusement les contrats runtime.
