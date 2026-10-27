import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261022000001_partner_annuaire_persistence.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();
const publicWebsiteMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261023000002_partner_public_website_consent.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();
const idempotencyConflictMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261027000000_partner_onboarding_idempotency_conflict.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("partner annuaire persistence migration", () => {
  it("defines a server-only public projection with private contact data", () => {
    expect(migration).toContain("create table if not exists public.partner_annuaire_entries");
    expect(migration).toContain("public_data jsonb not null");
    expect(migration).toContain("private_admin_contact jsonb not null");
    expect(migration).toContain("alter table public.partner_annuaire_entries enable row level security");
    expect(migration).toContain("revoke all privileges on table public.partner_annuaire_entries from public, anon, authenticated, service_role");
    expect(migration).toContain("grant select, insert, update on table public.partner_annuaire_entries to service_role");
  });

  it("provides idempotent atomic creation and non-destructive reconciliation", () => {
    expect(migration).toContain("create unique index if not exists uq_partner_onboarding_requests_idempotency");
    expect(migration).toContain("create or replace function public.create_partner_onboarding_request_with_annuaire");
    expect(migration).toContain("on conflict (source_request_id) do nothing");
    expect(migration).toContain("insert into public.partner_annuaire_entries (");
    expect(migration).toContain("where not exists (");
  });

  it("makes review, source synchronization and audit one transaction", () => {
    expect(migration).toContain("create or replace function public.review_partner_publication");
    expect(migration).toContain("update public.partner_onboarding_requests");
    expect(migration).toContain("update public.partner_annuaire_entries");
    expect(migration).toContain("insert into public.admin_operations_audit");
    expect(migration).toContain("'partialmutation', false");
    expect(migration).toContain("grant execute on function public.review_partner_publication(text, text, text, text, text) to service_role");
  });

  it("keeps publication impossible without a recorded review", () => {
    expect(migration).toContain("publication_status = 'pending_admin_review'");
    expect(migration).toContain("reviewed_at is not null");
    expect(migration).toContain("nullif(btrim(reviewed_by_user_id), '') is not null");
  });

  it("keeps public website consent private and preserves the RPC signature", () => {
    expect(publicWebsiteMigration).toContain("add column if not exists public_website_url text");
    expect(publicWebsiteMigration).toContain("add column if not exists public_website_consent boolean not null default false");
    expect(publicWebsiteMigration).toContain("public_website_consent = false");
    expect(publicWebsiteMigration).toContain("p_private_admin_contact->>'publicwebsiteconsent'");
    expect(publicWebsiteMigration).toContain("get diagnostics v_inserted_count = row_count");
    expect(publicWebsiteMigration).toContain("if v_inserted_count = 0 then");
    expect(publicWebsiteMigration).not.toContain("drop function public.create_partner_onboarding_request_with_annuaire");
    expect(publicWebsiteMigration).not.toContain("publicwebsiteconsent'::jsonb");
  });

  it("refuses a contradictory replay before returning the original request", () => {
    expect(idempotencyConflictMigration).toContain("create or replace function public.create_partner_onboarding_request_with_annuaire");
    expect(idempotencyConflictMigration).toContain("from public.partner_onboarding_requests r where r.submitted_by_user_id = p_submitted_by_user_id and r.idempotency_key = p_idempotency_key for update");
    expect(idempotencyConflictMigration).toContain("partner onboarding idempotency conflict");
    expect(idempotencyConflictMigration).toContain("perform pg_advisory_xact_lock(hashtext(p_idempotency_key))");
    expect(idempotencyConflictMigration).toContain("r.public_website_consent is distinct from v_public_website_consent");
    expect(idempotencyConflictMigration).toContain("grant execute on function public.create_partner_onboarding_request_with_annuaire");
    expect(idempotencyConflictMigration).not.toContain("drop function public.create_partner_onboarding_request_with_annuaire");
  });
});
