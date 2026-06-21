alter table public.actions
  add column if not exists type text not null default 'action'
  check (type in ('action', 'zone_propre'));

comment on column public.actions.type is
  'Legacy action classification used by gamification rules and RPC filters.';
