-- PURPOSE: recover complete historical participant compositions after the
-- published 00001 backfill has run with its PostgreSQL compatibility adapter.
-- CALLER: the migration runner; no runtime caller depends on this backfill.
-- AUTHORIZATION_BOUNDARY: migration ownership only; no public API is introduced.
-- IDEMPOTENCY: only rows whose three typed columns are all NULL are eligible.
-- ATOMICITY: the guarded update and temporary-helper removal are transactional.
-- FAILURE_BEHAVIOR: absent, partial, malformed, overflowing, out-of-range, or
-- contradictory metadata remains NULL.
-- SEARCH_PATH: native validation is resolved through pg_catalog explicitly.
-- GRANTS: no runtime grants are introduced.

with candidates as (
  select
    a.id,
    a.volunteers_count,
    (regexp_match(a.notes, '(?m)^\[cmm-meta\](.*)$'))[1] as meta_text
  from public.actions a
  where a.children_count is null
    and a.adult_count is null
    and a.retired_count is null
), parsed as (
  select
    id,
    volunteers_count,
    case
      when meta_text is not null
       and pg_catalog.pg_input_is_valid(btrim(meta_text), 'jsonb')
        then btrim(meta_text)::jsonb
      else null::jsonb
    end as meta
  from candidates
), values_as_text as (
  select
    id,
    volunteers_count,
    meta->'volunteerParticipation'->>'childrenCount' as children_text,
    meta->'volunteerParticipation'->>'adultCount' as adult_text,
    meta->'volunteerParticipation'->>'retiredCount' as retired_text
  from parsed
), validated as (
  select
    id,
    volunteers_count,
    case
      when children_text ~ '^[0-9]+$'
       and pg_catalog.pg_input_is_valid(children_text, 'integer')
        then children_text::integer
      else null::integer
    end as children_value,
    case
      when adult_text ~ '^[0-9]+$'
       and pg_catalog.pg_input_is_valid(adult_text, 'integer')
        then adult_text::integer
      else null::integer
    end as adult_value,
    case
      when retired_text ~ '^[0-9]+$'
       and pg_catalog.pg_input_is_valid(retired_text, 'integer')
        then retired_text::integer
      else null::integer
    end as retired_value
  from values_as_text
)
update public.actions a
set
  children_count = v.children_value,
  adult_count = v.adult_value,
  retired_count = v.retired_value
from validated v
where a.id = v.id
  and a.children_count is null
  and a.adult_count is null
  and a.retired_count is null
  and v.children_value between 0 and 500
  and v.adult_value between 0 and 500
  and v.retired_value between 0 and 500
  and v.children_value + v.adult_value + v.retired_value = v.volunteers_count;

-- 00001 needed this helper only while the published migration was replayed.
drop function if exists public.pg_input_is_valid(text, regtype);
