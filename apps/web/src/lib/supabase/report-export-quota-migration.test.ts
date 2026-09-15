import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260915000008_report_generation_daily_quota.sql", import.meta.url),
  "utf8",
);

describe("report export daily quota migration", () => {
  it("keeps the daily reservation atomic and service-only", () => {
    expect(migration).toContain("primary key (user_id, quota_day)");
    expect(migration).toContain("statement_timestamp() at time zone 'Europe/Paris'");
    expect(migration).toContain("on conflict (user_id, quota_day) do nothing");
    expect(migration).toContain("using ((select auth.role()) = 'service_role')");
    expect(migration).toContain("revoke all on table public.report_generation_daily_quota from public, anon, authenticated;");
  });
});
