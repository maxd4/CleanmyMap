import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261120000003_action_collection_participation.sql", import.meta.url),
  "utf8",
);

describe("action collection participation migration STATIC_CONTRACT", () => {
  it("adds nullable collector totals and individual tri-state collection status", () => {
    expect(migration).toMatch(/add column if not exists collectors_count integer/i);
    expect(migration).toMatch(/collectors_count <= volunteers_count/i);
    expect(migration).toMatch(/add column if not exists collection_status text/i);
    expect(migration).toMatch(/collection_status is null or collection_status in \('collected', 'not_collected'\)/i);
    expect(migration).not.toMatch(/drop\s+(column|table)/i);
  });

  it("uses a privileged, locked RPC for individual status changes", () => {
    expect(migration).toMatch(/persist_action_participant_collection_status/i);
    expect(migration).toMatch(/auth\.role\(\).*service_role/i);
    expect(migration).toMatch(/participation_status = 'confirmed'/i);
    expect(migration).toMatch(/action_phase is distinct from 'post_action_complete'/i);
    expect(migration).toMatch(/for update/i);
    expect(migration).toMatch(/revision_conflict/i);
    expect(migration).toMatch(/grant execute on function public\.persist_action_participant_collection_status[\s\S]*to service_role/i);
  });

  it("makes the current reference use measured collectors and preserves the legacy RPC", () => {
    expect(migration).toMatch(/action_collection_reference_averages_v2\(\)/i);
    expect(migration).toMatch(/collectors_count > 0/i);
    expect(migration).toMatch(/waste_per_collector/i);
    expect(migration).toMatch(/butts_per_collector/i);
  });

  it("restores the additive fields after the established versioned backup flow", () => {
    expect(migration).toMatch(/restore_action_backup_with_collection_attribution/i);
    expect(migration).toMatch(/restore_action_backup_with_individual_butts_lots\(p_backup\)/i);
    expect(migration).toMatch(/set collectors_count = r\.collectors_count/i);
    expect(migration).toMatch(/set collection_status = r\.collection_status/i);
    expect(migration).toMatch(/grant execute on function public\.restore_action_backup_with_collection_attribution[\s\S]*to service_role/i);
  });
});
