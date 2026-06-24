-- 20260623000000_quiz_pedagogical_metrics.sql
-- Agrégats pédagogiques anonymes du quiz CleanMyMap

create table if not exists public.quiz_pedagogical_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bucket_type text not null,
  bucket_key text not null,
  attempts integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  session_count integer not null default 0,
  last_seen_at timestamptz,
  unique(bucket_type, bucket_key)
);

create index if not exists idx_quiz_pedagogical_metrics_bucket
  on public.quiz_pedagogical_metrics(bucket_type, bucket_key);

create index if not exists idx_quiz_pedagogical_metrics_last_seen
  on public.quiz_pedagogical_metrics(last_seen_at desc);

create or replace function public.increment_quiz_pedagogical_metric(
  p_bucket_type text,
  p_bucket_key text,
  p_attempts integer default 0,
  p_correct_count integer default 0,
  p_wrong_count integer default 0,
  p_session_count integer default 0,
  p_last_seen_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quiz_pedagogical_metrics (
    bucket_type,
    bucket_key,
    attempts,
    correct_count,
    wrong_count,
    session_count,
    last_seen_at
  )
  values (
    p_bucket_type,
    p_bucket_key,
    greatest(0, coalesce(p_attempts, 0)),
    greatest(0, coalesce(p_correct_count, 0)),
    greatest(0, coalesce(p_wrong_count, 0)),
    greatest(0, coalesce(p_session_count, 0)),
    p_last_seen_at
  )
  on conflict (bucket_type, bucket_key) do update
    set attempts = public.quiz_pedagogical_metrics.attempts + excluded.attempts,
        correct_count = public.quiz_pedagogical_metrics.correct_count + excluded.correct_count,
        wrong_count = public.quiz_pedagogical_metrics.wrong_count + excluded.wrong_count,
        session_count = public.quiz_pedagogical_metrics.session_count + excluded.session_count,
        last_seen_at = greatest(coalesce(public.quiz_pedagogical_metrics.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
        updated_at = now();
end;
$$;

alter table public.quiz_pedagogical_metrics enable row level security;

drop policy if exists quiz_pedagogical_metrics_service_role on public.quiz_pedagogical_metrics;
create policy quiz_pedagogical_metrics_service_role on public.quiz_pedagogical_metrics
for all using (auth.role() = 'service_role');

create trigger tr_quiz_pedagogical_metrics_updated_at
  before update on public.quiz_pedagogical_metrics
  for each row
  execute function public.handle_updated_at();
