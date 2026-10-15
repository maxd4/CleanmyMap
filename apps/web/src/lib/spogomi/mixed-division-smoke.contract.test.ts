import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const smoke = readFileSync(new URL("../../../supabase/tests/spogomi-mixed-division-smoke.sql", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../../../../.github/workflows/e2e-supabase.yml", import.meta.url), "utf8");

describe("SPOGOMI mixed-division PostgreSQL smoke STATIC_CONTRACT", () => {
  it("keeps the smoke transaction reversible and exercises idempotence plus division isolation", () => {
    expect(smoke).toMatch(/^-- Executed PostgreSQL smoke contract/m);
    expect(smoke).toContain("begin;");
    expect(smoke).toContain("rollback;");
    expect(smoke).toContain("spogomi_ensure_parent_divisions(v_event_id, 'mixed')");
    expect(smoke).toContain("requires an explicit division_id");
    expect(smoke).toContain("division is forbidden");
    expect(smoke).toContain("spogomi_move_participant_to_team_for_division");
    expect(smoke).toContain("closure correction left hash-owned SPOGOMI measures visible");
    expect(smoke).toContain("closure correction modified independent action measures");
    expect(smoke).toContain("timestamptz '2026-06-30 23:30:00+00' at time zone 'Europe/Paris'");
    expect(smoke).toContain("timestamptz '2026-07-01 00:30:00+00' at time zone 'Europe/Paris'");
  });

  it("runs this exact SQL in the authorized ephemeral PostgreSQL job", () => {
    expect(workflow).toContain('apps/web/supabase/tests/spogomi-mixed-division-smoke.sql');
    expect(workflow).toContain('Execute SPOGOMI mixed-division PostgreSQL contract');
    expect(workflow).toContain('supabase db query --workdir apps/web --local "$(cat apps/web/supabase/tests/spogomi-mixed-division-smoke.sql)"');
  });
});
