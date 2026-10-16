-- PURPOSE: attach one private, optional screenshot to a bug feedback.
-- CALLER: server-side feedback screenshot service only.
-- AUTHORIZATION_BOUNDARY: community_bug_reports remains service-only; the
-- application checks the Clerk owner for upload/read and the canonical admin
-- guard for administrative reads.
-- IDEMPOTENCY: the report owns one deterministic screenshot path; retrying an
-- intent or finalization does not create a second attachment.
-- ATOMICITY: metadata is committed on the feedback row; Storage bytes are
-- finalized separately and a failed upload is marked failed/cleaned up by the
-- server service.
-- FAILURE_BEHAVIOR: a pending or failed screenshot is never projected as a
-- ready screenshot; the feedback remains valid without an attachment.
-- SEARCH_PATH: no function is introduced.
-- GRANTS: no direct client table or Storage grants are added.

-- Reuse the existing private image bucket and its server-issued signed upload
-- contract. A new bucket is not necessary for this one-image feedback proof.
alter table public.community_bug_reports
  add column if not exists screenshot_storage_bucket text,
  add column if not exists screenshot_storage_path text,
  add column if not exists screenshot_original_name text,
  add column if not exists screenshot_mime_type text,
  add column if not exists screenshot_size_bytes bigint,
  add column if not exists screenshot_width integer,
  add column if not exists screenshot_height integer,
  add column if not exists screenshot_upload_state text;

alter table public.community_bug_reports
  drop constraint if exists community_bug_reports_screenshot_bucket_check,
  drop constraint if exists community_bug_reports_screenshot_path_check,
  drop constraint if exists community_bug_reports_screenshot_name_check,
  drop constraint if exists community_bug_reports_screenshot_mime_check,
  drop constraint if exists community_bug_reports_screenshot_size_check,
  drop constraint if exists community_bug_reports_screenshot_dimensions_check,
  drop constraint if exists community_bug_reports_screenshot_state_check,
  drop constraint if exists community_bug_reports_screenshot_bug_only_check,
  drop constraint if exists community_bug_reports_screenshot_metadata_check;

alter table public.community_bug_reports
  add constraint community_bug_reports_screenshot_bucket_check
  check (
    screenshot_storage_bucket is null
    or screenshot_storage_bucket = 'signalement-evidence'
  ),
  add constraint community_bug_reports_screenshot_path_check
  check (
    screenshot_storage_path is null
    or screenshot_storage_path ~ '^feedback/[0-9a-fA-F-]{36}/screenshot$'
  ),
  add constraint community_bug_reports_screenshot_name_check
  check (
    screenshot_original_name is null
    or length(btrim(screenshot_original_name)) between 1 and 255
  ),
  add constraint community_bug_reports_screenshot_mime_check
  check (
    screenshot_mime_type is null
    or screenshot_mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  add constraint community_bug_reports_screenshot_size_check
  check (
    screenshot_size_bytes is null
    or screenshot_size_bytes between 1 and 5242880
  ),
  add constraint community_bug_reports_screenshot_dimensions_check
  check (
    (screenshot_width is null and screenshot_height is null)
    or (
      screenshot_width between 1 and 10000
      and screenshot_height between 1 and 10000
    )
  ),
  add constraint community_bug_reports_screenshot_state_check
  check (
    screenshot_upload_state is null
    or screenshot_upload_state in ('pending', 'ready', 'failed')
  ),
  add constraint community_bug_reports_screenshot_bug_only_check
  check (
    screenshot_upload_state is null
    or report_type = 'bug'
  ),
  add constraint community_bug_reports_screenshot_metadata_check
  check (
    screenshot_upload_state is null
    or (
      screenshot_storage_bucket is not null
      and screenshot_storage_path is not null
      and screenshot_original_name is not null
      and screenshot_mime_type is not null
      and screenshot_size_bytes is not null
    )
  );

create index if not exists idx_community_bug_reports_screenshot_pending
  on public.community_bug_reports(created_at)
  where screenshot_upload_state = 'pending';

comment on column public.community_bug_reports.screenshot_storage_path is
  'Durable path in the private signalement-evidence bucket for the optional bug screenshot; signed only after owner/admin authorization.';
