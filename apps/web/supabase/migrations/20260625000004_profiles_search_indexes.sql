create extension if not exists pg_trgm;

create index if not exists idx_profiles_display_name
  on public.profiles(display_name);

create index if not exists idx_profiles_handle_trgm
  on public.profiles using gin (handle gin_trgm_ops);

create index if not exists idx_profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
