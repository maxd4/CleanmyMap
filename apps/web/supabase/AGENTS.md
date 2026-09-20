# Gouvernance locale — `apps/web/supabase`

Héritage : gouvernance racine → `apps/web/AGENTS.md` → ce périmètre Supabase.
Ces règles concernent la configuration et les migrations du workspace web.

## Arbre de migrations

- `apps/web/supabase/migrations/` est l'unique arbre de migrations éditable et
  canonique ;
- ne créer ni migration ni copie dans un second arbre ;
- les migrations sont append-only. Une exception de replay strictement bornée
  peut corriger localement une migration déjà appliquée uniquement si les
  conditions et la justification de l'ADR-006 sont respectées ; cette
  exception ne permet pas la réécriture générale des migrations publiées ;
- garder la migration et le code consommateur cohérents : schéma, types,
  routes, RPC, UI et tests doivent évoluer ensemble lorsque nécessaire.

## Requêtes et contrats de données

- les changements SQL passent par une migration versionnée ;
- vérifier les erreurs de chaque opération Supabase ;
- régénérer ou réaligner les types lorsqu'un schéma change ;
- avant une requête coûteuse, consulter
  `documentation/database/supabase-table-optimization-playbook.md` ;
- vérifier les permissions pour les chemins propriétaire/non-propriétaire,
  connecté/anonyme et privilégié.

## Sécurité des changements SQL

Toute création ou modification d'une table exposée doit auditer :

- RLS et policies ;
- grants, ownership et rôles appelants ;
- `search_path` ;
- `SECURITY DEFINER` / `SECURITY INVOKER` ;
- contrats RPC, fonctions, triggers et vues concernés.

Ne jamais désactiver RLS pour débloquer un flux. Ne jamais introduire
`service_role` côté client ; ce secret reste réservé aux opérations serveur
autorisées.

## Validation Supabase ciblée

Avant de clôturer un changement de migration ou de contrat SQL :

```bash
npm run audit:supabase-migration-trees
npm run test:security -w apps/web
npm run typecheck -w apps/web
```

Ajouter les tests de contrat SQL/RPC directement concernés. Toute application
distante d'une migration reste une opération explicitement autorisée et
distincte de la validation locale.

## Workflow distant lié et diagnostic d'accès

Le workflow local supporté utilise `npx supabase` contre le projet distant
explicitement lié. Depuis `apps/web`, les contrôles read-only de base sont :

```bash
npx supabase projects list
npx supabase branches list --project-ref <project-ref> --output json
npx supabase migration list --linked
npx supabase db advisors --linked
```

`npx supabase link --project-ref <project-ref>` enregistre la cible locale ;
il ne prouve pas qu'une migration est appliquée sur le projet distant. La
preuve d'alignement de l'historique repose sur
`npx supabase migration list --linked`, après vérification de la paire
`local`/`remote`.

En cas de `403`, diagnostiquer l'accès dans cet ordre :

1. vérifier la présence, la fraîcheur et le périmètre de
   `SUPABASE_ACCESS_TOKEN` sans afficher sa valeur ;
2. vérifier l'identité utilisée par le CLI avec `npx supabase projects list` ;
3. confirmer que le projet et son organisation sont visibles par cette
   identité, puis relancer le contrôle concerné.

Si le projet n'est pas visible, classer l'incident comme un mauvais compte,
une mauvaise organisation, un rôle insuffisant ou un token sans le scope
requis. Pour les advisors liés, le token doit également disposer de la
permission `advisors_read`. Ne pas conclure à une anomalie Supabase avant ces
vérifications.

`npx supabase db push`, `npx supabase migration repair` et
`npx supabase db reset` ne sont pas des remèdes à un problème d'authentification
ou de scope. Ils sont soit mutatifs, soit réservés au replay CI explicitement
autorisé, et ne doivent pas être utilisés pour contourner un `403`.

## Runtime local non supporté

- Docker, WSL, Supabase local et les autres runtimes de conteneurs ne font plus
  partie de l'environnement de développement et de validation locale supporté
  sur le poste utilisateur.
- Ne jamais demander à Codex d'installer, démarrer, sonder ou arrêter Docker,
  WSL, un daemon ou un runtime de conteneurs localement.
- Cette règle n'interdit pas un runtime de conteneurs fourni par un runner CI
  hébergé et éphémère, exclusivement dans une CI explicitement dédiée au replay
  Supabase.
- `supabase start`, `supabase status` et `supabase db reset` sont exclus du
  workflow local CURRENT. Ils peuvent uniquement être utilisés dans une CI
  hébergée et éphémère explicitement dédiée au replay Supabase.
- Toute opération locale qui exige réellement un runtime conteneurisé est
  classée `UNSUPPORTED_CONTAINER_RUNTIME` ; ne pas demander l'installation
  d'un runtime en guise de fallback.
- Les opérations Supabase courantes utilisent `npx supabase` contre le projet
  distant explicitement lié. Les commandes distantes en lecture, dont les
  advisors avec `--linked`, restent autorisées ; toute mutation distante reste
  explicite et séparée.
- `apps/web/supabase/config.toml` et l'arbre des migrations restent canoniques.
  Leur conservation ne constitue pas un support du runtime Supabase local.
