import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261015000011_spogomi_event_capability_access.sql", import.meta.url), "utf8");

describe("SPOGOMI event capability migration STATIC_CONTRACT", () => {
  it("keeps observer and referee grants event-scoped and audited", () => {
    expect(migration).toContain("check (role in ('observer', 'referee'))");
    expect(migration).toContain("create table public.spogomi_event_access_audit");
    expect(migration).toContain("event_id uuid not null references public.spogomi_events(id)");
    expect(migration).toContain("spogomi_set_event_access");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("grant execute on function public.spogomi_set_event_access");
  });

  it("does not grant direct table access to browser roles", () => {
    expect(migration).toContain("revoke all on table public.spogomi_event_access_audit from public, anon, authenticated");
    expect(migration).toContain("grant all on table public.spogomi_event_access_audit to service_role");
  });
});
