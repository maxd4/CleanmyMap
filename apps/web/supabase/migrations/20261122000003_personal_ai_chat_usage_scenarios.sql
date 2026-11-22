begin;

alter table public.personal_ai_declarations
  add column quick_scenario jsonb;

-- The technical declaration contract permits UNKNOWN; quick scenarios need it
-- because free/subscription access does not establish API or local ownership.
alter table public.personal_ai_declarations
  drop constraint personal_ai_declaration_shape;

alter table public.personal_ai_declarations
  add constraint personal_ai_declaration_shape check (
    jsonb_typeof(declaration) = 'object'
    and declaration - array[
      'normalizationVersion', 'provider', 'source', 'sourceVersion', 'provenance',
      'granularity', 'periodStartUtc', 'periodEndUtc', 'modelRaw', 'modelCanonical',
      'operator', 'execution', 'inferenceRegion', 'access', 'requestCount', 'tokens',
      'modality', 'energy'
    ]::text[] = '{}'::jsonb
    and declaration ?& array[
      'normalizationVersion', 'provider', 'source', 'sourceVersion', 'provenance',
      'granularity', 'periodStartUtc', 'periodEndUtc', 'modelRaw', 'modelCanonical',
      'operator', 'execution', 'inferenceRegion', 'access', 'requestCount', 'tokens',
      'modality', 'energy'
    ]::text[]
    and jsonb_typeof(declaration -> 'tokens') = 'object'
    and declaration -> 'tokens' - array[
      'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
      'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
    ]::text[] = '{}'::jsonb
    and (declaration -> 'tokens') ?& array[
      'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
      'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
    ]::text[]
    and jsonb_typeof(declaration -> 'modality') = 'object'
    and declaration -> 'modality' - array['images', 'audioMinutes', 'videoSeconds']::text[] = '{}'::jsonb
    and (declaration -> 'modality') ?& array['images', 'audioMinutes', 'videoSeconds']::text[]
    and jsonb_typeof(declaration -> 'energy') = 'object'
    and declaration -> 'energy' - array[
      'kwh', 'boundary', 'evidence', 'averageWatts', 'durationSeconds', 'idleWatts'
    ]::text[] = '{}'::jsonb
    and (declaration -> 'energy') ?& array[
      'kwh', 'boundary', 'evidence', 'averageWatts', 'durationSeconds', 'idleWatts'
    ]::text[]
    and declaration ->> 'normalizationVersion' = 'personal-ai-declaration-v1'
    and declaration ->> 'provider' in ('MANUAL', 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'MISTRAL', 'OTHER')
    and declaration ->> 'source' in ('MANUAL', 'PROVIDER_EXPORT', 'PROVIDER_DASHBOARD', 'LOCAL_LOG')
    and declaration ->> 'provenance' in ('USER_DECLARED', 'PROVIDER_REPORTED', 'DEVICE_MEASURED')
    and declaration ->> 'granularity' in ('PER_REQUEST', 'AGGREGATE', 'UNKNOWN')
    and declaration ->> 'execution' in ('CLOUD', 'LOCAL')
    and declaration ->> 'access' in ('API', 'SUBSCRIPTION', 'LOCAL_OWNED', 'UNKNOWN')
    and (
      declaration ->> 'modelRaw' is null
      or (
        length(declaration ->> 'modelRaw') <= 80
        and declaration ->> 'modelRaw' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
        and declaration ->> 'modelRaw' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
        and declaration ->> 'modelRaw' !~ '^[0-9]{8,}$'
        and declaration ->> 'modelRaw' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
      )
    )
    and length(coalesce(declaration ->> 'modelCanonical', '')) <= 80
    and (
      declaration ->> 'operator' is null
      or (
        length(declaration ->> 'operator') <= 80
        and declaration ->> 'operator' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
        and declaration ->> 'operator' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
        and declaration ->> 'operator' !~ '^[0-9]{8,}$'
        and declaration ->> 'operator' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
      )
    )
    and length(coalesce(declaration ->> 'sourceVersion', '')) <= 80
    and (declaration ->> 'inferenceRegion' is null or declaration ->> 'inferenceRegion' = 'UNKNOWN' or length(declaration ->> 'inferenceRegion') = 2)
    and declaration ->> 'periodStartUtc' is not null
    and declaration ->> 'periodEndUtc' is not null
    and (declaration ->> 'periodStartUtc')::timestamptz = period_start_utc
    and (declaration ->> 'periodEndUtc')::timestamptz = period_end_utc
  );

alter table public.personal_ai_declarations
  add constraint personal_ai_quick_scenario_shape check (
    quick_scenario is null
    or (
      jsonb_typeof(quick_scenario) = 'object'
      and octet_length(quick_scenario::text) <= 2048
      and quick_scenario - array[
        'version', 'sourceKind', 'chatbot', 'chatbotLabel', 'accessMode', 'frequency',
        'exchanges', 'questionCharacters', 'answerCharacters', 'imageUse', 'audioUse'
      ]::text[] = '{}'::jsonb
      and quick_scenario ?& array[
        'version', 'sourceKind', 'chatbot', 'chatbotLabel', 'accessMode', 'frequency',
        'exchanges', 'questionCharacters', 'answerCharacters', 'imageUse', 'audioUse'
      ]::text[]
      and quick_scenario ->> 'version' = 'personal-ai-chat-usage-v1'
      and quick_scenario ->> 'sourceKind' = 'SELF_REPORTED_CHAT_USAGE'
      and quick_scenario ->> 'chatbot' in ('CHATGPT', 'CLAUDE', 'GEMINI', 'COPILOT', 'MISTRAL', 'PERPLEXITY', 'OTHER', 'UNKNOWN')
      and (
        (quick_scenario ->> 'chatbot' = 'OTHER'
          and length(quick_scenario ->> 'chatbotLabel') between 1 and 80
          and quick_scenario ->> 'chatbotLabel' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
          and quick_scenario ->> 'chatbotLabel' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
          and quick_scenario ->> 'chatbotLabel' !~ '^[0-9]{8,}$')
        or (quick_scenario ->> 'chatbot' <> 'OTHER' and quick_scenario -> 'chatbotLabel' = 'null'::jsonb)
      )
      and quick_scenario ->> 'accessMode' in ('FREE', 'SUBSCRIPTION', 'UNKNOWN')
      and quick_scenario ->> 'frequency' in ('OCCASIONAL', 'WEEKLY', 'SEVERAL_WEEKLY', 'DAILY', 'MULTIPLE_DAILY', 'UNKNOWN')
      and (quick_scenario -> 'exchanges' = 'null'::jsonb or (quick_scenario ->> 'exchanges')::numeric between 0 and 9007199254740991 and (quick_scenario ->> 'exchanges')::numeric = trunc((quick_scenario ->> 'exchanges')::numeric))
      and (quick_scenario -> 'questionCharacters' = 'null'::jsonb or (quick_scenario ->> 'questionCharacters')::numeric between 0 and 1000000 and (quick_scenario ->> 'questionCharacters')::numeric = trunc((quick_scenario ->> 'questionCharacters')::numeric))
      and (quick_scenario -> 'answerCharacters' = 'null'::jsonb or (quick_scenario ->> 'answerCharacters')::numeric between 0 and 1000000 and (quick_scenario ->> 'answerCharacters')::numeric = trunc((quick_scenario ->> 'answerCharacters')::numeric))
      and jsonb_typeof(quick_scenario -> 'imageUse') in ('boolean', 'null')
      and jsonb_typeof(quick_scenario -> 'audioUse') in ('boolean', 'null')
      and period_start_utc is not null and period_end_utc is not null
      and declaration ->> 'source' = 'MANUAL'
      and declaration ->> 'provenance' = 'USER_DECLARED'
      and declaration ->> 'granularity' = 'UNKNOWN'
      and declaration ->> 'provider' = case quick_scenario ->> 'chatbot'
        when 'CHATGPT' then 'OPENAI'
        when 'CLAUDE' then 'ANTHROPIC'
        when 'GEMINI' then 'GOOGLE'
        when 'MISTRAL' then 'MISTRAL'
        else 'OTHER'
      end
      and declaration -> 'tokens' - array[
        'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
        'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
      ]::text[] = '{}'::jsonb
      and not exists (
        select 1 from jsonb_each(declaration -> 'tokens') token
        where token.key <> 'reasoningRelation' and token.value <> 'null'::jsonb
      )
      and declaration #> '{modality,images}' = 'null'::jsonb
      and declaration #> '{modality,audioMinutes}' = 'null'::jsonb
      and declaration #> '{modality,videoSeconds}' = 'null'::jsonb
      and declaration #> '{energy,kwh}' = 'null'::jsonb
      and declaration #> '{energy,averageWatts}' = 'null'::jsonb
      and declaration #> '{energy,durationSeconds}' = 'null'::jsonb
      and declaration #> '{energy,idleWatts}' = 'null'::jsonb
      and declaration ->> 'requestCount' is null
      and declaration ->> 'modelRaw' is null
      and declaration ->> 'modelCanonical' is null
      and declaration ->> 'operator' is null
      and declaration ->> 'inferenceRegion' is null
      and declaration ->> 'access' = 'UNKNOWN'
      and declaration ->> 'execution' = 'CLOUD'
    )
  );

create unique index personal_ai_declarations_owner_quick_scenario_idx
  on public.personal_ai_declarations (
    owner_clerk_id,
    (quick_scenario ->> 'chatbot'),
    (coalesce(quick_scenario ->> 'chatbotLabel', '')),
    period_start_utc,
    period_end_utc
  ) where quick_scenario is not null;

create or replace function public.guard_personal_ai_chat_scenario_overlap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_new_provider text;
begin
  if new.status <> 'ACTIVE' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.owner_clerk_id, 0));
  v_new_provider := new.declaration ->> 'provider';

  if exists (
    select 1
      from public.personal_ai_declarations existing
     where existing.owner_clerk_id = new.owner_clerk_id
       and existing.id is distinct from new.id
       and existing.status = 'ACTIVE'
       and (existing.quick_scenario is not null or new.quick_scenario is not null)
       and existing.declaration ->> 'provider' = v_new_provider
       and (
         existing.period_start_utc is null or new.period_start_utc is null
         or tstzrange(existing.period_start_utc, existing.period_end_utc, '[)')
            && tstzrange(new.period_start_utc, new.period_end_utc, '[)')
       )
  ) then
    raise exception 'active personal AI activity period overlaps another source; exclude or reconcile one source'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger personal_ai_chat_scenario_overlap_guard
  before insert or update of owner_clerk_id, period_start_utc, period_end_utc, declaration, quick_scenario, status
  on public.personal_ai_declarations
  for each row execute function public.guard_personal_ai_chat_scenario_overlap();

create or replace function public.save_personal_ai_chat_scenario(
  p_id uuid,
  p_declaration jsonb,
  p_quick_scenario jsonb,
  p_snapshot jsonb,
  p_methodology_version text,
  p_factor_version text
)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner text := auth.jwt() ->> 'sub';
  v_saved public.personal_ai_declarations;
begin
  if v_owner is null or length(v_owner) not between 1 and 255 then
    raise exception 'authenticated owner required' using errcode = '42501';
  end if;
  if p_id is not null then
    update public.personal_ai_declarations
       set declaration = p_declaration,
           quick_scenario = p_quick_scenario,
           period_start_utc = (p_declaration ->> 'periodStartUtc')::timestamptz,
           period_end_utc = (p_declaration ->> 'periodEndUtc')::timestamptz,
           snapshot = p_snapshot,
           methodology_version = p_methodology_version,
           factor_version = p_factor_version
     where id = p_id and owner_clerk_id = v_owner and quick_scenario is not null
    returning * into v_saved;
    if not found then raise exception 'personal AI scenario not found' using errcode = '42501'; end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(v_owner, 0));
    select * into v_saved
      from public.personal_ai_declarations
     where owner_clerk_id = v_owner
       and quick_scenario ->> 'chatbot' = p_quick_scenario ->> 'chatbot'
       and coalesce(quick_scenario ->> 'chatbotLabel', '') = coalesce(p_quick_scenario ->> 'chatbotLabel', '')
       and period_start_utc = (p_declaration ->> 'periodStartUtc')::timestamptz
       and period_end_utc = (p_declaration ->> 'periodEndUtc')::timestamptz
     for update;
    if found then
      update public.personal_ai_declarations
         set declaration = p_declaration,
             quick_scenario = p_quick_scenario,
             snapshot = p_snapshot,
             methodology_version = p_methodology_version,
             factor_version = p_factor_version
       where id = v_saved.id
      returning * into v_saved;
    else
      insert into public.personal_ai_declarations (
        owner_clerk_id, period_start_utc, period_end_utc, declaration, quick_scenario,
        snapshot, methodology_version, factor_version
      ) values (
        v_owner, (p_declaration ->> 'periodStartUtc')::timestamptz,
        (p_declaration ->> 'periodEndUtc')::timestamptz, p_declaration, p_quick_scenario,
        p_snapshot, p_methodology_version, p_factor_version
      ) returning * into v_saved;
    end if;
  end if;
  return next v_saved;
end;
$$;

revoke all on function public.save_personal_ai_chat_scenario(uuid, jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.save_personal_ai_chat_scenario(uuid, jsonb, jsonb, jsonb, text, text) to authenticated;
revoke all on function public.guard_personal_ai_chat_scenario_overlap() from public, anon, authenticated;

comment on column public.personal_ai_declarations.quick_scenario is
  'Optional user-declared chatbot activity metadata. No prompt, transcript, token conversion, or measured energy is stored here.';

commit;
