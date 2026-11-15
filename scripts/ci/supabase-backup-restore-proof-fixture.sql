-- Synthetic only: this fixture never contains production data or secrets.
create table public.cmm_backup_restore_fixture (
  id integer primary key,
  geom extensions.geometry(Point, 4326) not null,
  search_text text not null,
  search_alias text not null,
  constraint cmm_backup_restore_fixture_text_check check (length(search_text) > 0)
);

create index cmm_backup_restore_fixture_geom_idx
  on public.cmm_backup_restore_fixture using gist (geom extensions.gist_geometry_ops_2d);
create index cmm_backup_restore_fixture_search_idx
  on public.cmm_backup_restore_fixture using gin (search_text extensions.gin_trgm_ops);
create index cmm_backup_restore_fixture_alias_idx
  on public.cmm_backup_restore_fixture using gin (search_alias extensions.gin_trgm_ops);

alter table public.cmm_backup_restore_fixture enable row level security;
create policy cmm_backup_restore_fixture_read
  on public.cmm_backup_restore_fixture
  for select
  to anon, authenticated
  using (true);
grant select on public.cmm_backup_restore_fixture to anon, authenticated;

insert into public.cmm_backup_restore_fixture (id, geom, search_text, search_alias)
values (1, extensions.st_geomfromtext('POINT(2.3522 48.8566)', 4326), 'synthetic restore row', 'replay fixture');
