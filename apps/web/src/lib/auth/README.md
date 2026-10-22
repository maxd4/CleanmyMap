# Authentification web — owner runtime des identités

**Statut : CURRENT pour les modules listés.** L'identité provient de Clerk. Une valeur de formulaire, un alias ou un profil UX actif n'est jamais une autorisation.

| Module | Responsabilité |
|---|---|
| `role-resolution.ts` | Lit `publicMetadata.role` ; rôle canonique serveur et contrainte owner du rôle `max` |
| `role-aliases.json` | Normalisation des libellés **entrants** de compatibilité ; ne confère aucun rôle |
| `sync.ts` | Synchronisation ciblée des profils projetés vers Supabase |
| `dev-auth.ts` | Bypass strictement local, jamais source de rôle en production |

## Contrats à distinguer

- [AuthN/AuthZ CURRENT](../../../../../documentation/security/authz-authn-regles.md) définit les contrôles effectivement applicables et les preuves nécessaires côté serveur.
- [Modèle par capacités](../../../../../documentation/security/authorization-capabilities.md) est `PLAN / TARGET` : ne pas interpréter sa matrice comme des permissions déjà déployées.
- `apps/web/src/lib/authz.ts` porte des gardes d'accès ; la décision sur une ressource doit aussi vérifier le scope, l'ownership, l'état métier et la projection autorisée.
- `GRANTED_ROLE`, `ACTIVE_ROLE` et `activeProfile` ont des fonctions distinctes. Un changement de persona ne doit pas pouvoir accroître le rôle obtenu.

**Interdits :** inférer `admin` ou `max` d'un email, de `privateMetadata`, d'un alias ou d'une valeur client ; réutiliser `service_role` comme permission utilisateur ; faire d'un contrôle d'UI ou du proxy la seule frontière.

Pour une modification, conserver les cas négatifs anonymous/non-owner/role insuffisant et les consommateurs de la synchronisation ; utiliser les tests de la capacité et le typecheck adaptés.
