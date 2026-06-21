-- 20260613000000_quiz_type_progress.sql
-- Progression des bonnes réponses par type de quiz

create table if not exists public.quiz_type_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text not null,
  question_type text not null,
  correct_count integer not null default 0,
  unique(user_id, question_type)
);

create index if not exists idx_quiz_type_progress_user_type
  on public.quiz_type_progress(user_id, question_type);

alter table public.quiz_type_progress enable row level security;

drop policy if exists quiz_type_progress_owner_all on public.quiz_type_progress;
create policy quiz_type_progress_owner_all on public.quiz_type_progress
for all using (
  auth.role() = 'service_role'
  or user_id = coalesce(auth.jwt() ->> 'sub', '')
);

create trigger tr_quiz_type_progress_updated_at
  before update on public.quiz_type_progress
  for each row
  execute function public.handle_updated_at();
