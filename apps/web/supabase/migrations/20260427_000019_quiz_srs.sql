-- Spaced Repetition System (SRS) pour les Quiz
-- Stockage de l'état de maîtrise des questions par utilisateur

create table if not exists public.quiz_srs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text not null, -- ID Clerk
  question_id text not null,
  
  -- Stats SRS
  last_seen_at timestamptz,
  next_review_at timestamptz not null default now(),
  success_count integer not null default 0,
  failure_count integer not null default 0,
  streak integer not null default 0,
  ease_factor double precision not null default 2.5,
  mastery_level integer not null default 0, -- 0 à 5
  
  unique(user_id, question_id)
);

-- Index pour la performance des requêtes de révision
create index if not exists idx_quiz_srs_user_review on public.quiz_srs(user_id, next_review_at);

-- RLS
alter table public.quiz_srs enable row level security;

drop policy if exists quiz_srs_owner_all on public.quiz_srs;
create policy quiz_srs_owner_all on public.quiz_srs
for all using (
  auth.role() = 'service_role'
  or user_id = coalesce(auth.jwt() ->> 'sub', '')
);

-- Trigger pour updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_quiz_srs_updated_at
  before update on public.quiz_srs
  for each row
  execute function public.handle_updated_at();
