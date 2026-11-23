import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261123000001_private_action_attendance_teams.sql", import.meta.url),
  "utf8",
);
const leaderDeletionFixMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261123000004_fix_action_attendance_team_leader_detach.sql", import.meta.url),
  "utf8",
);

describe("private action attendance teams migration", () => {
  it("adds a forward-only private schema over stable entries with same-action references", () => {
    expect(migration).toContain("create table public.action_attendance_teams");
    expect(migration).toContain("create table public.action_attendance_team_members");
    expect(migration).toContain("unique (entry_id)");
    expect(migration).toContain("foreign key (action_id, entry_id)");
    expect(migration).toContain("foreign key (action_id, team_id)");
    expect(migration).toContain("unique (action_id, normalized_name)");
    expect(migration).toContain("alter table public.action_attendance_team_members enable row level security");
    expect(migration).toContain("revoke all on public.action_attendance_teams, public.action_attendance_team_members, public.action_attendance_team_audit from public, anon, authenticated, service_role");
    expect(migration).toContain("grant select on public.action_attendance_teams, public.action_attendance_team_members, public.action_attendance_team_audit to service_role");
    expect(migration).not.toMatch(/grant\s+(?:select\s*,\s*)?(?:insert|update|delete).*action_attendance_team/iu);
  });

  it("serializes, checks affected revisions, replays idempotently, and audits atomic snapshots", () => {
    expect(migration).toContain("from public.actions a where a.id = p_action_id for update");
    expect(migration).toContain("unique (action_id, request_id)");
    expect(migration).toContain("revision_conflict' using errcode = '40001'");
    expect(migration).toContain("before_value, after_value");
    expect(migration).toContain("member_removed_with_entry");
    expect(migration).toContain("leader_entry_id = case when leader_entry_id = p_entry_id then null else leader_entry_id end");
  });

  it("limits team RPC access to the privileged server and never couples to participation or XP", () => {
    expect(migration).toContain("grant execute on function public.mutate_action_attendance_team");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/action_participants|spogomi/iu);
    expect(migration).not.toMatch(/drop\s+table\s+public\.action_attendance_entries/iu);
  });

  it("releases a leader only when the detached entry is that leader", () => {
    expect(leaderDeletionFixMigration).toContain("create or replace function public.detach_deleted_action_attendance_team_member()");
    expect(leaderDeletionFixMigration).toContain("leader_entry_id = case when leader_entry_id = new.id then null else leader_entry_id end");
    expect(leaderDeletionFixMigration).toContain("revision = revision + 1");
    expect(leaderDeletionFixMigration).toContain("v_before := public.action_attendance_team_snapshot");
    expect(leaderDeletionFixMigration).toContain("v_after := public.action_attendance_team_snapshot");
    expect(leaderDeletionFixMigration).toContain("'member_removed_with_entry', v_before, v_after");
    expect(leaderDeletionFixMigration).not.toMatch(/^\s*(?:grant|revoke)\b/imu);
  });
});
