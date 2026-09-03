# Gouvernance locale — `apps/web/supabase`

Héritage : gouvernance racine → `apps/web/AGENTS.md` → ce périmètre Supabase.
Ces règles concernent la configuration et les migrations du workspace web.

## Arbre de migrations

- `apps/web/supabase/migrations/` est l'unique arbre de migrations éditable et
  canonique ;
- ne créer ni migration ni copie dans un second arbre ;
- les migrations sont append-only, sauf correction explicitement justifiée
  d'une migration non publiée ;
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

## Disponibilité du runtime local

- Docker et Supabase local sont strictement on-demand : ne jamais lancer
  automatiquement Docker Desktop, WSL, un daemon Docker ou un runtime de
  conteneurs pour satisfaire une validation.
- Avant toute commande Supabase qui nécessite Docker, effectuer uniquement un
  probe borné de disponibilité du daemon, limité à quelques secondes. Si le
  probe échoue ou dépasse ce délai, enregistrer `LOCAL_SUPABASE_UNAVAILABLE` et
  ne lancer ni `supabase start`, ni `supabase status`, ni `supabase db reset`, ni
  une boucle de tentatives sur le CLI.
- Lorsque le probe réussit et que la tâche exige explicitement le runtime local,
  exécuter la commande locale nécessaire depuis `apps/web/supabase`, sans
  démarrage implicite ni processus persistant non requis.
- Poursuivre toutes les validations indépendantes de Docker. Toute preuve qui
  nécessite PostgreSQL ou Supabase local doit rester marquée explicitement
  `NON_PROUVÉE` lorsque le runtime est indisponible ; cette absence ne doit pas
  bloquer artificiellement les autres validations.
- Les accès MCP ou `--linked` ne doivent jamais servir à appliquer une
  migration en production pour compenser l'absence de Docker. Toute
  alternative distante de test ou de preview doit être explicitement autorisée
  avant son utilisation.
