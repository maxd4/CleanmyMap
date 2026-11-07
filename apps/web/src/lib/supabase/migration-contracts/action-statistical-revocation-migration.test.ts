import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261107000004_secure_statistical_retention_and_revocation.sql",
    import.meta.url,
  ),
  "utf8",
);
const retentionMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000007_action_retention_and_statistical_versions.sql",
    import.meta.url,
  ),
  "utf8",
);
const proof = readFileSync(
  new URL(
    "../../../../supabase/tests/action-statistical-revocation-and-retention.pgtap.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action statistical revocation and retention migration STATIC_CONTRACT", () => {
  it("reconciles derived Impact rows without weakening business dependencies", () => {
    expect(migration).toContain("public_impact_action_contributions");
    expect(migration).toContain("coalesce(child.eligible_non_temporal, false)");
    expect(migration).toContain("coalesce(child.eligible_temporal, false)");
    expect(migration).toContain("continue;");
    expect(migration).toContain("storage.objects");
    expect(migration).toContain("notification_payload");
    expect(retentionMigration).toContain("for update of a skip locked");
    expect(retentionMigration).toContain("p_expected_action_ids uuid[] default null");
    expect(retentionMigration).toContain("a.updated_at = v_candidate.updated_at");
  });

  it("revalidates current action visibility while keeping snapshot values", () => {
    expect(migration).toContain("is_current_public_action_statistical_eligible");
    expect(migration).toContain("join public.actions a on a.id = v.action_id");
    expect(migration).toContain("v.waste_kg");
    expect(migration).toContain("v.volunteers_count");
    expect(migration).toContain("v.children_count");
    expect(migration).toContain("v.cigarette_butts");
    expect(migration).not.toContain("v_current.moderation_visibility is not distinct from");
    expect(migration).not.toContain("v_current.access_mode is not distinct from");
    expect(migration).not.toContain("v_current.status is not distinct from");
    expect(migration).toContain("security invoker");
  });

  it("keeps the transactional proof synchronized", () => {
    const declaredPlan = Number(proof.match(/^\s*select\s+plan\((\d+)\);/m)?.[1]);
    const executableAssertions = proof.match(/^\s*select\s+(?:is|ok|lives_ok)\s*\(/gm) ?? [];

    expect(declaredPlan).toBe(26);
    expect(executableAssertions).toHaveLength(declaredPlan);
    expect(proof).toContain("non-eligible derived projection");
    expect(proof).toContain("a hidden action is immediately excluded");
    expect(proof).toContain("a pending correction keeps the previously published quantity");
    expect(proof).toContain("a cancelled action is excluded");
  });
});
