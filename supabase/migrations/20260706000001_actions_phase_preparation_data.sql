alter table public.actions
  add column if not exists action_phase text not null default 'post_action_complete',
  add column if not exists preparation_data jsonb not null default '{}'::jsonb;

