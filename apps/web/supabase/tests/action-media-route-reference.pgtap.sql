begin;
select plan(20);

select has_column('public', 'action_media', 'purpose', 'action media records identify their purpose');
select col_not_null('public', 'action_media', 'purpose', 'media purpose is required');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.action_media'::regclass),
  'action media remains protected by row-level security'
);
select ok(
  not (select public from storage.buckets where id = 'action-photos'),
  'action media bucket remains private'
);
select ok(
  not exists (
    select 1
      from pg_catalog.pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and cmd in ('SELECT', 'ALL')
       and (roles @> array['anon'::name] or roles @> array['public'::name])
       and coalesce(qual, '') ilike '%action-photos%'
  ),
  'the action-photos bucket has no anonymous or public object-read policy'
);
select ok(
  (select file_size_limit = 5242880
          and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
          and array['image/jpeg', 'image/png', 'image/webp']::text[] @> allowed_mime_types
     from storage.buckets where id = 'action-photos'),
  'the private bucket retains its five-megabyte image-only validation'
);
select ok(not has_table_privilege('anon', 'public.action_media', 'SELECT'), 'anonymous users cannot read action media metadata');
select ok(has_table_privilege('authenticated', 'public.action_media', 'SELECT'), 'authenticated media reads remain constrained by RLS');

create temp table action_media_route_fixture(action_id uuid primary key, media_owner text not null);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_media_id uuid;
  v_purpose text;
  v_client_upload_id text;
begin
  insert into public.actions(
    id, created_by_clerk_id, action_date, location_label, status, action_phase,
    published_at, event_start_at, event_start_time, access_mode, moderation_visibility
  ) values (
    v_action_id, 'route-reference-test-organizer', current_date - 1, 'Route reference fixture',
    'approved', 'post_action_complete', now() - interval '1 day',
    now() - interval '1 day', '09:00', 'public', 'visible'
  );
  insert into action_media_route_fixture values (v_action_id, 'route-reference-test-owner');
  perform set_config('test.route_reference_action_id', v_action_id::text, true);
  insert into storage.objects (bucket_id, name, metadata)
  values (
    'action-photos',
    v_action_id::text || '/private-storage-boundary.jpg',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  );

  for v_purpose, v_client_upload_id in
    select fixture.purpose, fixture.client_upload_id
      from (values
        ('route_reference', 'shared-client-upload'),
        ('report_photo', 'shared-client-upload')
      ) as fixture(purpose, client_upload_id)
  loop
    v_media_id := gen_random_uuid();
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      v_media_id, v_action_id, 'route-reference-test-owner', v_client_upload_id,
      v_purpose, v_action_id::text || '/' || v_media_id::text || '.jpg',
      'route-reference-test.jpg', 'image/jpeg', 1024, 0, 'pending'
    );
  end loop;
end $$;

select throws_ok(
  format($sql$
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      '10000000-0000-4000-8000-000000000016'::uuid,
      %L::uuid, 'route-reference-test-owner', 'shared-client-upload', 'route_reference',
      %L || '/10000000-0000-4000-8000-000000000016.jpg',
      'duplicate.jpg', 'image/jpeg', 1024, 0, 'pending'
    )
  $sql$,
    current_setting('test.route_reference_action_id'),
    current_setting('test.route_reference_action_id')
  ),
  '23505', null,
  'the same upload key remains unique within one purpose'
);

do $$
declare
  v_action_id uuid := current_setting('test.route_reference_action_id')::uuid;
  v_media_id uuid;
  v_purpose text;
  v_client_upload_id text;
begin
  for v_purpose, v_client_upload_id in
    select fixture.purpose, fixture.client_upload_id
      from (values
        ('route_reference', 'route-reference-second'),
        ('report_photo', 'report-photo-second'),
        ('report_photo', 'report-photo-third')
      ) as fixture(purpose, client_upload_id)
  loop
    v_media_id := gen_random_uuid();
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      v_media_id, v_action_id, 'route-reference-test-owner', v_client_upload_id,
      v_purpose, v_action_id::text || '/' || v_media_id::text || '.jpg',
      'route-reference-test.jpg', 'image/jpeg', 1024, 0, 'pending'
    );
  end loop;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"route-reference-test-owner"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'route-reference-test-owner', true);

select is((select count(*)::integer from public.action_media
  where action_id = current_setting('test.route_reference_action_id')::uuid),
  5, 'the owner reads all five media rows on the fixture action');
select is((select count(*)::integer from public.action_media
  where action_id = current_setting('test.route_reference_action_id')::uuid
    and purpose = 'route_reference'),
  2, 'route-reference capacity is two active images');
select is((select count(*)::integer from public.action_media
  where action_id = current_setting('test.route_reference_action_id')::uuid
    and purpose = 'report_photo'),
  3, 'report-photo capacity remains three active images');
select is((select count(*)::integer from public.action_media
  where action_id = current_setting('test.route_reference_action_id')::uuid
    and client_upload_id = 'shared-client-upload'),
  2, 'the same client upload key can be used once for each distinct purpose');
select ok(not has_table_privilege('authenticated', 'public.action_media', 'INSERT'), 'authenticated users cannot write media rows directly');
select throws_ok(
  format('insert into public.action_media (id, action_id) values (gen_random_uuid(), %L::uuid)',
    current_setting('test.route_reference_action_id')),
  '42501', null,
  'authenticated users cannot bypass the server upload intent'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon","sub":"route-reference-test-anon"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  format('select count(*) from public.action_media where action_id = %L::uuid',
    current_setting('test.route_reference_action_id')),
  '42501', null,
  'anonymous users cannot query media metadata'
);
select is((select count(*)::integer from storage.objects
  where bucket_id = 'action-photos'
    and name = current_setting('test.route_reference_action_id') || '/private-storage-boundary.jpg'),
  0, 'anonymous users cannot read an object row from the private bucket');

set local role postgres;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"route-reference-test-other"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'route-reference-test-other', true);
set local role authenticated;
select is((select count(*)::integer from public.action_media
  where action_id = current_setting('test.route_reference_action_id')::uuid),
  0, 'a different authenticated identity cannot read another uploader media');

set local role postgres;
select throws_ok(
  format($sql$
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      '10000000-0000-4000-8000-000000000017'::uuid,
      %L::uuid, 'route-reference-test-owner', 'route-reference-third', 'route_reference',
      %L || '/10000000-0000-4000-8000-000000000017.jpg',
      'route-reference-third.jpg', 'image/jpeg', 1024, 0, 'pending'
    )
  $sql$,
    current_setting('test.route_reference_action_id'),
    current_setting('test.route_reference_action_id')
  ),
  'P0001', 'An action cannot have more active media for this purpose',
  'the third active route reference exceeds only the route-reference quota'
);
select throws_ok(
  format($sql$
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      '10000000-0000-4000-8000-000000000018'::uuid,
      %L::uuid, 'route-reference-test-owner', 'report-photo-fourth', 'report_photo',
      %L || '/10000000-0000-4000-8000-000000000018.jpg',
      'report-photo-fourth.jpg', 'image/jpeg', 1024, 0, 'pending'
    )
  $sql$,
    current_setting('test.route_reference_action_id'),
    current_setting('test.route_reference_action_id')
  ),
  'P0001', 'An action cannot have more active media for this purpose',
  'the fourth report photo still exceeds the independent report-photo quota'
);
select throws_ok(
  format($sql$
    insert into public.action_media (
      id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
      original_name, mime_type, size_bytes, sort_order, upload_state
    ) values (
      '10000000-0000-4000-8000-000000000019'::uuid,
      %L::uuid, 'route-reference-test-owner', 'invalid-purpose', 'other',
      %L || '/10000000-0000-4000-8000-000000000019.jpg',
      'invalid-purpose.jpg', 'image/jpeg', 1024, 0, 'pending'
    )
  $sql$,
    current_setting('test.route_reference_action_id'),
    current_setting('test.route_reference_action_id')
  ),
  '23514', null,
  'only report photos and route references are accepted'
);

select * from finish();
rollback;
