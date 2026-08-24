-- Backfill territory metadata and keep legacy profile reads compatible.

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
    ) as fallback_subtitle,
    coalesce(
      nullif(trim(metadata ->> 'territoryLocationType'), ''),
      nullif(trim(metadata ->> 'zoneLocationType'), ''),
      nullif(trim(metadata ->> 'parisLocationType'), '')
    ) as fallback_location_type
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
    ) as fallback_subtitle,
    coalesce(
      nullif(trim(metadata ->> 'territoryLocationType'), ''),
      nullif(trim(metadata ->> 'zoneLocationType'), ''),
      nullif(trim(metadata ->> 'parisLocationType'), '')
    ) as fallback_location_type
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

create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(
    paris_arrondissement,
    public.extract_arrondissement_from_label(metadata ->> 'territoryArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'territoryLabel'),
    public.extract_arrondissement_from_label(metadata ->> 'zoneName')
  )
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_arrondissement() from public;
grant execute on function public.current_profile_arrondissement() to authenticated, service_role;

create or replace function public.can_profile_view_territory_message(
  p_user_id text,
  p_msg_arrondissement integer
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_arrondissement integer;
begin
  select coalesce(
    paris_arrondissement,
    public.extract_arrondissement_from_label(metadata ->> 'territoryArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'territoryLabel'),
    public.extract_arrondissement_from_label(metadata ->> 'zoneName')
  )
  into v_user_arrondissement
  from public.profiles
  where id = p_user_id;

  if v_user_arrondissement is null or p_msg_arrondissement is null then
    return false;
  end if;

  return p_msg_arrondissement = any (
    case v_user_arrondissement
      when 1 then array[1,2,3,4,5,6,7,8,9]
      when 2 then array[1,2,3,4,9,10]
      when 3 then array[1,2,3,4,10,11]
      when 4 then array[1,2,3,4,5,6,11,12]
      when 5 then array[1,4,5,6,13,14]
      when 6 then array[1,4,5,6,7,14,15]
      when 7 then array[1,6,7,8,15,16]
      when 8 then array[1,7,8,9,16,17]
      when 9 then array[1,2,8,9,10,17,18]
      when 10 then array[2,3,9,10,11,18,19]
      when 11 then array[3,4,10,11,12,19,20]
      when 12 then array[4,11,12,13,20]
      when 13 then array[5,12,13,14]
      when 14 then array[5,6,13,14,15]
      when 15 then array[6,7,14,15,16]
      when 16 then array[7,8,15,16,17]
      when 17 then array[8,9,16,17,18]
      when 18 then array[9,10,17,18,19]
      when 19 then array[10,11,18,19,20]
      when 20 then array[11,12,19,20]
      else array[]::integer[]
    end
  );
end;
$$;

revoke all on function public.can_profile_view_territory_message(text, integer) from public;
grant execute on function public.can_profile_view_territory_message(text, integer) to service_role;

create or replace function public.create_chat_notifications_for_message(
  p_message_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_message record;
  v_sender_label text;
  v_sender_handle text;
  v_content_summary text;
  v_inserted_count integer := 0;
begin
  select
    m.id,
    m.sender_id,
    m.recipient_id,
    m.channel_type,
    m.zone_name,
    m.arrondissement_id,
    m.content
  into v_message
  from public.app_messages m
  where m.id = p_message_id;

  if not found then
    raise exception 'Message not found';
  end if;

  if v_message.sender_id <> coalesce(auth.jwt() ->> 'sub', '') then
    raise exception 'Forbidden';
  end if;

  select
    coalesce(nullif(trim(display_name), ''), nullif(trim(handle), ''), 'Membre'),
    nullif(trim(handle), '')
  into v_sender_label, v_sender_handle
  from public.profiles
  where id = v_message.sender_id;

  v_content_summary := btrim(regexp_replace(coalesce(v_message.content, ''), '\s+', ' ', 'g'));
  if char_length(v_content_summary) > 120 then
    v_content_summary := left(v_content_summary, 117) || '...';
  end if;

  if v_message.channel_type = 'dm' and v_message.recipient_id is not null and v_message.recipient_id <> v_message.sender_id then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      v_message.recipient_id,
      'chat',
      'Message privé de ' || coalesce(v_sender_label, 'Membre'),
      v_content_summary,
      jsonb_build_object(
        'channelType', 'dm',
        'messageId', v_message.id,
        'conversationPartnerId', v_message.sender_id,
        'conversationPartnerLabel', v_sender_label,
        'conversationPartnerHandle', v_sender_handle,
        'recipientId', v_message.sender_id,
        'recipientLabel', v_sender_label,
        'recipientHandle', v_sender_handle
      )
    where not exists (
      select 1
      from public.app_notifications n
      where n.user_id = v_message.recipient_id
        and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
        and coalesce(n.payload ->> 'channelType', '') = 'dm'
    );
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'bug_report' and v_message.recipient_id is not null then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      v_message.recipient_id,
      'chat',
      'Nouveau feedback reçu',
      v_content_summary,
      jsonb_build_object(
        'channelType', 'bug_report',
        'messageId', v_message.id
      )
    where not exists (
      select 1
      from public.app_notifications n
      where n.user_id = v_message.recipient_id
        and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
        and coalesce(n.payload ->> 'channelType', '') = 'bug_report'
    );
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'community' then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      p.id,
      'chat',
      'Nouveau message dans Communauté globale',
      v_content_summary,
      jsonb_build_object(
        'channelType', 'community',
        'messageId', v_message.id
      )
    from public.profiles p
    where p.id <> v_message.sender_id
      and not exists (
        select 1
        from public.app_notifications n
        where n.user_id = p.id
          and n.type = 'chat'
          and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
          and coalesce(n.payload ->> 'channelType', '') = 'community'
      )
    limit 250;
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'admin_elu' then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      p.id,
      'chat',
      'Nouveau message dans Admin & élus',
      v_content_summary,
      jsonb_build_object(
        'channelType', 'admin_elu',
        'messageId', v_message.id
      )
    from public.profiles p
    where p.id <> v_message.sender_id
      and p.role_label in ('admin', 'max', 'elu')
      and not exists (
        select 1
        from public.app_notifications n
        where n.user_id = p.id
          and n.type = 'chat'
          and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
          and coalesce(n.payload ->> 'channelType', '') = 'admin_elu'
      )
    limit 100;
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'territory' then
    if v_message.arrondissement_id is not null then
      insert into public.app_notifications (
        user_id,
        type,
        title,
        content,
        payload
      )
      select
        p.id,
        'chat',
        'Nouveau message dans Territoire & limitrophes',
        v_content_summary,
        jsonb_build_object(
          'channelType', 'territory',
          'messageId', v_message.id,
          'zoneName', v_message.zone_name,
          'arrondissementId', v_message.arrondissement_id
        )
      from public.profiles p
      where p.id <> v_message.sender_id
        and public.can_profile_view_territory_message(p.id, v_message.arrondissement_id)
        and not exists (
          select 1
          from public.app_notifications n
          where n.user_id = p.id
            and n.type = 'chat'
            and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
            and coalesce(n.payload ->> 'channelType', '') = 'territory'
        );
      get diagnostics v_inserted_count = row_count;
      return v_inserted_count;
    end if;

    if v_message.zone_name is not null then
      insert into public.app_notifications (
        user_id,
        type,
        title,
        content,
        payload
      )
      select
        p.id,
        'chat',
        'Nouveau message dans Territoire & limitrophes',
        v_content_summary,
        jsonb_build_object(
          'channelType', 'territory',
          'messageId', v_message.id,
          'zoneName', v_message.zone_name
        )
      from public.profiles p
      where p.id <> v_message.sender_id
        and lower(
          coalesce(
            nullif(trim(p.metadata ->> 'zoneName'), ''),
            nullif(trim(p.metadata ->> 'territoryLabel'), ''),
            ''
          )
        ) = lower(v_message.zone_name)
        and not exists (
          select 1
          from public.app_notifications n
          where n.user_id = p.id
            and n.type = 'chat'
            and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
            and coalesce(n.payload ->> 'channelType', '') = 'territory'
        );
      get diagnostics v_inserted_count = row_count;
      return v_inserted_count;
    end if;
  end if;

  return 0;
end;
$$;

revoke all on function public.create_chat_notifications_for_message(uuid) from public;
grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;
