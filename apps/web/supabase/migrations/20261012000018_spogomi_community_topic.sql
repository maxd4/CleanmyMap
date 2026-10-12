-- Add the SPOGOMI thematic discussion to the existing community channel.
-- NULL remains valid for legacy and intentionally unclassified messages.

alter table public.app_messages
  drop constraint if exists app_messages_topic_channel_check;

alter table public.app_messages
  add constraint app_messages_topic_channel_check
  check (
    topic_id is null
    or (
      channel_type = 'community'
      and topic_id in (
        'relais_associatif',
        'appel_aux_benevoles',
        'demande_diffusion',
        'besoin_ressources',
        'coordination_secteur',
        'spogomi'
      )
    )
    or (
      channel_type = 'admin_elu'
      and topic_id in (
        'arbitrages',
        'priorites',
        'suivi_decisions',
        'coordination_institutionnelle'
      )
    )
    or (
      channel_type = 'territory'
      and topic_id in ('mon_territoire', 'territoires_voisins')
    )
  );

-- Keep app_notifications as the source of truth while allowing the new
-- community topic to use the existing read-marking RPC.
create or replace function public.mark_my_chat_notifications_read(
  p_channel_type text,
  p_topic_id text default null,
  p_dm_peer_id text default null,
  p_action_id uuid default null
)
returns integer
language plpgsql security invoker set search_path = pg_catalog
as $$
declare
  v_user_id text;
  v_updated_count integer := 0;
begin
  v_user_id := nullif(btrim(coalesce((select auth.jwt()) ->> 'sub', '')), '');
  if v_user_id is null then raise exception 'Unauthenticated'; end if;

  p_channel_type := nullif(btrim(p_channel_type), '');
  p_topic_id := nullif(btrim(p_topic_id), '');

  if p_channel_type not in ('community', 'territory', 'admin_elu', 'dm', 'action') then
    raise exception 'Unsupported chat notification channel';
  end if;

  if p_channel_type = 'action' then
    if p_topic_id is not null or p_dm_peer_id is not null then
      raise exception 'Invalid action notification scope';
    end if;
    update public.app_notifications n
    set read_at = timezone('utc', now())
    where n.user_id = v_user_id
      and n.type in ('chat', 'action_discussion')
      and n.read_at is null
      and n.payload ->> 'channelType' = 'action'
      and (p_action_id is null or n.payload ->> 'actionId' = p_action_id::text);
    get diagnostics v_updated_count = row_count;
    return v_updated_count;
  end if;

  if p_channel_type = 'dm' and (p_topic_id is not null or p_dm_peer_id is null) then
    raise exception 'A DM notification read requires a peer and no topic';
  end if;
  if p_channel_type <> 'dm' and p_dm_peer_id is not null then
    raise exception 'A public chat notification read cannot include a peer';
  end if;

  if p_topic_id is not null and not (
    (p_channel_type = 'community' and p_topic_id in (
      'relais_associatif',
      'appel_aux_benevoles',
      'demande_diffusion',
      'besoin_ressources',
      'coordination_secteur',
      'spogomi'
    ))
    or (p_channel_type = 'territory' and p_topic_id in (
      'mon_territoire',
      'territoires_voisins'
    ))
    or (p_channel_type = 'admin_elu' and p_topic_id in (
      'arbitrages',
      'priorites',
      'suivi_decisions',
      'coordination_institutionnelle'
    ))
  ) then
    raise exception 'Unsupported chat notification topic';
  end if;

  update public.app_notifications n
  set read_at = timezone('utc', now())
  where n.user_id = v_user_id
    and n.type = 'chat'
    and n.read_at is null
    and n.payload ->> 'channelType' = p_channel_type
    and (
      (
        p_channel_type = 'dm'
        and (
          n.payload ->> 'conversationPartnerId' = p_dm_peer_id
          or n.payload ->> 'recipientId' = p_dm_peer_id
        )
      )
      or (
        p_channel_type <> 'dm'
        and nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id
      )
    );
  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.mark_my_chat_notifications_read(text, text, text, uuid) from public, anon;
grant execute on function public.mark_my_chat_notifications_read(text, text, text, uuid) to authenticated, service_role;
