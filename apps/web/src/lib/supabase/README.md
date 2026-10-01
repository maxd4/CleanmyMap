# Capacité Supabase web

Cette arborescence porte les clients, adaptateurs serveur et contrats de
lecture/écriture utilisés par l'application web.

## Frontière

- `client.ts` expose le client adapté au navigateur ;
- `server.ts` et les modules serveur portent les accès côté serveur ;
- les contrats RLS, grants, RPC et migrations restent vérifiés par les tests
  spécialisés et par `apps/web/supabase/` ;
- le secret `service_role` ne doit jamais entrer dans un bundle client.

Les modules de ce dossier ne sont pas un second arbre de migrations et ne
remplacent pas la gouvernance distante définie dans
[`apps/web/supabase/AGENTS.md`](../../../supabase/AGENTS.md). Les changements de
schéma passent par une migration versionnée et par les validations Supabase
applicables.

## Tests

Les tests de contrats SQL/migration versionnés vivent dans
[`migration-contracts/`](./migration-contracts/) : il s'agit des fichiers
`*-migration.test.ts` et `recovered-migrations.test.ts`. Ils lisent uniquement
les migrations suivies sous `apps/web/supabase/migrations/` et ne les modifient
pas.

Les clients et le runtime restent à la racine de cette arborescence
(`client.ts`, `server.ts`, `clerk-rls.ts`). Les tests de runtime,
de permissions, de RLS ou d'advisors qui ne sont pas strictement des contrats
de migration restent également à ce niveau.

Préserver le fail-closed : une erreur ou une permission inattendue doit rester
visible, et un dry-run ne doit jamais être présenté comme une application
distante. Aucun test de ce périmètre ne doit appliquer une migration ni muter
un état Supabase distant.

Pour une modification ciblée, commencer par le test de contrat concerné,
puis utiliser les validations web et Supabase définies par les
`AGENTS.md` applicables.
