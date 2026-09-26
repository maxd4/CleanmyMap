create index if not exists idx_action_share_contact_requests_action_id
  on public.action_share_contact_requests using btree (action_id);

create index if not exists idx_app_messages_feedback_reply_feedback_id
  on public.app_messages using btree (feedback_reply_feedback_id);

create index if not exists idx_badge_events_user_id
  on public.badge_events using btree (user_id);

create index if not exists idx_chat_dm_read_states_peer_id
  on public.chat_dm_read_states using btree (peer_id);

create index if not exists idx_missions_created_by
  on public.missions using btree (created_by);

create index if not exists idx_missions_volunteer_id
  on public.missions using btree (volunteer_id);
