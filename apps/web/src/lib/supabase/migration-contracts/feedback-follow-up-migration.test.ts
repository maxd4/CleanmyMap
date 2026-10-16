import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261016000005_feedback_follow_up.sql", import.meta.url),
  "utf8",
);

describe("feedback follow-up migration contract", () => {
  it("keeps tracking separate from qualification and grants mutation only to service_role", () => {
    expect(migration).toContain("tracking_status text not null default 'not_planned'");
    expect(migration).toContain("tracking_public_summary text");
    expect(migration).toContain("tracking_reference text");
    expect(migration).toContain("tracking_shipped_on date");
    expect(migration).toContain("for update");
    expect(migration).toContain("feedback-shipped:' || v_feedback.id::text");
    expect(migration).toMatch(/revoke all on function public\.update_community_bug_report_tracking[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.update_community_bug_report_tracking[\s\S]*to service_role/i);
  });

  it("requires a public summary and confirmed date for shipped", () => {
    expect(migration).toContain("Shipped feedback requires a public summary and confirmed delivery date");
    expect(migration).toContain("p_shipped_on > current_date");
  });
});
