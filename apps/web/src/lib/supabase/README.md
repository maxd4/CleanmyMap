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

Les fichiers `*.test.ts` caractérisent les contrats de migration, RLS,
privilèges, optimisation et accès. Préserver le fail-closed : une erreur ou
une permission inattendue doit rester visible, et un dry-run ne doit jamais
être présenté comme une application distante.

Pour une modification ciblée, commencer par le test de contrat concerné,
puis utiliser les validations web et Supabase définies par les
`AGENTS.md` applicables.
