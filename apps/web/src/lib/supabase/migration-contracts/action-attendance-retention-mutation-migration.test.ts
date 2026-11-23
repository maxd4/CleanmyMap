import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261123000007_guard_expired_action_attendance_mutations.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action attendance retention mutation guard STATIC_CONTRACT", () => {
  it("guards every private nominative write table with the canonical action deadline", () => {
    expect(migration).toMatch(/perform 1[\s\S]*?for update[\s\S]*?public\.action_attendance_data_expires_at\(new\.action_id\)/iu);
    expect(migration).toContain("v_expires_at <= clock_timestamp()");
    for (const table of [
      "action_attendance_entries",
      "action_attendance_entry_audit",
      "action_attendance_teams",
      "action_attendance_team_members",
      "action_attendance_team_audit",
    ]) {
      expect(migration).toMatch(
        new RegExp(`before insert or update on public\\.${table}`, "iu"),
      );
    }
  });

  it("keeps retries and physical purge outside the write guard", () => {
    expect(migration).toContain("RPC retries that return an existing audit result perform no row write");
    expect(migration).not.toMatch(/before\s+delete\b/iu);
    expect(migration).not.toMatch(/^\s*grant\b/imu);
  });
});
