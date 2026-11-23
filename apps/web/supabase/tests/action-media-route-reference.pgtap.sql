begin;
select plan(5);

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
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_media'::regclass
      and conname = 'action_media_purpose_check'
  ),
  'only the two declared media purposes are accepted'
);

select * from finish();
rollback;
