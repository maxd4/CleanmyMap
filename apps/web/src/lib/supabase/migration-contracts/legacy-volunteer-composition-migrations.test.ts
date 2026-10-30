import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(name: string): string {
  return readFileSync(
    new URL(`../../../../supabase/migrations/${name}`, import.meta.url),
    "utf8",
  );
}

const compatibilityMigration = readMigration(
  "20261030000000_compat_pg_input_is_valid_regtype.sql",
);
const publishedMigration = readMigration(
  "20261030000001_action_collection_context_references_v1.sql",
);
const recoveryMigration = readMigration(
  "20261030000005_recover_legacy_volunteer_composition.sql",
);

describe("legacy volunteer composition migration contracts", () => {
  it("places a private invoker-only compatibility signature before the published migration", () => {
    expect(compatibilityMigration).toMatch(
      /create function public\.pg_input_is_valid\(p_value text, p_type regtype\)/i,
    );
    expect(compatibilityMigration).toMatch(/language sql/i);
    expect(compatibilityMigration).toMatch(/strict/i);
    expect(compatibilityMigration).toMatch(/security invoker/i);
    expect(compatibilityMigration).toMatch(/set search_path = public, pg_catalog/i);
    expect(compatibilityMigration).toMatch(
      /pg_catalog\.pg_input_is_valid\(p_value, p_type::text\)/i,
    );
    expect(compatibilityMigration).toMatch(
      /revoke all on function public\.pg_input_is_valid\(text, regtype\) from public, anon, authenticated/i,
    );
    expect(compatibilityMigration).not.toMatch(/security definer/i);
    expect(publishedMigration).toMatch(/pg_input_is_valid\(btrim\(meta_text\), 'jsonb'::regtype\)/i);
  });

  it("recovers only complete, safe and coherent historical compositions", () => {
    expect(recoveryMigration).toContain("regexp_match(a.notes, '(?m)^\\[cmm-meta\\](.*)$')");
    expect(recoveryMigration).toMatch(
      /pg_catalog\.pg_input_is_valid\(btrim\(meta_text\), 'jsonb'\)/i,
    );
    expect(recoveryMigration).toMatch(
      /case[\s\S]*then btrim\(meta_text\)::jsonb[\s\S]*else null::jsonb/i,
    );
    expect(recoveryMigration).toMatch(
      /pg_catalog\.pg_input_is_valid\(children_text, 'integer'\)[\s\S]*then children_text::integer/i,
    );
    expect(recoveryMigration).toMatch(
      /pg_catalog\.pg_input_is_valid\(adult_text, 'integer'\)[\s\S]*then adult_text::integer/i,
    );
    expect(recoveryMigration).toMatch(
      /pg_catalog\.pg_input_is_valid\(retired_text, 'integer'\)[\s\S]*then retired_text::integer/i,
    );
    expect(recoveryMigration).toMatch(/children_value between 0 and 500/i);
    expect(recoveryMigration).toMatch(/adult_value between 0 and 500/i);
    expect(recoveryMigration).toMatch(/retired_value between 0 and 500/i);
    expect(recoveryMigration).toMatch(
      /children_value \+ v\.adult_value \+ v\.retired_value = v\.volunteers_count/i,
    );
    expect(recoveryMigration).toMatch(
      /a\.children_count is null[\s\S]*a\.adult_count is null[\s\S]*a\.retired_count is null/i,
    );
    expect(recoveryMigration).toMatch(
      /drop function if exists public\.pg_input_is_valid\(text, regtype\)/i,
    );
    expect(recoveryMigration).not.toMatch(/security definer/i);
  });

  it("keeps the complete migration order and removes the adapter only at the end", () => {
    const versions = [
      "20261030000000_compat_pg_input_is_valid_regtype.sql",
      "20261030000001_action_collection_context_references_v1.sql",
      "20261030000002_secure_school_future_map_coordinates.sql",
      "20261030000003_repair_public_actions_map_feed.sql",
      "20261030000004_idempotent_school_action_recognition_reconciliation.sql",
      "20261030000005_recover_legacy_volunteer_composition.sql",
    ];
    expect(versions).toEqual([...versions].sort());
    expect(compatibilityMigration.indexOf("create function")).toBeLessThan(
      recoveryMigration.indexOf("drop function"),
    );
  });
});
