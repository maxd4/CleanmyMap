-- Persist an explicit department attribution on canonical actions.
-- NULL remains the default until a trusted attribution source is provided.
alter table public.actions
  add column if not exists department_code text,
  add column if not exists department_name text;

comment on column public.actions.department_code is
  'Explicit department code for the action (string, including 2A, 2B and overseas codes); NULL when unknown.';

comment on column public.actions.department_name is
  'Explicit department name for the action; NULL when unknown.';
