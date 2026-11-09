import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readinessMigration = readFileSync(new URL("../../../supabase/migrations/20261109000003_spogomi_registration_readiness.sql", import.meta.url), "utf8");
const admissionMigration = readFileSync(new URL("../../../supabase/migrations/20261109000004_spogomi_admission_readiness_gate.sql", import.meta.url), "utf8");
const alignmentMigration = readFileSync(new URL("../../../supabase/migrations/20261109141255_spogomi_registration_policy_alignment.sql", import.meta.url), "utf8");
const capacityMigration = readFileSync(new URL("../../../supabase/migrations/20261109160000_spogomi_capacity_acl_and_normalization.sql", import.meta.url), "utf8");
const readinessCapacityFixMigration = readFileSync(new URL("../../../supabase/migrations/20261109220000_spogomi_registration_readiness_capacity_contract.sql", import.meta.url), "utf8");

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

  it("keeps capacity policy and scope identical across readiness and admission", () => {
    expect(alignmentMigration).toContain("v_event_policy || v_division_policy");
    expect(alignmentMigration).toContain("spogomi_registration_policy_for_division");
    expect(alignmentMigration).toContain("spogomi_registration_capacity_for_division");
    expect(alignmentMigration).toContain("division_id = p_division_id");
    expect(alignmentMigration).toContain("division_id = v_request.division_id");
    expect(alignmentMigration).toContain("divisionStructureValid");
    expect(alignmentMigration).toContain("v_event.mode = 'mixed'");
    expect(alignmentMigration).toContain("grant execute on function public.transition_spogomi_admission_request");
  });

  it("locks auxiliary capacity functions and keeps the PostgreSQL integer contract", () => {
    expect(capacityMigration).toContain("v_text !~ '^[1-9][0-9]*$'");
    expect(capacityMigration).toContain("length(v_text) > 10");
    expect(capacityMigration).toContain("revoke all on function public.spogomi_registration_capacity_value(jsonb) from public, anon, authenticated");
    expect(capacityMigration).toContain("revoke all on function public.spogomi_registration_policy_for_division(uuid, uuid) from public, anon, authenticated");
    expect(capacityMigration).toContain("revoke all on function public.spogomi_registration_capacity_for_division(uuid, uuid) from public, anon, authenticated");
    expect(capacityMigration).toContain("grant execute on function public.spogomi_registration_capacity_for_division(uuid, uuid) to service_role");
    expect(capacityMigration).toContain("jsonb_set(v_patch, '{capacity}', to_jsonb(v_capacity), true)");
  });

  it("makes readiness consume the canonical capacity validity flag", () => {
    expect(readinessCapacityFixMigration).toContain("create or replace function public.spogomi_registration_readiness");
    expect(readinessCapacityFixMigration).toContain("coalesce((v_policy ->> 'capacityValid')::boolean, true)");
    expect(readinessCapacityFixMigration).not.toContain("v_policy ->> 'capacity') ~ '^[1-9][0-9]*$'");
    expect(readinessCapacityFixMigration).toMatch(/revoke all on function public\.spogomi_registration_readiness\(uuid\)[\s\S]+grant execute on function public\.spogomi_registration_readiness\(uuid\) to service_role/i);
  });
});
