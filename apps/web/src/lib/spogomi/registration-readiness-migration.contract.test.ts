import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readinessMigration = readFileSync(new URL("../../../supabase/migrations/20261109000003_spogomi_registration_readiness.sql", import.meta.url), "utf8");
const admissionMigration = readFileSync(new URL("../../../supabase/migrations/20261109000004_spogomi_admission_readiness_gate.sql", import.meta.url), "utf8");

describe("SPOGOMI registration readiness STATIC_CONTRACT", () => {
  it("keeps the checklist and opening transition server-owned and revision-controlled", () => {
    expect(readinessMigration).toContain("spogomi_registration_readiness");
    expect(readinessMigration).toContain("spogomi_division_regulation_is_complete");
    expect(readinessMigration).toContain("spogomi_field_operations");
    expect(readinessMigration).toContain("spogomi_event_routes");
    expect(readinessMigration).toContain("spogomi_open_registration");
    expect(readinessMigration).toContain("p_expected_revision");
    expect(readinessMigration).toContain("grant execute on function public.spogomi_open_registration");
    expect(readinessMigration).toContain("registrationPolicy");
  });

  it("gates only new registration requests and preserves existing request replay", () => {
    const replay = admissionMigration.indexOf("if found then");
    const gate = admissionMigration.indexOf("spogomi_registration_readiness_incomplete");
    expect(replay).toBeGreaterThanOrEqual(0);
    expect(gate).toBeGreaterThan(replay);
    expect(admissionMigration).toContain("p_request_kind = 'registration'");
    expect(admissionMigration).toContain("grant execute on function public.create_spogomi_admission_request");
  });
});
