import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const visibilityMigration = readFileSync(new URL("../../../supabase/migrations/20261012000014_spogomi_public_results_visibility.sql", import.meta.url), "utf8");
const rankingMigration = readFileSync(new URL("../../../supabase/migrations/20261012000015_spogomi_official_rankings_publication.sql", import.meta.url), "utf8");
const idempotenceMigration = readFileSync(new URL("../../../supabase/migrations/20261012000016_spogomi_official_rankings_idempotence.sql", import.meta.url), "utf8");
const recognitionMigration = readFileSync(new URL("../../../supabase/migrations/20261012000017_spogomi_recognition_notifications.sql", import.meta.url), "utf8");

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

  it("checks the publication source snapshot and preserves replay history", () => {
    expect(idempotenceMigration).toContain("publish_spogomi_official_rankings_checked");
    expect(idempotenceMigration).toContain("source_snapshot jsonb");
    expect(idempotenceMigration).toContain("spogomi_official_ranking_history");
    expect(idempotenceMigration).toContain("for update");
    expect(idempotenceMigration).toContain("different SPOGOMI ranking decision already exists for this source snapshot");
    expect(idempotenceMigration).toContain("v_existing.status = 'revoked'");
    expect(idempotenceMigration).toContain("action in ('certified', 'revoked', 'reinstated')");
    expect(idempotenceMigration).toContain("regulationConfig");
    expect(idempotenceMigration).toContain("teamSizeConfig");
    expect(idempotenceMigration).toContain("spogomi_category_rules where event_id = p_event_id order by id for update");
    expect(idempotenceMigration).toContain("spogomi_result_items where event_id = p_event_id order by id for update");
    expect(idempotenceMigration).not.toContain("{event,updatedAt}");
  });

  it("preserves the complete notification type contract and adds recognition", () => {
    expect(recognitionMigration).toContain("'action_event'");
    expect(recognitionMigration).toContain("'gamification_reconciliation'");
    expect(recognitionMigration).toContain("'gamification_recognition'");
  });
});
