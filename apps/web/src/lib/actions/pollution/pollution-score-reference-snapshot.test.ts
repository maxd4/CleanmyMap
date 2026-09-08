import { describe, expect, it, vi } from "vitest";
import {
  MAP_POLLUTION_REFERENCES_VERSION,
  loadPollutionScoreReferencesForMap,
  runPollutionScoreReferencesJob,
} from "./pollution-score-reference-snapshot";

const references = { wastePerVolunteer: 12, buttsPerVolunteer: 345 };

function snapshot(date = "2026-09-07") {
  return {
    id: `map-pollution-score-references:${date}`,
    snapshotKey: "map-pollution-score-references",
    snapshotDate: date,
    generatedAt: `${date}T03:00:00.000Z`,
    version: MAP_POLLUTION_REFERENCES_VERSION,
    title: "Référence hebdomadaire du score pollution",
    payload: {
      references,
      source: "action_pollution_score_references" as const,
      weekStart: date,
    },
    meta: {},
  };
}

describe("pollution score reference snapshot", () => {
  it("capture et réutilise une référence hebdomadaire sans doublon", async () => {
    const loadReferences = vi.fn(async () => references);
    const writeSnapshot = vi.fn(async () => undefined);
    const first = await runPollutionScoreReferencesJob({
      now: new Date("2026-09-08T10:00:00.000Z"),
      loadReferences,
      readSnapshot: async () => null,
      writeSnapshot,
    });
    const second = await runPollutionScoreReferencesJob({
      now: new Date("2026-09-08T11:00:00.000Z"),
      loadReferences,
      readSnapshot: async () => first.snapshot,
      writeSnapshot,
    });

    expect(first.status).toBe("captured");
    expect(second.status).toBe("reused");
    expect(loadReferences).toHaveBeenCalledOnce();
    expect(writeSnapshot).toHaveBeenCalledOnce();
  });

  it("fait apparaître le fallback RPC lorsque le snapshot manque", async () => {
    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => null,
      loadFallback: async () => references,
    });

    expect(result).toEqual({
      references,
      source: "rpc_fallback",
      snapshotDate: null,
      generatedAt: null,
      warning: "Référence hebdomadaire indisponible : fallback RPC utilisé.",
    });
  });

  it("privilégie la petite référence persistée", async () => {
    const loadFallback = vi.fn();
    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => snapshot(),
      loadFallback,
    });

    expect(result.source).toBe("weekly_snapshot");
    expect(result.references).toEqual(references);
    expect(loadFallback).not.toHaveBeenCalled();
  });
});
