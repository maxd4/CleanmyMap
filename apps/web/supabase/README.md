# Supabase web — source des migrations

Ce dossier est l'unique workspace Supabase suivi pour l'application web. Les
migrations éditables vivent exclusivement dans [`migrations/`](migrations/),
avec `config.toml` et `seed.sql` pour le contexte local versionné.

## Avant toute opération

- lire la [gouvernance Supabase](AGENTS.md) et l'[ADR-006](../../../documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md) ;
- vérifier le projet et la cible liés avec les commandes read-only adaptées ;
- contrôler l'historique et exécuter `npx supabase db push --dry-run` depuis
  `apps/web` avant une application autorisée ;
- ne jamais désactiver RLS, publier un secret ou créer un second arbre de
  migrations.

Un vrai `npx supabase db push` est une mutation distante distincte de la
validation locale et exige une autorisation explicite. Le README web décrit
les scripts `backend:supabase:push` et `backend:bootstrap` ainsi que leurs
effets ; ce fichier ne les réimplémente pas.

## Contrats

Les changements SQL doivent rester append-only, auditer RLS/policies/grants et
être accompagnés des types, routes, RPC et tests directement concernés. La
sémantique PostgreSQL réellement exécutée ne se déduit pas d'une lecture de
migration ; si l'environnement autorisé n'est pas disponible, rapporter
`DB_SEMANTICS_NOT_EXECUTED`.
