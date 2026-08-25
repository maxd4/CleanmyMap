import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260825160000_action_pollution_prediction_evaluations.sql",
    import.meta.url,
  ),
  "utf8",
);

const privilegeHardeningMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260825180000_harden_action_pollution_prediction_evaluations_privileges.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("repollution evaluation ledger migration", () => {
  it("keeps the ledger append-only, private and idempotent", () => {
    expect(migration).toContain(
      "create table if not exists public.action_pollution_prediction_evaluations",
    );
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("for select");
    expect(migration).toContain("for insert");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "unique (evaluation_observation_type, evaluation_observation_id, model_version)",
    );
    expect(migration).toContain(
      "revoke all on table public.action_pollution_prediction_evaluations from anon, authenticated",
    );
    expect(migration).not.toMatch(/grant\s+.*update/i);
    expect(migration).not.toMatch(/grant\s+.*delete/i);
    expect(migration).not.toMatch(/to\s+(anon|authenticated)\b/i);
  });

  it("explicitly revokes service_role before granting only select and insert", () => {
    const revoke =
      "revoke all on table public.action_pollution_prediction_evaluations from anon, authenticated, service_role;";
    const grant =
      "grant select, insert on table public.action_pollution_prediction_evaluations to service_role;";
    const normalizedMigration = privilegeHardeningMigration.replace(/\s+/g, " ").trim();

    expect(normalizedMigration).toContain(revoke);
    expect(normalizedMigration).toContain(grant);
    expect(normalizedMigration.indexOf(revoke)).toBeLessThan(
      normalizedMigration.indexOf(grant),
    );
  });
});
