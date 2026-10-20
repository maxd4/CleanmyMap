import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { spogomiFieldCapabilitiesForRoles } from "./field-operations-service";

const migration = readFileSync(new URL("../../../supabase/migrations/20261015000024_spogomi_field_operations.sql", import.meta.url), "utf8");
const importConfirmationMigration = readFileSync(new URL("../../../supabase/migrations/20261020000000_spogomi_measurement_import_atomic_confirmation.sql", import.meta.url), "utf8");

describe("SPOGOMI field operations contract", () => {
  it("keeps terrain roles event-scoped and separates observation, measurement and certification", () => {
    expect(migration).toContain("spogomi_set_operational_access");
    expect(migration).toContain("spogomi_field_incidents");
    expect(migration).toContain("spogomi_operational_measurements");
    expect(migration).toContain("spogomi_measurement_imports");
    expect(migration).toContain("grant execute on function public.spogomi_set_operational_access");
    expect(migration).toContain("SPOGOMI measurement self-certification is forbidden");
    expect(migration).toContain("source_kind in ('field_entry', 'import_excel')");
    expect(migration).toContain("score_effect jsonb");
  });

  it("does not grant sanction or certification to timing, weighing or data-entry roles", () => {
    const timing = spogomiFieldCapabilitiesForRoles(["timekeeper"], false);
    const weighing = spogomiFieldCapabilitiesForRoles(["weigher"], false);
    const dataEntry = spogomiFieldCapabilitiesForRoles(["data_entry"], false);
    expect(timing.has("timing")).toBe(true);
    expect(timing.has("arbitration")).toBe(false);
    expect(weighing.has("weighing")).toBe(true);
    expect(weighing.has("certification")).toBe(false);
    expect(dataEntry.has("measurement_entry")).toBe(true);
    expect(dataEntry.has("certification")).toBe(false);
  });

  it("keeps the organizer as the only role with every field capability", () => {
    const organizer = spogomiFieldCapabilitiesForRoles([], true);
    expect([...organizer]).toEqual(expect.arrayContaining(["timing", "arrival", "weighing", "measurement_entry", "arbitration", "certification"]));
  });

  it("keeps measurement import confirmation atomic, locked and service-only", () => {
    expect(importConfirmationMigration).toContain("create or replace function public.spogomi_confirm_measurement_import");
    expect(importConfirmationMigration).toContain("for update");
    expect(importConfirmationMigration).toContain("confirmed_row_numbers");
    expect(importConfirmationMigration).toContain("SPOGOMI measurement import selection cannot be empty");
    expect(importConfirmationMigration).toContain("SPOGOMI measurement import contains conflicting duplicate rows");
    expect(importConfirmationMigration).toContain("grant execute on function public.spogomi_confirm_measurement_import");
    expect(importConfirmationMigration).toContain("revoke all on function public.spogomi_confirm_measurement_import");
  });
});
