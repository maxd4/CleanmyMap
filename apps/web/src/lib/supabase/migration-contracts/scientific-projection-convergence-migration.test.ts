import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
  POLLUTION_SCORE_REFERENCE_FORMULA_VERSION,
  PUBLIC_IMPACT_PROJECTION_VERSION,
} from "@/lib/impact/scientific-projection-versions";

const convergenceMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000001_scientific_projection_convergence.sql",
    import.meta.url,
  ),
  "utf8",
);
const contextualMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261030000006_action_collection_context_references_public_minimum.sql",
    import.meta.url,
  ),
  "utf8",
);
const volumeProxyMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000004_scientific_projection_volume_proxy_v2.sql",
    import.meta.url,
  ),
  "utf8",
);
const currentProjectionMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000012_scientific_projection_volume_lot_reconciliation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("scientific projection convergence migration STATIC_CONTRACT", () => {
  it("keeps SQL and TypeScript version identities in parity", () => {
    expect(convergenceMigration).toContain(`'${ACTION_COLLECTION_REFERENCE_FORMULA_VERSION}'`);
    expect(convergenceMigration).toContain(`'${POLLUTION_SCORE_REFERENCE_FORMULA_VERSION}'`);
    expect(volumeProxyMigration).toContain("'impact-terrain-public-2026.09-v4'");
    expect(currentProjectionMigration).toContain(`'${PUBLIC_IMPACT_PROJECTION_VERSION}'`);
    expect(contextualMigration).toContain(`'${ACTION_COLLECTION_CONTEXT_FORMULA_VERSION}'`);
  });

  it("rebuilds only the versioned derived state and preserves the raw action source", () => {
    expect(convergenceMigration).toMatch(
      /build_public_impact_action_contribution[\s\S]*public\.estimate_public_action_waste_kg/i,
    );
    expect(convergenceMigration).toMatch(
      /create or replace function public\.rebuild_public_impact_action_state\([\s\S]*?p_floor_date date,[\s\S]*?p_methodology_version text/i,
    );
    expect(convergenceMigration).toMatch(
      /create or replace function public\.advance_public_impact_action_state\([\s\S]*?p_floor_date date,[\s\S]*?p_methodology_version text/i,
    );
    expect(convergenceMigration).toMatch(/pg_advisory_xact_lock/i);
    expect(convergenceMigration).toMatch(/methodology_version is distinct from p_methodology_version/i);
    expect(convergenceMigration).not.toMatch(/\/\s*2500/);
  });

  it("keeps the public boundary explicit and allows safe retries", () => {
    expect(convergenceMigration).toMatch(/security definer/i);
    expect(convergenceMigration).toMatch(/set search_path = pg_catalog, public/i);
    expect(convergenceMigration).toMatch(/grant execute on function public\.rebuild_public_impact_action_state\(date, text\) to service_role/i);
    expect(convergenceMigration).toMatch(/grant execute on function public\.advance_public_impact_action_state\(date, text\) to service_role/i);
    expect(convergenceMigration).toMatch(/drop function if exists public\.action_collection_reference_averages_v1/i);
    expect(convergenceMigration).toMatch(/drop function if exists public\.action_pollution_score_references_v2/i);
  });

  it("advances only the public derived-state identity for the volume proxy", () => {
    expect(volumeProxyMigration).toContain("volume proxy");
    expect(volumeProxyMigration).toContain("does not duplicate the volume coefficient");
    expect(volumeProxyMigration).not.toMatch(/update\s+public\.actions/i);
    expect(volumeProxyMigration).not.toMatch(/delete\s+from\s+public\.actions/i);
    expect(volumeProxyMigration).toContain(
      "alter column methodology_version set default public.current_public_impact_projection_version()",
    );
  });
});
