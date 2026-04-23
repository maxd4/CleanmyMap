-- Training set for photo-based waste estimation.

create table if not exists public.training_examples (
  action_id uuid primary key references public.actions(id) on delete cascade,
  created_at timestamptz not null default now(),
  photos jsonb not null default '[]'::jsonb,
  poids_reel numeric(10,2),
  poids_estime numeric(10,2),
  intervalle jsonb,
  confiance numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  model_version text not null default 'vision-hybrid-v1',
  status text not null check (status in ('pending_label', 'labelled', 'needs_review', 'no_photo'))
);

create index if not exists idx_training_examples_created_at_desc
  on public.training_examples(created_at desc);

create index if not exists idx_training_examples_model_version
  on public.training_examples(model_version);

alter table public.training_examples enable row level security;

drop policy if exists training_examples_service_only on public.training_examples;
create policy training_examples_service_only on public.training_examples
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
