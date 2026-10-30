import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030000027_community_digest_runs.sql"),
  "utf8",
);

describe("community digest SQL contract", () => {
  it("defines the unique Paris-period run and bounded public payload", () => {
    expect(migration).toContain("create table if not exists public.community_digest_runs");
    expect(migration).toContain("unique (user_id, cadence, period_key)");
    expect(migration).toContain("item_count between 0 and 10");
    expect(migration).toContain("cadence = 'daily' and period_key ~");
    expect(migration).toContain("cadence = 'weekly' and period_key ~");
  });

  it("keeps the notification and run in one server-only transaction", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("insert into public.community_digest_runs");
    expect(migration).toContain("revoke all on function public.commit_community_digest_run");
    expect(migration).toContain("grant execute on function public.commit_community_digest_run(text, text, text, jsonb)\n  to service_role");
  });

  it("does not grant browser table access or arbitrary RPC execution", () => {
    expect(migration).toContain("revoke all on table public.community_digest_runs from public, anon, authenticated");
    expect(migration).toContain("revoke all on function public.commit_community_digest_run(text, text, text, jsonb)\n  from public, anon, authenticated");
    expect(migration).toContain("if (select auth.role()) <> 'service_role'");
  });
});
