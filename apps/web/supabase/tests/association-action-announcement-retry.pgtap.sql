begin;

select plan(12);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_chat_notifications_for_message(uuid, text)',
    'EXECUTE'
  ),
  'anon cannot execute chat notification fan-out'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_chat_notifications_for_message(uuid, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute chat notification fan-out'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_chat_notifications_for_message(uuid, text)',
    'EXECUTE'
  ),
  'service_role retains chat notification fan-out'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"fanout-service"}', true);

insert into public.profiles (id, display_name)
select 'fanout-recipient-' || n, 'Fanout recipient ' || n
from generate_series(1, 255) n
on conflict (id) do nothing;
insert into public.profiles (id, display_name)
values ('fanout-sender', 'Fanout sender'), ('fanout-other-sender', 'Other sender')
on conflict (id) do nothing;

create temp table association_action_announcement_retry_fixture (
  action_id uuid not null,
  official_message_id uuid not null,
  ordinary_message_id uuid not null
);

with action_row as (
  insert into public.actions (
    created_by_clerk_id, action_date, location_label, organizer_name,
    organizer_type, action_phase, status, preparation_data,
    moderation_visibility, published_at
  ) values (
    'fanout-sender', current_date, 'Fanout location', 'Fanout association',
    'association', 'pre_action', 'pending', '{}'::jsonb,
    'visible', null
  ) returning id
), official_message as (
  insert into public.app_messages (
    sender_id, recipient_id, channel_type, topic_id, message_kind,
    related_event_id, arrondissement_id, content, conversation_id,
    action_id, official_action_publication_id
  )
  select 'fanout-sender', null, 'community', 'evenements_associatifs', 'announcement',
    null, null, 'Official fanout fixture', null, action_row.id, action_row.id
  from action_row
  returning id, action_id
), ordinary_message as (
  insert into public.app_messages (sender_id, channel_type, content)
  values ('fanout-sender', 'community', 'Ordinary community fixture')
  returning id
)
insert into association_action_announcement_retry_fixture (action_id, official_message_id, ordinary_message_id)
select action_row.id, official_message.id, ordinary_message.id
from action_row, official_message, ordinary_message;

select is(
  (select count(*)::integer from public.app_messages where official_action_publication_id = (select action_id from association_action_announcement_retry_fixture)),
  1,
  'the official message is unique for the action'
);
select is(
  public.create_chat_notifications_for_message(
    (select official_message_id from association_action_announcement_retry_fixture),
    'fanout-sender'
  ),
  250,
  'the first official fan-out is capped at 250'
);
select is(
  (select count(*)::integer from public.app_notifications where type = 'community' and payload ->> 'sourceType' = 'association_action_publication' and payload ->> 'sourceId' = (select action_id::text from association_action_announcement_retry_fixture)),
  250,
  'the first fan-out creates 250 unique notifications'
);
select is(
  public.create_chat_notifications_for_message(
    (select official_message_id from association_action_announcement_retry_fixture),
    'fanout-sender'
  ),
  5,
  'a retry progresses to the five remaining recipients'
);
select is(
  (select count(*)::integer from public.app_notifications where type = 'community' and payload ->> 'sourceType' = 'association_action_publication' and payload ->> 'sourceId' = (select action_id::text from association_action_announcement_retry_fixture)),
  255,
  'retries reach every eligible recipient beyond the first tranche'
);
select is(
  public.create_chat_notifications_for_message(
    (select official_message_id from association_action_announcement_retry_fixture),
    'fanout-sender'
  ),
  0,
  'a fully delivered retry is idempotent'
);
select ok(
  not exists (
    select 1
    from public.app_notifications
    where type = 'community'
      and payload ->> 'sourceType' = 'association_action_publication'
      and payload ->> 'sourceId' = (select action_id::text from association_action_announcement_retry_fixture)
      and user_id = 'fanout-sender'
  ),
  'the persisted sender is not notified about its own announcement'
);
select ok(
  not exists (
    select 1
    from public.app_notifications
    where type = 'community'
      and payload ->> 'sourceType' = 'association_action_publication'
      and payload ->> 'sourceId' = (select action_id::text from association_action_announcement_retry_fixture)
    group by user_id, payload ->> 'sourceType', payload ->> 'sourceId'
    having count(*) > 1
  ),
  'the source identity remains unique per recipient'
);
select throws_ok(
  $$select public.create_chat_notifications_for_message(
    (select ordinary_message_id from association_action_announcement_retry_fixture),
    'fanout-other-sender'
  )$$,
  '42501',
  'Forbidden',
  'an ordinary message still rejects a different sender'
);

select * from finish();
rollback;
