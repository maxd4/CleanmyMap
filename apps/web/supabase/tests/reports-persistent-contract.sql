-- EXECUTED_DB_CONTRACT for Reports persistence, RLS and historical replay.
-- Synthetic fixtures only. The complete contract is rolled back at the end.

begin;

set local role postgres;
do $$
begin
  delete from public.report_generation_publications
   where generation_id = '10000000-0000-4000-8000-000000000001'::uuid;
  delete from public.report_generation_pdf_shares
   where generation_id = '10000000-0000-4000-8000-000000000001'::uuid;
  delete from public.report_generation_pdf_artifacts
   where generation_id = '10000000-0000-4000-8000-000000000001'::uuid;
  delete from public.report_generations
   where id = '10000000-0000-4000-8000-000000000001'::uuid;
  delete from public.action_media
   where id in (
     '10000000-0000-4000-8000-000000000011'::uuid,
     '10000000-0000-4000-8000-000000000012'::uuid,
     '10000000-0000-4000-8000-000000000013'::uuid,
     '10000000-0000-4000-8000-000000000014'::uuid
   );
end;
$$;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_generation_id constant uuid := '10000000-0000-4000-8000-000000000001'::uuid;
  v_artifact_id constant uuid := '10000000-0000-4000-8000-000000000021'::uuid;
  v_snapshot jsonb := '{"schemaVersion":2,"kpis":{"actions":2},"availability":{"impact":"observed"}}'::jsonb;
  v_allowed boolean;
  v_quota_day date;
  v_replayed jsonb;
begin
  insert into public.report_generations (
    id, generated_at, created_by_clerk_id, title, filename, period_id,
    scope_kind, scope_value, scope_label, detail_level, modules, snapshot
  ) values (
    v_generation_id, '2030-01-15T12:00:00Z'::timestamptz,
    'reports-persistent-contract-owner', 'Synthetic Reports contract',
    'synthetic-reports-contract.pdf', 'custom_range', 'single_action',
    'synthetic-action', 'Synthetic action', 'default',
    '{"impact":true,"scientific":true}'::jsonb, v_snapshot
  );

  select snapshot into v_replayed
    from public.report_generations where id = v_generation_id;
  if v_replayed <> v_snapshot then
    raise exception 'historical snapshot replay changed the JSON payload';
  end if;

  begin
    insert into public.report_generations (
      id, generated_at, created_by_clerk_id, title, filename, period_id,
      scope_kind, scope_label, detail_level, modules, snapshot
    ) values (
      gen_random_uuid(), now(), 'reports-persistent-contract-owner',
      'invalid period', 'invalid-period.pdf', 'not-a-current-period',
      'global', 'Synthetic global', 'default', '{}'::jsonb, '{}'::jsonb
    );
    raise exception 'invalid Reports period was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.report_generations (
      id, generated_at, created_by_clerk_id, title, filename, period_id,
      scope_kind, scope_label, detail_level, modules, snapshot
    ) values (
      gen_random_uuid(), now(), 'reports-persistent-contract-owner',
      'invalid snapshot', 'invalid-snapshot.pdf', 'full_history',
      'global', 'Synthetic global', 'default', '{}'::jsonb, '[]'::jsonb
    );
    raise exception 'non-object historical snapshot was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.report_generations
       set snapshot = '{"forged":true}'::jsonb
     where id = v_generation_id;
    raise exception 'historical snapshot update was accepted';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.report_generations where id = v_generation_id;
    raise exception 'historical generation delete was accepted';
  exception when insufficient_privilege then null;
  end;

  select allowed, quota_day into v_allowed, v_quota_day
    from public.reserve_report_generation_daily_quota('reports-persistent-contract-quota');
  if not v_allowed then raise exception 'first quota reservation was denied'; end if;
  select allowed into v_allowed
    from public.reserve_report_generation_daily_quota('reports-persistent-contract-quota');
  if v_allowed then raise exception 'repeated quota reservation was accepted'; end if;
  perform public.release_report_generation_daily_quota(
    'reports-persistent-contract-quota', v_quota_day
  );
  select allowed into v_allowed
    from public.reserve_report_generation_daily_quota('reports-persistent-contract-quota');
  if not v_allowed then raise exception 'released quota was not reservable'; end if;

  insert into public.report_generation_pdf_artifacts (
    id, generation_id, created_by_clerk_id, theme, renderer_version,
    storage_path, status
  ) values (
    v_artifact_id, v_generation_id, 'reports-persistent-contract-owner',
    'impact', 'synthetic-renderer-v1',
    'reports/synthetic/impact.pdf', 'rendering'
  );

  update public.report_generation_pdf_artifacts
     set status = 'ready', byte_size = 4096
   where id = v_artifact_id;

  update public.report_generation_pdf_artifacts
     set status = 'failed', byte_size = null, last_error_code = 'synthetic_failure'
   where id = v_artifact_id;

  update public.report_generation_pdf_artifacts
     set status = 'ready', byte_size = 4096, last_error_code = null
   where id = v_artifact_id;

  begin
    insert into public.report_generation_pdf_artifacts (
      id, generation_id, created_by_clerk_id, theme, renderer_version,
      storage_path, status
    ) values (
      gen_random_uuid(), v_generation_id, 'reports-persistent-contract-owner',
      'impact', 'synthetic-renderer-v1', 'reports/synthetic/duplicate.pdf',
      'rendering'
    );
    raise exception 'duplicate PDF artifact variant was accepted';
  exception when unique_violation then null;
  end;

  begin
    update public.report_generation_pdf_artifacts
       set status = 'ready', byte_size = 0
     where id = v_artifact_id;
    raise exception 'zero-byte ready PDF artifact was accepted';
  exception when check_violation then null;
  end;

  insert into public.report_generation_pdf_shares (
    id, generation_id, artifact_id, created_by_clerk_id, theme,
    renderer_version, token_hash, expires_at
  ) values (
    '10000000-0000-4000-8000-000000000031'::uuid, v_generation_id,
    v_artifact_id, 'reports-persistent-contract-owner', 'impact',
    'synthetic-renderer-v1', repeat('a', 64),
    '2030-01-15T13:00:00Z'::timestamptz
  );

  begin
    insert into public.report_generation_pdf_shares (
      generation_id, artifact_id, created_by_clerk_id, theme,
      renderer_version, token_hash, expires_at, created_at
    ) values (
      v_generation_id, v_artifact_id, 'reports-persistent-contract-owner',
      'impact', 'synthetic-renderer-v1', repeat('A', 64),
      '2030-01-15T13:00:00Z'::timestamptz
    );
    raise exception 'uppercase PDF share hash was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.report_generation_pdf_shares (
      generation_id, artifact_id, created_by_clerk_id, theme,
      renderer_version, token_hash, expires_at
    ) values (
      v_generation_id, v_artifact_id, 'reports-persistent-contract-owner',
      'impact', 'synthetic-renderer-v1', repeat('b', 64),
      '2030-01-15T11:00:00Z'::timestamptz,
      '2030-01-15T12:00:00Z'::timestamptz
    );
    raise exception 'expired-at-creation PDF share was accepted';
  exception when check_violation then null;
  end;

  insert into public.report_generation_publications (
    id, generation_id, artifact_id, created_by_clerk_id, title, period_id,
    scope_label, theme, published_at, public_author_label
  ) values (
    '10000000-0000-4000-8000-000000000041'::uuid, v_generation_id,
    v_artifact_id, 'reports-persistent-contract-owner',
    'Synthetic published Reports', 'custom_range', 'Synthetic action',
    'impact', '2030-01-15T14:00:00Z'::timestamptz, 'CleanMyMap'
  );

  begin
    insert into public.report_generation_publications (
      generation_id, artifact_id, created_by_clerk_id, title, period_id,
      scope_label, theme
    ) values (
      v_generation_id, v_artifact_id, 'reports-persistent-contract-owner',
      'Duplicate publication', 'custom_range', 'Synthetic action', 'impact'
    );
    raise exception 'duplicate generation publication was accepted';
  exception when unique_violation then null;
  end;

  raise notice 'REPORTS_PERSISTENT_SYNTHETIC_ROWS_INSERTED';
end;
$$;

-- action_media is intentionally client-readable only for the owning identity;
-- server-owned writes and storage validation remain application boundaries.
insert into public.action_media (
  id, action_id, created_by_clerk_id, client_upload_id, storage_path,
  original_name, mime_type, size_bytes, width, height, sort_order, upload_state
) values
  ('10000000-0000-4000-8000-000000000011'::uuid,
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid,
   'reports-media-owner', 'reports-media-1',
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/10000000-0000-4000-8000-000000000011.jpg',
   'synthetic-1.jpg', 'image/jpeg', 1024, 100, 100, 0, 'ready'),
  ('10000000-0000-4000-8000-000000000012'::uuid,
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid,
   'reports-media-owner', 'reports-media-2',
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/10000000-0000-4000-8000-000000000012.jpg',
   'synthetic-2.jpg', 'image/jpeg', 1024, 100, 100, 1, 'pending'),
  ('10000000-0000-4000-8000-000000000013'::uuid,
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid,
   'reports-media-owner', 'reports-media-3',
   '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/10000000-0000-4000-8000-000000000013.jpg',
   'synthetic-3.jpg', 'image/jpeg', 1024, 100, 100, 2, 'pending');

do $$
begin
  begin
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, storage_path,
      original_name, mime_type, size_bytes, width, height, sort_order, upload_state
    ) values (
      '10000000-0000-4000-8000-000000000014'::uuid,
      '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid,
      'reports-media-owner', 'reports-media-4',
      '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/10000000-0000-4000-8000-000000000014.jpg',
      'synthetic-4.jpg', 'image/jpeg', 1024, 100, 100, 0, 'pending'
    );
    raise exception 'fourth active action media was accepted';
  exception when raise_exception then
    if sqlerrm not like '%more than three active media%' then raise; end if;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"reports-media-owner"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'reports-media-owner', true);

do $$
declare
  v_count bigint;
begin
  select count(*) into v_count
    from public.action_media
   where action_id = '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid
     and upload_state = 'ready';
  if v_count <> 1 then
    raise exception 'media owner did not read exactly its ready evidence';
  end if;
  begin
    insert into public.action_media (
      action_id, created_by_clerk_id, client_upload_id, storage_path,
      original_name, mime_type, size_bytes, upload_state
    ) values (
      '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid, 'reports-media-owner',
      'reports-media-direct-insert',
      '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/10000000-0000-4000-8000-000000000015.jpg',
      'direct.jpg', 'image/jpeg', 1024, 'pending'
    );
    raise exception 'authenticated direct action_media insert was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"reports-media-other"}', true);
select set_config('request.jwt.claim.sub', 'reports-media-other', true);
do $$
begin
  if exists (
    select 1 from public.action_media
     where id = '10000000-0000-4000-8000-000000000011'::uuid
  ) then
    raise exception 'unrelated media identity read another owner evidence';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon","sub":"reports-anonymous"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    execute 'select 1 from public.action_media limit 1';
    raise exception 'anonymous action_media read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select 1 from public.report_generations limit 1';
    raise exception 'anonymous report_generations read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role postgres;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.report_generations'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.report_generation_daily_quota'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.report_generation_pdf_artifacts'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.report_generation_pdf_shares'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.report_generation_publications'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.action_media'::regclass) then
    raise exception 'a Reports or action_media table has RLS disabled';
  end if;
  if has_table_privilege('anon', 'public.report_generations', 'SELECT')
     or has_table_privilege('authenticated', 'public.report_generations', 'SELECT')
     or has_table_privilege('anon', 'public.report_generation_pdf_artifacts', 'SELECT')
     or has_table_privilege('authenticated', 'public.report_generation_pdf_artifacts', 'SELECT')
     or has_table_privilege('anon', 'public.report_generation_pdf_shares', 'SELECT')
     or has_table_privilege('authenticated', 'public.report_generation_pdf_shares', 'SELECT')
     or has_table_privilege('anon', 'public.report_generation_publications', 'SELECT')
     or has_table_privilege('authenticated', 'public.report_generation_publications', 'SELECT')
     or has_table_privilege('anon', 'public.action_media', 'SELECT')
     or not has_table_privilege('authenticated', 'public.action_media', 'SELECT') then
    raise exception 'Reports or action_media browser grants do not preserve the server/owner boundary';
  end if;
  if not has_function_privilege('service_role', 'public.reserve_report_generation_daily_quota(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.reserve_report_generation_daily_quota(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reserve_report_generation_daily_quota(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.release_report_generation_daily_quota(text,date)', 'EXECUTE')
     or has_function_privilege('anon', 'public.release_report_generation_daily_quota(text,date)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.release_report_generation_daily_quota(text,date)', 'EXECUTE') then
    raise exception 'Reports quota RPC grants do not preserve the service boundary';
  end if;
end;
$$;

do $$
begin
  raise notice 'EXECUTED_DB_CONTRACT: Reports persistence, RLS, snapshots, quota, PDF artifacts, shares, publications and action_media contract passed';
end;
$$;
rollback;
