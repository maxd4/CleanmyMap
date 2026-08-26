-- Public discussion topics stay on app_messages. NULL preserves legacy and
-- intentionally unclassified messages without a heuristic backfill.

alter table public.app_messages
  add column if not exists topic_id text;

alter table public.app_messages
  drop constraint if exists app_messages_topic_channel_check;

alter table public.app_messages
  add constraint app_messages_topic_channel_check
  check (
    topic_id is null
    or (channel_type = 'community' and topic_id in (
      'relais_associatif',
      'appel_aux_benevoles',
      'demande_diffusion',
      'besoin_ressources',
      'coordination_secteur'
    ))
    or (channel_type = 'territory' and topic_id in (
      'mon_territoire',
      'territoires_voisins'
    ))
  );

create index if not exists idx_app_messages_topic_created_at
  on public.app_messages(channel_type, topic_id, created_at desc)
  where topic_id is not null;
