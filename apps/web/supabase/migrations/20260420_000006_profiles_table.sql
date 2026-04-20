-- Sync Clerk Profiles into Supabase

create table if not exists public.profiles (
  id text primary key, -- matches Clerk user ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text not null,
  role_label text not null default 'benevole',
  avatar_url text
);

alter table public.profiles enable row level security;

-- Everyone can see profiles
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);

-- Only owner can modify (via sync helper or direct client if needed)
drop policy if exists profiles_all_owner on public.profiles;
create policy profiles_all_owner on public.profiles
for all using (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
);

-- Trigger for updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();
