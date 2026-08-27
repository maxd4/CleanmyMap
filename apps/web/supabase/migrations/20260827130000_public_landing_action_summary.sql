-- QUOTA-01: keep public landing metrics in the database without loading the
-- complete action contract corpus into the application runtime.
create or replace function public.load_public_landing_action_summary(
  p_floor_date date
)
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  cigarette_butts bigint,
  volunteers bigint
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
    greatest(coalesce(a.volunteers_count, 0), 0)::bigint as volunteers
  from marked_actions a
  where a.marker_text not like '%test%'
    and a.marker_text not like '%demo%'
    and a.marker_text not like '%seed%'
    and a.marker_text not like '%dummy%'
    and a.marker_text not like '%fake%'
    and a.marker_text not like '%exemple%'
)
select
  count(*)::bigint as visible_actions,
  count(distinct location_label)::bigint as distinct_locations,
  coalesce(sum(waste_kg), 0::numeric) as waste_kg,
  coalesce(sum(cigarette_butts), 0::bigint) as cigarette_butts,
  coalesce(sum(volunteers), 0::bigint) as volunteers
from eligible_actions;
$$;

revoke all on function public.load_public_landing_action_summary(date) from public;
revoke all on function public.load_public_landing_action_summary(date) from anon;
revoke all on function public.load_public_landing_action_summary(date) from authenticated;
revoke all on function public.load_public_landing_action_summary(date) from service_role;
grant execute on function public.load_public_landing_action_summary(date) to service_role;
