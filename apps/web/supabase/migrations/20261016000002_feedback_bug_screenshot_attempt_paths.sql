-- PURPOSE: make each feedback screenshot upload attempt addressable by an
-- immutable Storage path without changing the private bucket or data owner.
-- CALLER: the server-side feedback screenshot service only.
-- AUTHORIZATION_BOUNDARY: community_bug_reports remains service-only; Clerk
-- owner checks and the existing admin read guard remain in application code.
-- IDEMPOTENCY: one feedback row points to one current attempt path; an older
-- signed token can only address its own immutable object.
-- ATOMICITY: the path constraint is forward-only and preserves legacy paths;
-- the application uses conditional pending/ready transitions.
-- FAILURE_BEHAVIOR: failed attempts remain retryable and their objects are
-- removed by the existing screenshot cleanup flow when possible.
-- SEARCH_PATH: no function is introduced.
-- GRANTS: no direct client table or Storage grants are added.

alter table public.community_bug_reports
  drop constraint if exists community_bug_reports_screenshot_path_check;

alter table public.community_bug_reports
  add constraint community_bug_reports_screenshot_path_check
  check (
    screenshot_storage_path is null
    or screenshot_storage_path ~ '^feedback/[0-9a-fA-F-]{36}/screenshot(/[0-9a-fA-F-]{36})?$'
  );

comment on column public.community_bug_reports.screenshot_storage_path is
  'Durable path in the private signalement-evidence bucket for the optional bug screenshot; each retry uses an immutable attempt path and is signed only after owner/admin authorization.';
