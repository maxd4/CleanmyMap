import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration00001 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000001_link_missions_to_actions.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration00002 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000002_observed_action_geometry_replacement.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration00003 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000003_harden_observed_geometry_trigger_acl.sql",
    import.meta.url,
  ),
  "utf8",
);

const finalContract = `${migration00001}\n${migration00002}\n${migration00003}`;
const normalizedSql = finalContract
  .replace(/--[^\r\n]*/g, "")
  .replace(/\s+/g, " ");

// STATIC_CONTRACT: this source guard checks migration text only. It does not
// prove deployed ACLs, effective privileges, trigger execution, RLS, or data
// behavior in a linked Supabase project.
describe("observed action geometry trigger ACL STATIC_CONTRACT", () => {
  it("preserves the server-owned trigger contract across 00001 + 00002 + 00003", () => {
    for (const marker of [
      "PURPOSE:",
      "CALLER:",
      "AUTHORIZATION_BOUNDARY:",
      "IDEMPOTENCY:",
      "ATOMICITY:",
      "FAILURE_BEHAVIOR:",
      "SEARCH_PATH:",
      "GRANTS:",
    ]) {
      expect(migration00003).toContain(marker);
    }

    expect(migration00002).toMatch(
      /create\s+or\s+replace\s+function\s+public\.promote_completed_mission_geometry\(\)[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public\s*,\s*pg_catalog/i,
    );
    expect(migration00002).toMatch(
      /create\s+or\s+replace\s+function\s+public\.preserve_observed_action_geometry\(\)[\s\S]*?security\s+invoker[\s\S]*?set\s+search_path\s*=\s*public\s*,\s*pg_catalog/i,
    );
    expect(migration00002).toMatch(
      /create\s+or\s+replace\s+function\s+public\.apply_observed_action_geometry\([\s\S]*?security\s+invoker[\s\S]*?set\s+search_path\s*=\s*public\s*,\s*pg_catalog/i,
    );
    expect(migration00001).toMatch(
      /create\s+trigger\s+promote_completed_mission_geometry[\s\S]*?execute\s+function\s+public\.promote_completed_mission_geometry\(\)/i,
    );

    for (const functionName of [
      "promote_completed_mission_geometry",
      "preserve_observed_action_geometry",
      "apply_observed_action_geometry",
    ]) {
      const functionBlock = new RegExp(
        `revoke\\s+all(?:\\s+privileges)?\\s+on\\s+function\\s+public\\.${functionName}\\([\\s\\S]*?from\\s+public,\\s*anon,\\s*authenticated`,
        "i",
      );
      expect(migration00003).toMatch(functionBlock);
    }

    expect(migration00003).not.toMatch(/^\s*grant\s+(?:execute|all)\b[\s\S]*?on\s+function/im);
    expect(migration00003).not.toMatch(/^\s*grant\s+[\s\S]*?on\s+table\s+public\.(?:missions|gps_points|actions)/im);
    expect(migration00003).not.toMatch(/^\s*grant\s+[\s\S]*?on\s+function\s+public\.(?:promote_completed_mission_geometry|preserve_observed_action_geometry|apply_observed_action_geometry)/im);

    expect(migration00002).toMatch(
      /if\s+old_source\s+in\s*\('gps_tracking',\s*'gpx_import'\)[\s\S]*?new_source\s+not\s+in\s*\('gps_tracking',\s*'gpx_import'\)/i,
    );
    expect(migration00002).toMatch(
      /old_source\s*=\s*'manual'[\s\S]*?new_source\s+in\s*\('reference',\s*'routed',\s*'estimated_route',\s*'estimated_area',\s*'fallback_point'\)/i,
    );
    expect(migration00002).toMatch(
      /current_action\.geometry_source::text\s+in\s*\('gps_tracking',\s*'gpx_import'\)/i,
    );
    expect((migration00002.match(/public\.apply_observed_action_geometry\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(normalizedSql).not.toMatch(
      /\bgrant\s+(?:execute|all)\b[^;]*\bon\s+function\s+public\.(?:promote_completed_mission_geometry|preserve_observed_action_geometry|apply_observed_action_geometry)/i,
    );
  });
});
