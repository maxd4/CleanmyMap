-- PURPOSE: remove legacy private contact URLs nested in public_data.primaryChannel.
-- CALLER: one-time append-only data cleanup, executed by the migration owner.
-- AUTHORIZATION_BOUNDARY: only the migration transaction mutates canonical rows;
-- private_admin_contact is never read into public_data or modified.
-- IDEMPOTENCY: the update is a no-op after the private URL is removed.
-- ATOMICITY: the cleanup is transactional with the migration.
-- FAILURE_BEHAVIOR: any constraint failure rolls back the cleanup.
-- SEARCH_PATH: fully qualified table reference; no SECURITY DEFINER function.
-- GRANTS: existing partner_annuaire_entries RLS and service_role grants remain.

update public.partner_annuaire_entries
set public_data = public_data - 'primaryChannel'
where lower(coalesce(public_data #>> '{primaryChannel,url}', '')) like 'mailto:%'
   or lower(coalesce(public_data #>> '{primaryChannel,url}', '')) like 'tel:%';
