alter table public.report_generations
  add column if not exists theme text;

alter table public.report_generations
  drop constraint if exists report_generations_theme_check;

alter table public.report_generations
  add constraint report_generations_theme_check
  check (theme is null or theme in ('impact', 'scientific'));

create index if not exists report_generations_created_by_generated_at_idx
  on public.report_generations (created_by_clerk_id, generated_at desc, id);

create index if not exists report_generations_created_by_theme_generated_at_idx
  on public.report_generations (created_by_clerk_id, theme, generated_at desc, id);
