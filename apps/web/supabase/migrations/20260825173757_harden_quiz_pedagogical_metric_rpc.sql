-- Restrict the pedagogical metric RPC to the server-side service role and
-- reject malformed or unbounded metric increments in the database as well.

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
set search_path = pg_catalog, public
as $$
begin
  if p_bucket_type is null or p_bucket_type not in ('question', 'mode', 'skill', 'error_type') then
    raise exception 'invalid quiz pedagogical metric bucket_type'
      using errcode = '22023';
  end if;

  if p_bucket_key is null
     or btrim(p_bucket_key) = ''
     or p_bucket_key <> btrim(p_bucket_key)
     or char_length(p_bucket_key) > 200 then
    raise exception 'invalid quiz pedagogical metric bucket_key'
      using errcode = '22023';
  end if;

  if p_attempts is null or p_attempts < 0 or p_attempts > 50 then
    raise exception 'invalid quiz pedagogical metric attempts increment'
      using errcode = '22023';
  end if;

  if p_correct_count is null or p_correct_count < 0 or p_correct_count > 50 then
    raise exception 'invalid quiz pedagogical metric correct_count increment'
      using errcode = '22023';
  end if;

  if p_wrong_count is null or p_wrong_count < 0 or p_wrong_count > 50 then
    raise exception 'invalid quiz pedagogical metric wrong_count increment'
      using errcode = '22023';
  end if;

  if p_session_count is null or p_session_count < 0 or p_session_count > 1 then
    raise exception 'invalid quiz pedagogical metric session_count increment'
      using errcode = '22023';
  end if;

  if p_correct_count + p_wrong_count <> p_attempts then
    raise exception 'quiz pedagogical metric counters must balance attempts'
      using errcode = '22023';
  end if;

  if (p_bucket_type = 'mode' and p_session_count <> 1)
     or (p_bucket_type <> 'mode' and p_session_count <> 0) then
    raise exception 'quiz pedagogical metric session_count does not match bucket_type'
      using errcode = '22023';
  end if;

  if p_last_seen_at is null
     or p_last_seen_at < now() - interval '24 hours'
     or p_last_seen_at > now() + interval '5 minutes' then
    raise exception 'invalid quiz pedagogical metric last_seen_at'
      using errcode = '22023';
  end if;

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
    p_attempts,
    p_correct_count,
    p_wrong_count,
    p_session_count,
    p_last_seen_at
  )
  on conflict (bucket_type, bucket_key) do update
    set attempts = public.quiz_pedagogical_metrics.attempts + excluded.attempts,
        correct_count = public.quiz_pedagogical_metrics.correct_count + excluded.correct_count,
        wrong_count = public.quiz_pedagogical_metrics.wrong_count + excluded.wrong_count,
        session_count = public.quiz_pedagogical_metrics.session_count + excluded.session_count,
        last_seen_at = greatest(
          coalesce(public.quiz_pedagogical_metrics.last_seen_at, excluded.last_seen_at),
          excluded.last_seen_at
        ),
        updated_at = now();
end;
$$;

revoke all on function public.increment_quiz_pedagogical_metric(text, text, integer, integer, integer, integer, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_quiz_pedagogical_metric(text, text, integer, integer, integer, integer, timestamptz)
  to service_role;
