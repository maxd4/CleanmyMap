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
