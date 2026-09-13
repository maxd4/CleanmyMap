import { describe, expect, it, vi } from "vitest";
import {
  MAP_POLLUTION_REFERENCES_VERSION,
  loadPollutionScoreReferencesForMap,
  runPollutionScoreReferencesJob,
} from "./pollution-score-reference-snapshot";

const references = { wastePerVolunteer: 12, buttsPerVolunteer: 345 };

const referencesWithDepartments = {
  ...references,
  departmentReferences: {
    "01": {
      wastePerVolunteer: 6,
      buttsPerVolunteer: 120,
      eligibleActionCount: 2,
    },
  },
};

function snapshot(date = "2026-09-07") {
  return {
    id: `map-pollution-score-references:${date}`,
    snapshotKey: "map-pollution-score-references",
    snapshotDate: date,
    generatedAt: `${date}T03:00:00.000Z`,
    version: MAP_POLLUTION_REFERENCES_VERSION,
    title: "Référence hebdomadaire du score pollution",
    payload: {
      references: referencesWithDepartments,
      source: "action_pollution_score_references" as const,
      weekStart: date,
    },
    meta: {},
  };
}

function snapshotWithoutDepartmentReferences(date = "2026-09-07") {
  const value = snapshot(date);
  return {
    ...value,
    payload: {
      ...value.payload,
      references,
    },
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
    expect(first.snapshot.payload.references.departmentReferences).toEqual({});
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
    expect(result.references).toEqual(referencesWithDepartments);
    expect(loadFallback).not.toHaveBeenCalled();
  });

  it("ne réutilise pas un payload de la version courante sans références départementales", async () => {
    const loadReferences = vi.fn(async () => referencesWithDepartments);
    const writeSnapshot = vi.fn(async () => undefined);
    const legacyPayload = snapshotWithoutDepartmentReferences();

    const result = await runPollutionScoreReferencesJob({
      now: new Date("2026-09-08T11:00:00.000Z"),
      loadReferences,
      readSnapshot: async () => legacyPayload,
      writeSnapshot,
    });

    expect(result.status).toBe("captured");
    expect(loadReferences).toHaveBeenCalledOnce();
    expect(writeSnapshot).toHaveBeenCalledOnce();
    expect(result.snapshot.payload.references.departmentReferences).toEqual(
      referencesWithDepartments.departmentReferences,
    );
  });

  it("utilise le fallback RPC pour un payload v2 sans références départementales", async () => {
    const loadFallback = vi.fn(async () => referencesWithDepartments);

    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => snapshotWithoutDepartmentReferences(),
      loadFallback,
    });

    expect(result.source).toBe("rpc_fallback");
    expect(result.references).toEqual(referencesWithDepartments);
    expect(loadFallback).toHaveBeenCalledOnce();
  });

  it("ne réutilise pas un snapshot v1 sans références départementales", async () => {
    const loadFallback = vi.fn(async () => referencesWithDepartments);
    const oldSnapshot = {
      ...snapshotWithoutDepartmentReferences(),
      version: "map-pollution-score-references-2026.09-v1",
    };

    const result = await loadPollutionScoreReferencesForMap({
      readSnapshot: async () => oldSnapshot,
      loadFallback,
    });

    expect(result.source).toBe("rpc_fallback");
    expect(result.references).toEqual(referencesWithDepartments);
    expect(loadFallback).toHaveBeenCalledOnce();
  });
});
