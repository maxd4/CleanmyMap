import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000001_spogomi_parent_divisions.sql", import.meta.url),
  "utf8",
);
const compositionCorrection = readFileSync(
  new URL("../../../supabase/migrations/20261015000002_spogomi_division_composition.sql", import.meta.url),
  "utf8",
);
const compositionUuidFix = readFileSync(
  new URL("../../../supabase/migrations/20261015000003_spogomi_division_composition_uuid_fix.sql", import.meta.url),
  "utf8",
);
const lockCorrection = readFileSync(
  new URL("../../../supabase/migrations/20261015000004_spogomi_division_lock.sql", import.meta.url),
  "utf8",
);
const foundation = readFileSync(
  new URL("../../../supabase/migrations/20261012000001_spogomi_foundation.sql", import.meta.url),
  "utf8",
);
const creationService = readFileSync(new URL("./preparation-creation-service.ts", import.meta.url), "utf8");
const publicCreationRoute = readFileSync(new URL("../../app/api/spogomi/events/route.ts", import.meta.url), "utf8");

describe("SPOGOMI parent division contract", () => {
  it("keeps one action on the parent and backfills legacy editions without reinterpretation", () => {
    expect(migration).toContain("create table public.spogomi_divisions");
    expect(migration).toContain("unique (event_id, division_type)");
    expect(migration).toContain("md5(e.id::text || ':' || e.mode)::uuid");
    expect(foundation).toContain("action_id uuid not null unique references public.actions(id)");
    expect(migration).toContain("where e.mode in ('casual', 'world_cup')");
    expect(migration).toContain("p_mode not in ('casual', 'world_cup', 'mixed')");
  });

  it("requires exactly two typed divisions for mixed and rejects ambiguous legacy writes", () => {
    expect(migration).toContain("v_mode = 'mixed' and (v_count <> 2 or v_casual <> 1 or v_world_cup <> 1)");
    expect(migration).toContain("requires an explicit division_id");
    expect(migration).toContain("spogomi_participants_team_same_division_fk");
    expect(migration).toContain("spogomi_result_items_category_same_division_fk");
    expect(migration).toContain("spogomi_ranking_team_same_division_fk");
    expect(migration).toContain("spogomi_certificate_history_same_division_fk");
    expect(compositionCorrection).toContain("on conflict (event_id, division_id, team_number) do nothing");
    expect(compositionCorrection).toContain("A mixed SPOGOMI proposal requires an explicit divisionId");
    expect(compositionUuidFix).toContain("(array_agg(id order by id))[1]");
    expect(lockCorrection).toContain("where event_id = p_event_id for update");
    expect(lockCorrection).toContain("participant.division_id = team.division_id");
  });

  it("materializes divisions through the idempotent server RPC without exposing mixed in creation UI", () => {
    expect(creationService).toContain('rpc("spogomi_ensure_parent_divisions"');
    expect(creationService.match(/createAction\(supabase/g)).toHaveLength(1);
    expect(publicCreationRoute).toContain('z.enum(["casual", "world_cup"])');
    expect(publicCreationRoute).not.toContain('z.enum(["casual", "world_cup", "mixed"])');
  });
});
