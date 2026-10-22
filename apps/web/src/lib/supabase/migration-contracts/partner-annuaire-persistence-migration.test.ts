import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261022000001_partner_annuaire_persistence.sql",
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
});
