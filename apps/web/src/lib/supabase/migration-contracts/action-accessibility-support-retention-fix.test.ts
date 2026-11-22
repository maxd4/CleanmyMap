import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const priorMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261122000005_action_accessibility_support_date_retention.sql", import.meta.url),
  "utf8",
);
const correctionMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261122000009_fix_action_accessibility_support_expired_retroactive_retention.sql", import.meta.url),
  "utf8",
);
const pgTap = readFileSync(
  new URL("../../../../supabase/tests/action-accessibility-support.pgtap.sql", import.meta.url),
  "utf8",
);

describe("inclusive support retention correction STATIC_CONTRACT", () => {
  it("keeps the published migration immutable and applies the time-based deletion forward-only", () => {
    expect(priorMigration).toContain("v_expires_at <= request.created_at");
    expect(correctionMigration).toMatch(/create or replace function public\.reconcile_action_accessibility_support_retention/i);
    expect(correctionMigration).toContain("v_expires_at <= statement_timestamp()");
    expect(correctionMigration).not.toContain("create trigger");
  });

  it("retains function security and the action-row lock used to serialize request creation", () => {
    expect(correctionMigration).toMatch(/security definer[\s\S]*?set search_path = pg_catalog, public/i);
    expect(priorMigration).toMatch(/from public\.actions a[\s\S]*?for update/i);
    expect(pgTap).toContain("retroactive revised expiry is after request creation but already in the past");
    expect(pgTap).toContain("requests with a revised expiry before now are deleted even when expiry followed creation");
  });
});
