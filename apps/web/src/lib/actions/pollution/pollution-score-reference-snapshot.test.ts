import { describe, expect, it, vi } from "vitest";
import {
  MAP_POLLUTION_REFERENCES_VERSION,
  loadPollutionScoreReferencesForMap,
  runPollutionScoreReferencesJob,
} from "./pollution-score-reference-snapshot";

const global = {
  wastePerVolunteerHour: 12,
  buttsPerVolunteerHour: 345,
  wasteSourceCount: 7,
  buttsSourceCount: 6,
};
const references = { global };

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
      source: "action_pollution_score_references_v2" as const,
      weekStart: date,
    },
    meta: {},
  };
}

describe("pollution score reference snapshot V2", () => {
  it("captures once and reuses the same weekly V2 snapshot", async () => {
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
    expect(first.snapshot.payload.references).toEqual(references);
  });

  it("uses the V2 RPC fallback when the weekly snapshot is missing", async () => {
    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => null,
      loadFallback: async () => references,
    });

    expect(result).toEqual({
      references,
      source: "rpc_fallback",
      snapshotDate: null,
      generatedAt: null,
      warning: "Référence hebdomadaire indisponible : fallback RPC V2 utilisé.",
    });
  });

  it("reads one valid V3 payload and exposes only its global reference", async () => {
    const loadFallback = vi.fn();
    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => snapshot(),
      loadFallback,
    });

    expect(result.source).toBe("weekly_snapshot");
    expect(result.references).toEqual(references);
    expect(loadFallback).not.toHaveBeenCalled();
  });

  it("does not reuse a prior payload without the V2 global shape", async () => {
    const loadFallback = vi.fn(async () => references);
    const legacySnapshot = {
      ...snapshot(),
      version: "map-pollution-score-references-2026.09-v2",
      payload: {
        ...snapshot().payload,
        references: { wastePerVolunteer: 20, buttsPerVolunteer: 2_000 },
      },
    };

    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => legacySnapshot as never,
      loadFallback,
    });

    expect(result.source).toBe("rpc_fallback");
    expect(result.references).toEqual(references);
    expect(loadFallback).toHaveBeenCalledOnce();
  });

  it("keeps the map score unavailable when neither V2 source is valid", async () => {
    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => null,
      loadFallback: async () => null,
    });

    expect(result.references).toBeNull();
    expect(result.warning).toContain("indisponible");
  });

  it("does not write an invalid weekly snapshot", async () => {
    const writeSnapshot = vi.fn(async () => undefined);

    await expect(
      runPollutionScoreReferencesJob({
        now: new Date("2026-09-08T10:00:00.000Z"),
        loadReferences: async () => null,
        readSnapshot: async () => null,
        writeSnapshot,
      }),
    ).rejects.toThrow("Aucune référence globale V2 valide");
    expect(writeSnapshot).not.toHaveBeenCalled();
  });
});
