-- Backfill territory metadata and keep legacy profile reads compatible.
--
-- The canonical migrations already define and harden the territory helper
-- functions. This migration keeps only the forward data backfill that is
-- unique to the recovered compatibility migration.

with profile_fallbacks as (
  select
    id,
    coalesce(
      public.extract_arrondissement_from_label(metadata ->> 'territoryArrondissement'),
      public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
      public.extract_arrondissement_from_label(metadata ->> 'territoryLabel'),
      public.extract_arrondissement_from_label(metadata ->> 'zoneName'),
      paris_arrondissement
    ) as fallback_arrondissement,
    coalesce(
      nullif(trim(metadata ->> 'territoryLabel'), ''),
      nullif(trim(metadata ->> 'zoneName'), ''),
      case
        when paris_arrondissement is not null then
          case
            when paris_arrondissement = 1 then 'Paris 1er'
            else 'Paris ' || paris_arrondissement::text || 'e'
          end
      end
    ) as fallback_label,
    coalesce(
      nullif(trim(metadata ->> 'territorySubtitle'), ''),
      nullif(trim(metadata ->> 'zoneDepartment'), ''),
      nullif(trim(metadata ->> 'zoneAreaType'), '')
    ) as fallback_subtitle
  from public.profiles
)
update public.profiles p
set paris_arrondissement = coalesce(p.paris_arrondissement, f.fallback_arrondissement)
from profile_fallbacks f
where p.id = f.id
  and p.paris_arrondissement is null
  and f.fallback_arrondissement is not null;

with profile_fallbacks as (
  select
    id,
    coalesce(metadata, '{}'::jsonb) as existing_metadata,
    coalesce(
      public.extract_arrondissement_from_label(metadata ->> 'territoryArrondissement'),
      public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
      public.extract_arrondissement_from_label(metadata ->> 'territoryLabel'),
      public.extract_arrondissement_from_label(metadata ->> 'zoneName'),
      paris_arrondissement
    ) as fallback_arrondissement,
    coalesce(
      nullif(trim(metadata ->> 'territoryLabel'), ''),
      nullif(trim(metadata ->> 'zoneName'), ''),
      case
        when paris_arrondissement is not null then
          case
            when paris_arrondissement = 1 then 'Paris 1er'
            else 'Paris ' || paris_arrondissement::text || 'e'
          end
      end
    ) as fallback_label,
    coalesce(
      nullif(trim(metadata ->> 'territorySubtitle'), ''),
      nullif(trim(metadata ->> 'zoneDepartment'), ''),
      nullif(trim(metadata ->> 'zoneAreaType'), '')
    ) as fallback_subtitle
  from public.profiles
)
update public.profiles p
set metadata =
  f.existing_metadata
  || jsonb_strip_nulls(
    jsonb_build_object(
      'territoryCountry',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'territoryCountry'), ''),
          case
            when f.fallback_label is not null or f.fallback_arrondissement is not null then 'France'
          end
        )
      ),
      'territoryLevel',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'territoryLevel'), ''),
          case
            when f.fallback_arrondissement is not null then 'arrondissement'
            when f.fallback_label is not null then 'commune'
          end
        )
      ),
      'territoryLabel',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'territoryLabel'), ''),
          f.fallback_label
        )
      ),
      'territorySubtitle',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'territorySubtitle'), ''),
          f.fallback_subtitle
        )
      ),
      'territoryArrondissement',
      to_jsonb(
        coalesce(
          public.extract_arrondissement_from_label(f.existing_metadata ->> 'territoryArrondissement'),
          public.extract_arrondissement_from_label(f.existing_metadata ->> 'parisArrondissement'),
          f.fallback_arrondissement
        )
      ),
      'territoryLocationType',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'territoryLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'zoneLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'parisLocationType'), ''),
          case
            when f.fallback_label is not null or f.fallback_arrondissement is not null then 'residence'
          end
        )
      ),
      'territoryRegion',
      to_jsonb(nullif(trim(f.existing_metadata ->> 'territoryRegion'), '')),
      'territoryDepartment',
      to_jsonb(nullif(trim(f.existing_metadata ->> 'territoryDepartment'), '')),
      'zoneName',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'zoneName'), ''),
          nullif(trim(f.existing_metadata ->> 'territoryLabel'), ''),
          f.fallback_label
        )
      ),
      'zoneDepartment',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'zoneDepartment'), ''),
          f.fallback_subtitle
        )
      ),
      'zoneAreaType',
      to_jsonb(nullif(trim(f.existing_metadata ->> 'zoneAreaType'), '')),
      'zoneLocationType',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'zoneLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'territoryLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'parisLocationType'), ''),
          case
            when f.fallback_label is not null or f.fallback_arrondissement is not null then 'residence'
          end
        )
      ),
      'parisArrondissement',
      to_jsonb(
        coalesce(
          public.extract_arrondissement_from_label(f.existing_metadata ->> 'parisArrondissement'),
          f.fallback_arrondissement
        )
      ),
      'parisLocationType',
      to_jsonb(
        coalesce(
          nullif(trim(f.existing_metadata ->> 'parisLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'zoneLocationType'), ''),
          nullif(trim(f.existing_metadata ->> 'territoryLocationType'), ''),
          case
            when f.fallback_label is not null or f.fallback_arrondissement is not null then 'residence'
          end
        )
      )
    )
  )
from profile_fallbacks f
where p.id = f.id
  and (
    f.fallback_label is not null
    or f.fallback_arrondissement is not null
    or f.existing_metadata ? 'territoryCountry'
    or f.existing_metadata ? 'territoryLevel'
    or f.existing_metadata ? 'territoryLabel'
    or f.existing_metadata ? 'territorySubtitle'
    or f.existing_metadata ? 'territoryArrondissement'
    or f.existing_metadata ? 'territoryLocationType'
    or f.existing_metadata ? 'zoneName'
    or f.existing_metadata ? 'zoneDepartment'
    or f.existing_metadata ? 'zoneAreaType'
    or f.existing_metadata ? 'zoneLocationType'
    or f.existing_metadata ? 'parisArrondissement'
    or f.existing_metadata ? 'parisLocationType'
  );
