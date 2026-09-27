import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260927000004_environmental_funnel_signal_summary.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("environmental funnel signal summary migration", () => {
  it("keeps the historical bounded ordering and returns the active aggregate contract", () => {
    expect(migration).toContain("create or replace function public.load_environmental_funnel_signal_summary(");
    expect(migration).toContain("order by at desc, session_id desc, step desc, mode desc, user_id desc nulls last");
    expect(migration).toContain("limit 3000");
    expect(migration).toContain("jsonb_typeof(meta -> 'pagepath') = 'string'");
    expect(migration).toContain("jsonb_typeof(meta -> 'pathname') = 'string'");
    expect(migration).toContain("jsonb_typeof(meta -> 'routepath') = 'string'");
    for (const field of [
      "eventcount",
      "detailedpageviewcount",
      "legacypageviewcount",
      "sessioncount",
      "userids",
      "distinctroutecount",
      "routecounts",
      "earliestat",
    ]) {
      expect(migration).toContain(`'${field}'`);
    }
    expect(migration).toContain("'alltime'");
    expect(migration).toContain("'current'");
    expect(migration).toContain("'previous'");
    expect(migration).toContain("'user'");
  });

  it("keeps the RPC server-only and does not change the table contract", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain(
      "revoke all on function public.load_environmental_funnel_signal_summary(text, timestamptz) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.load_environmental_funnel_signal_summary(text, timestamptz) to service_role",
    );
    expect(migration).not.toMatch(/alter table|create index|drop table|policy/);
  });
});
