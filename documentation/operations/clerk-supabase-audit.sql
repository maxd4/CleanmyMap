-- CleanMyMap: audit simple des comptes Clerk/Supabase, rôles et progression.
-- Ce fichier sert surtout aux contrôles ponctuels et aux diagnostics ciblés.
-- Pour un grand nombre d'utilisateurs, lance plutôt :
--   npm run data:audit:clerk-supabase
-- Exécute chaque requête séparément dans l'éditeur SQL Supabase.
-- Puis exporte le résultat au format CSV si tu veux me le renvoyer.

-- 1) Cartographie des comptes synchronisés dans Supabase.
select
  id,
  display_name,
  role_label,
  handle,
  paris_arrondissement,
  avatar_url,
  created_at,
  updated_at
from public.profiles
order by updated_at desc nulls last, created_at desc;

-- 2) Répartition des rôles dans Supabase.
select
  role_label,
  count(*) as user_count
from public.profiles
group by role_label
order by user_count desc, role_label asc;

-- 3) Vue croisée profils + progression.
select
  p.id,
  p.display_name,
  p.role_label,
  p.handle,
  p.paris_arrondissement,
  coalesce(pp.xp_total, 0) as xp_total,
  coalesce(pp.xp_validated, 0) as xp_validated,
  coalesce(pp.xp_pending, 0) as xp_pending,
  coalesce(pp.current_level, 1) as current_level,
  coalesce(pp.potential_level, 1) as potential_level,
  pp.updated_at as progression_updated_at
from public.profiles p
left join public.progression_profiles pp
  on pp.user_id = p.id
order by p.role_label asc, p.display_name asc;

-- 4) Détail de la progression et des badges dérivés.
select
  id,
  created_at,
  user_id,
  event_type,
  source_table,
  source_id,
  status_phase,
  weight,
  xp_base,
  xp_awarded,
  occurred_on,
  metadata
from public.progression_events
order by created_at desc, id desc
limit 1000;

-- 5) Agrégat des événements de progression par utilisateur.
select
  user_id,
  count(*) as events_count,
  count(*) filter (where status_phase = 'validated') as validated_events_count,
  sum(xp_awarded) as total_xp_awarded,
  max(created_at) as last_event_at
from public.progression_events
group by user_id
order by total_xp_awarded desc nulls last, events_count desc;

-- 6) Optionnel si ton projet utilise encore Supabase Auth quelque part.
-- Si la table est vide, ce n'est pas bloquant: l'auth principale du repo est Clerk.
select
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  raw_app_meta_data
from auth.users
order by created_at desc;
