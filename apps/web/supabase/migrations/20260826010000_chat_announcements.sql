-- Announcements remain messages in app_messages. The kind and optional event
-- reference add presentation context without introducing a second store.

alter table public.app_messages
  add column if not exists message_kind text not null default 'message';

alter table public.app_messages
  add column if not exists related_event_id uuid;

alter table public.app_messages
  drop constraint if exists app_messages_message_kind_check;

alter table public.app_messages
  add constraint app_messages_message_kind_check
  check (message_kind in ('message', 'announcement'));

alter table public.app_messages
  drop constraint if exists app_messages_announcement_channel_check;

alter table public.app_messages
  add constraint app_messages_announcement_channel_check
  check (
    message_kind = 'message'
    or (
      message_kind = 'announcement'
      and channel_type = 'community'
      and topic_id in (
        'relais_associatif',
        'appel_aux_benevoles',
        'demande_diffusion'
      )
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_related_event_kind_check;

alter table public.app_messages
  add constraint app_messages_related_event_kind_check
  check (related_event_id is null or message_kind = 'announcement');

alter table public.app_messages
  drop constraint if exists app_messages_related_event_id_fkey;

alter table public.app_messages
  add constraint app_messages_related_event_id_fkey
  foreign key (related_event_id)
  references public.community_events(id)
  on delete set null;

create index if not exists idx_app_messages_related_event_created_at
  on public.app_messages(related_event_id, created_at desc)
  where related_event_id is not null;
