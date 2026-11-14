import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261109152000_spogomi_terminal_admission_immutability_and_actor_context.sql", import.meta.url), "utf8");
const normalizedMigration = migration.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
const eventRpcSignature = "uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text";
const legacyEventRpcSignature = "uuid, bigint, text, text, timestamptz, timestamptz, text, jsonb, text, text";
const divisionRpcSignature = "uuid, uuid, bigint, text, text, text, text, jsonb, jsonb";

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

  it("keeps ALTER FUNCTION, privilege and comment signatures identical", () => {
    expect(normalizedMigration).toContain(`alter function public.spogomi_update_event_metadata(${eventRpcSignature}) rename to spogomi_update_event_metadata_apply`);
    expect(normalizedMigration).toContain(`revoke all on function public.spogomi_update_event_metadata_apply(${eventRpcSignature}) from public, anon, authenticated, service_role`);
    expect(normalizedMigration).toContain(`revoke all on function public.spogomi_update_event_metadata(${eventRpcSignature}) from public, anon, authenticated`);
    expect(normalizedMigration).toContain(`grant execute on function public.spogomi_update_event_metadata(${eventRpcSignature}) to service_role`);
    expect(normalizedMigration).toContain(`comment on function public.spogomi_update_event_metadata(${eventRpcSignature}) is`);
    expect(normalizedMigration).not.toContain(`spogomi_update_event_metadata_apply(${legacyEventRpcSignature})`);
    expect(normalizedMigration).not.toContain(`spogomi_update_event_metadata(${legacyEventRpcSignature})`);

    for (const statement of ["revoke all on", "grant execute on", "comment on"]) {
      expect(normalizedMigration).toContain(`${statement} function public.spogomi_update_division_regulation(${divisionRpcSignature})`);
    }
  });
});
