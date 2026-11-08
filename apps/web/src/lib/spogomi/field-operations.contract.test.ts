import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadSpogomiOperationalCertificationProofsForUser, spogomiFieldCapabilitiesForRoles } from "./field-operations-service";

const migration = readFileSync(new URL("../../../supabase/migrations/20261015000024_spogomi_field_operations.sql", import.meta.url), "utf8");
const importConfirmationMigration = readFileSync(new URL("../../../supabase/migrations/20261020000000_spogomi_measurement_import_atomic_confirmation.sql", import.meta.url), "utf8");

function createCertificationFixture(rows: Array<Record<string, unknown>>) {
  return {
    from(table: string) {
      if (table !== "spogomi_operational_measurements") throw new Error(`Unexpected table: ${table}`);
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const query = {
        select() { return query; },
        in(column: string, values: readonly unknown[]) { filters.push((row) => values.includes(row[column])); return query; },
        eq(column: string, value: unknown) { filters.push((row) => row[column] === value); return query; },
        not(column: string, operator: string, value: unknown) {
          if (operator !== "is") throw new Error(`Unexpected operator: ${operator}`);
          filters.push((row) => row[column] !== value);
          return query;
        },
        order() { return query; },
        range(from: number, to: number) {
          const selected = rows.filter((row) => filters.every((filter) => filter(row)));
          return Promise.resolve({ data: selected.slice(from, to + 1), error: null, count: selected.length });
        },
      };
      return query;
    },
  };
}

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

  it("loads only current operational certifications attributed to the requested account and events", async () => {
    const supabase = createCertificationFixture([
      { id: "measurement-1", event_id: "event-1", certified_by_clerk_id: "user-1", certified_at: "2026-11-09T10:00:00.000Z", status: "certified" },
      { id: "measurement-2", event_id: "event-1", certified_by_clerk_id: "other-user", certified_at: "2026-11-09T10:00:00.000Z", status: "certified" },
      { id: "measurement-3", event_id: "event-2", certified_by_clerk_id: "user-1", certified_at: "2026-11-09T10:00:00.000Z", status: "certified" },
      { id: "measurement-4", event_id: "event-1", certified_by_clerk_id: "user-1", certified_at: "2026-11-09T10:00:00.000Z", status: "draft" },
      { id: "measurement-5", event_id: "event-1", certified_by_clerk_id: "user-1", certified_at: null, status: "certified" },
    ]);

    await expect(loadSpogomiOperationalCertificationProofsForUser({
      supabase: supabase as never,
      userId: "user-1",
      eventIds: ["event-1"],
    })).resolves.toEqual([
      { certificationId: "measurement-1", eventId: "event-1", certifiedByClerkId: "user-1", certifiedAt: "2026-11-09T10:00:00.000Z" },
    ]);
  });
});
