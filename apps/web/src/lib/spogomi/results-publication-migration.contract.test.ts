import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const visibilityMigration = readFileSync(new URL("../../../supabase/migrations/20261012000014_spogomi_public_results_visibility.sql", import.meta.url), "utf8");
const rankingMigration = readFileSync(new URL("../../../supabase/migrations/20261012000015_spogomi_official_rankings_publication.sql", import.meta.url), "utf8");

describe("SPOGOMI result publication migrations STATIC_CONTRACT", () => {
  it("keeps result visibility explicit and hidden by default", () => {
    expect(visibilityMigration).toContain("public_results_visibility");
    expect(visibilityMigration).toContain("default 'hidden'");
    expect(visibilityMigration).toContain("'provisional', 'certified'");
  });

  it("replaces official rankings atomically through a service-only RPC", () => {
    expect(rankingMigration).toContain("publish_spogomi_official_rankings");
    expect(rankingMigration).toContain("status = 'revoked'");
    expect(rankingMigration).toContain("grant execute on function public.publish_spogomi_official_rankings");
    expect(rankingMigration).toContain("v_event.state <> 'certified'");
  });
});
