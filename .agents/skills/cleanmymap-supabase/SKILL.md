---
name: cleanmymap-supabase
description: "Utiliser pour toute tâche CleanMyMap impliquant Supabase, PostgreSQL, migrations, RLS, RPC, Storage, clients serveur, schéma distant, advisors ou diagnostic d'accès aux données."
category: repository
risk: high
source: local
tags: "[supabase, postgres, database, migration, rls, rpc, storage]"
---

# CleanMyMap — Supabase et données

## But

Faire évoluer les données sans créer une seconde source de vérité ni confondre architecture prévue, migration versionnée et état réellement observé du service distant.

## Sources canoniques

Lire en priorité :

- `AGENTS.md` ;
- `apps/web/AGENTS.md` ;
- `apps/web/supabase/AGENTS.md` ;
- documentation `database/` directement concernée ;
- migrations, callers, types et tests du domaine.

## Invariants

- L'unique arbre de migrations éditable est `apps/web/supabase/migrations/`.
- Une modification SQL durable passe par une migration versionnée ; ne pas créer un second arbre.
- Les migrations publiées sont append-only sauf exception explicitement gouvernée.
- Vérifier ensemble schéma, types, routes/RPC, UI et tests quand le contrat change.
- Auditer RLS, grants, ownership, rôles appelants, `search_path`, `SECURITY DEFINER/INVOKER`, triggers et vues concernés.
- `service_role` reste serveur uniquement.
- Un test statique SQL ne prouve pas les sémantiques d'une base réellement exécutée.
- Ne jamais inventer l'état de Supabase : distinguer source Git, observation distante et preuve d'application.

## Mutations distantes

Une lecture structurée peut être utilisée pour observer le projet. Une migration distante, un `db push`, un repair ou toute DDL mutative nécessite le contrat et l'autorisation prévus par la gouvernance. Un dry-run ne prouve pas une application réelle.

Les logs Supabase sont une ressource coûteuse : n'y recourir que si une autre preuve ne suffit pas, avec fenêtre et requête minimales selon `apps/web/supabase/AGENTS.md`.

## Validation

Utiliser les checks Supabase/security/typecheck et tests de contrat directement concernés définis par le scoped `AGENTS.md`. Ne pas déclarer une migration appliquée sans preuve distante correspondante.
