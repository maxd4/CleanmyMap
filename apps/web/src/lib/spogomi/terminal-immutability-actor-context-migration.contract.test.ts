import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261109152000_spogomi_terminal_admission_immutability_and_actor_context.sql", import.meta.url), "utf8");

describe("SPOGOMI terminal immutability and actor context migration STATIC_CONTRACT", () => {
  it("guards every terminal-row update while preserving pending transitions and no-op replays", () => {
    expect(migration).toContain("old.status in ('approved', 'rejected', 'cancelled')");
    expect(migration).toContain("to_jsonb(old) - 'updated_at'");
    expect(migration).toContain("spogomi_admission_terminal_immutable");
    expect(migration).toContain("before update on public.spogomi_team_join_requests");
    expect(migration).toContain("spogomi_admission_transition_allowed(old.status, new.status)");
  });

  it("stamps the verified actor only at server-owned event and division RPC boundaries", () => {
    expect(migration).toContain("perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true)");
    expect(migration).toContain("spogomi_update_event_metadata_apply");
    expect(migration).toContain("spogomi_update_division_regulation_apply");
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain("grant execute on function public.spogomi_update_event_metadata");
    expect(migration).toContain("grant execute on function public.spogomi_update_division_regulation");
  });
});
