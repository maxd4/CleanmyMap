import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260920000001_funding_stripe_backend.sql", import.meta.url),
  "utf8",
);

describe("funding Stripe migration contract", () => {
  it("keeps funding facts and aggregates server-owned", () => {
    for (const table of ["funding_contributions", "funding_webhook_events", "funding_public_aggregates"]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
      expect(migration).toMatch(new RegExp(`grant all on table public\\.${table} to service_role`, "i"));
    }
  });

  it("provides idempotent checkout and refund RPC boundaries", () => {
    expect(migration).toContain("on conflict (stripe_event_id) do nothing");
    expect(migration).toContain("create or replace function public.apply_funding_checkout");
    expect(migration).toContain("create or replace function public.apply_funding_refund");
    expect(migration).toContain("greatest(amount_refunded_cents");
  });
});
