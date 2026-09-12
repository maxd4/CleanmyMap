-- Preserve the distinction between an unknown field (NULL) and a measured zero.
alter table public.actions
  alter column waste_kg drop not null,
  alter column waste_kg drop default,
  alter column cigarette_butts drop not null,
  alter column cigarette_butts drop default;
