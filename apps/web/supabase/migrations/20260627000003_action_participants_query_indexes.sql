create index if not exists idx_action_participants_action_status_created_at
  on public.action_participants(action_id, participation_status, created_at desc);

create index if not exists idx_action_participants_user_action
  on public.action_participants(user_id, action_id);
