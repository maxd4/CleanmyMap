-- QUOTA-01: extend the bounded homepage aggregate without loading the action
-- corpus into the web runtime. PostgreSQL cannot change RETURNS TABLE through
-- CREATE OR REPLACE, so the stable function is recreated with the same call
-- signature and the previous columns preserved first.
drop function if exists public.load_public_landing_action_summary(date);

create function public.load_public_landing_action_summary(
  p_floor_date date
)
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with source_actions as (
  select
    a.*,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          coalesce(a.notes, ''),
          '(?mi)^\[cmm-meta\].*(\r?\n|$)',
          '',
          'g'
        ),
        '(?mi)^\[google-sheet-sync\][ \t]*(\r?\n|$)',
        '',
        'g'
      ),
      '(?mi)^association\s*:\s*.*(\r?\n|$)',
      '',
      'g'
    ) as clean_notes
  from public.actions a
  where a.status = 'approved'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and a.action_date >= p_floor_date
), marked_actions as (
  select
    a.*,
    lower(
      concat_ws(
        ' ',
        a.id::text,
        'actions',
        coalesce(a.location_label, ''),
        coalesce(a.actor_name, ''),
        coalesce(a.clean_notes, '')
      )
    ) as marker_text
  from source_actions a
), eligible_actions as (
  select
    nullif(btrim(a.location_label), '') as location_label,
    greatest(
      0::numeric,
      coalesce(a.waste_kg, 0::numeric),
      coalesce(
        nullif(
          (
            regexp_match(
              a.notes,
              '(?m)^\[cmm-meta\][^\r\n]*"megotsKg"\s*:\s*([-+]?[0-9]+(\.[0-9]+)?)'
            )
          )[1],
          ''
        )::numeric,
        0::numeric
      ),
      greatest(coalesce(a.cigarette_butts, 0), 0)::numeric / 2500::numeric
    ) as waste_kg,
    greatest(coalesce(a.cigarette_butts, 0), 0)::bigint as cigarette_butts,
    greatest(coalesce(a.volunteers_count, 0), 0)::bigint as volunteers,
    greatest(coalesce(a.duration_minutes, 0), 0)::bigint as duration_minutes,
    nullif(btrim(a.organizer_type), '') as organizer_type
  from marked_actions a
  where a.marker_text not like '%test%'
    and a.marker_text not like '%demo%'
    and a.marker_text not like '%seed%'
    and a.marker_text not like '%dummy%'
    and a.marker_text not like '%fake%'
    and a.marker_text not like '%exemple%'
), classified_actions as (
  select
    a.*,
    case
      when a.organizer_type = 'spontaneous' and a.volunteers > 0
        then 'spontaneous:' || a.volunteers::text
      when a.organizer_type in (
        'company',
        'association',
        'student_association',
        'collective',
        'other'
      ) then a.organizer_type
      else 'other'
    end as category_key,
    case
      when a.organizer_type = 'spontaneous' and a.volunteers = 1 then 'Solo'
      when a.organizer_type = 'spontaneous' and a.volunteers = 2 then 'Duo'
      when a.organizer_type = 'spontaneous' and a.volunteers = 3 then 'Trio'
      when a.organizer_type = 'spontaneous' and a.volunteers = 4 then 'Quatuor'
      when a.organizer_type = 'spontaneous' and a.volunteers = 5 then 'Quintet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 6 then 'Sextet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 7 then 'Septet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 8 then 'Octet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 9 then 'Nonet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 10 then 'Décet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 11 then 'Undécet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 12 then 'Duodécet'
      when a.organizer_type = 'company' then 'Entreprise'
      when a.organizer_type = 'association' then 'Association'
      when a.organizer_type = 'student_association' then 'Association étudiante'
      when a.organizer_type = 'collective' then 'Collectif'
      else case
        when a.organizer_type = 'spontaneous' and a.volunteers > 12
          then 'Groupe de ' || a.volunteers::text || ' participants'
        else 'Autres'
      end
    end as category_label,
    case
      when a.organizer_type = 'spontaneous' then 1
      when a.organizer_type in (
        'company',
        'association',
        'student_association',
        'collective',
        'other'
      ) then 2
      else 2
    end as category_family_sort,
    case
      when a.organizer_type = 'spontaneous' then a.volunteers
      else 0::bigint
    end as participant_sort,
    case
      when a.organizer_type is null then 'missing_organizer_type'
      when a.organizer_type not in (
        'spontaneous',
        'company',
        'association',
        'student_association',
        'collective',
        'other'
      ) then 'invalid_organizer_type'
      when a.organizer_type = 'spontaneous' and a.volunteers < 1
        then 'invalid_spontaneous_participant_count'
      else null
    end as warning_code
  from eligible_actions a
), distribution as (
  select
    category_key,
    max(category_label) as category_label,
    max(category_family_sort) as category_family_sort,
    max(participant_sort) as participant_sort,
    count(*)::bigint as action_count
  from classified_actions
  group by category_key
), warnings as (
  select warning_code, count(*)::bigint as warning_count
  from classified_actions
  where warning_code is not null
  group by warning_code
)
select
  count(*)::bigint as visible_actions,
  count(distinct location_label)::bigint as distinct_locations,
  coalesce(sum(waste_kg), 0::numeric) as waste_kg,
  coalesce(sum(cigarette_butts), 0::bigint) as cigarette_butts,
  coalesce(sum(volunteers), 0::bigint) as volunteers,
  coalesce(sum(volunteers), 0::bigint) as participants_total,
  coalesce(sum(duration_minutes), 0::bigint) as total_duration_minutes,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'key', category_key,
          'category', category_label,
          'count', action_count
        )
        order by category_family_sort, participant_sort, category_label
      )
      from distribution
    ),
    '[]'::jsonb
  ) as action_distribution,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object('code', warning_code, 'count', warning_count)
        order by warning_code
      )
      from warnings
    ),
    '[]'::jsonb
  ) as classification_warnings
from classified_actions;
$$;

revoke all on function public.load_public_landing_action_summary(date) from public;
revoke all on function public.load_public_landing_action_summary(date) from anon;
revoke all on function public.load_public_landing_action_summary(date) from authenticated;
revoke all on function public.load_public_landing_action_summary(date) from service_role;
grant execute on function public.load_public_landing_action_summary(date) to service_role;
