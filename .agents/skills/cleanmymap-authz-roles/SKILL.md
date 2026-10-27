---
name: cleanmymap-authz-roles
description: "Clerk, rôle attribué ou actif, capability, scope, ownership et garde API CleanMyMap. Utiliser pour modifier ou auditer les droits réels des utilisateurs."
category: repository
risk: high
source: local
tags: "[authz, roles]"
---

# Clerk, rôles et autorisations

## Déclenchement

Activer pour rôle attribué/actif, permissions, garde API, scope, ownership, profil, session Clerk, migration de rôle ou escalade de privilèges. Pour les vulnérabilités XSS, secrets et webhook, compléter avec `cleanmymap-security` plutôt que doubler son audit.

## Contrats à examiner

- `documentation/security/authz-authn-regles.md` pour **CURRENT** ; `documentation/security/authorization-capabilities.md` pour les capacités explicitement `TARGET`.
- `apps/web/src/lib/authz.ts`, `apps/web/src/lib/auth/`, le handler concerné, sa projection Supabase, ses consommateurs et tests.
- `apps/web/src/app/api/AGENTS.md` et le scoped applicable. La navigation produit n'est pas la permission.

## Procédure

1. Identifier l'**acteur réel** côté serveur, la capability effectivement consommée, le scope, l'ownership/la relation canonique et l'état métier.
2. Pour une ressource adressée par ID, tracer le filtrage côté serveur et le comportement après remplacement de l'identifiant par celui d'un tiers (IDOR).
3. Distinguer `GRANTED_ROLE` (`role`), `ACTIVE_ROLE` (`activeRole`) et alias UX `activeProfile`. Le changement d'alias ou de persona n'attribue pas un rôle.
4. Préserver la relation `action_organizers` pour les organisateurs ; ne pas en synthétiser une depuis une allowlist, `service_role` ou un rôle global.
5. Protéger les projections publiques minimales sans fermer arbitrairement des lectures communautaires déjà autorisées.
6. Tester anonyme, acteur autorisé, rôle insuffisant, non-propriétaire, scope hors territoire/organisation, transition d'état et projection de données.

## Preuve et sortie

Tableau ou diagnostic `acteur / capability / scope / ressource / décision / preuve`. Un test d'UI, un bypass local ou une assertion textuelle ne prouve pas une autorisation distante. Ne jamais promouvoir une capacité `TARGET` au rang de comportement livré.
