import { describe, expect, it } from "vitest";
import {
  ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
  ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION,
  type ActionCollectionContextReference,
  type ActionCollectionContextReferenceSnapshotPayload,
} from "@/lib/actions/action-collection-reference-averages";
import type { PublicSurfaceSnapshotRecord } from "@/lib/public-surface-snapshots";
import { runActionCollectionContextReferenceJob } from "./action-collection-context-reference-job";

function candidate(params: {
  citizenWaste?: number | null;
  citizenButts?: number | null;
  wasteSourceCount?: number;
  buttsSourceCount?: number;
  allUnavailable?: boolean;
} = {}): Record<string, ActionCollectionContextReference> {
  const references: Record<string, ActionCollectionContextReference> = {};
  for (const actionContext of ["citizen", "company", "school"] as const) {
    references[actionContext] = {
      actionContext,
      wastePerEffectiveUnit: params.allUnavailable
        ? null
        : actionContext === "citizen" ? params.citizenWaste ?? null : 8,
      buttsPerEffectiveUnit: params.allUnavailable
        ? null
        : actionContext === "citizen" ? params.citizenButts ?? null : 190,
      wasteSourceCount: params.allUnavailable
        ? 1
        : actionContext === "citizen" ? params.wasteSourceCount ?? 2 : 2,
      buttsSourceCount: params.allUnavailable
        ? 1
        : actionContext === "citizen" ? params.buttsSourceCount ?? 2 : 2,
      eligibleActionCount: 2,
      formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      updatedAt: "2026-10-31T03:20:00.000Z",
    };
  }
  return references;
}

function storedSnapshot(
  payload: ActionCollectionContextReferenceSnapshotPayload,
): PublicSurfaceSnapshotRecord<ActionCollectionContextReferenceSnapshotPayload> {
  return {
    id: `${ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY}:${payload.period}`,
    snapshotKey: ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
    snapshotDate: payload.period,
    generatedAt: payload.generatedAt,
    version: ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION,
    title: "Références mensuelles de collecte par contexte",
    payload,
    meta: {},
  };
}

describe("action collection contextual monthly reference job", () => {
  it("captures the previous complete month and keeps the result public and versioned", async () => {
    let asOfDate = "";

    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      fetchReferences: async (date) => {
        asOfDate = date;
        return candidate({ citizenWaste: 12, citizenButts: 240 });
      },
      writeSnapshot: async () => "applied",
    });

    expect(asOfDate).toBe("2026-10-31");
    expect(result.status).toBe("captured");
    if (result.status !== "captured") throw new Error("Expected a captured snapshot.");
    expect(result.snapshot.payload).toMatchObject({
      period: "2026-11-01",
      formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      source: "action_collection_context_reference_averages_v1",
      references: {
        citizen: {
          waste: { value: 12, sourceCount: 2, period: "2026-11-01" },
          butts: { value: 240, sourceCount: 2, period: "2026-11-01" },
        },
      },
    });
    expect(result.snapshot.payload.references.citizen.waste.generatedAt).toBe(
      "2026-11-01T03:20:00.000Z",
    );
  });

  it("does not let one unavailable metric replace a valid prior metric", async () => {
    const previousResult = await runActionCollectionContextReferenceJob({
      now: new Date("2026-10-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ citizenWaste: 10, citizenButts: 200 }),
      writeSnapshot: async () => "applied",
    });
    if (previousResult.status !== "captured") throw new Error("Expected the first snapshot to be captured.");
    const previousPayload = previousResult.snapshot.payload;
    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      readSnapshot: async () => storedSnapshot({
        ...previousPayload,
        period: "2026-10-01",
        generatedAt: "2026-10-01T03:20:00.000Z",
      }),
      fetchReferences: async () => candidate({
        citizenWaste: null,
        citizenButts: 240,
        wasteSourceCount: 1,
        buttsSourceCount: 2,
      }),
      writeSnapshot: async () => "applied",
    });

    expect(result.status).toBe("captured");
    if (result.status !== "captured") throw new Error("Expected a captured snapshot.");
    expect(result.snapshot.payload.references.citizen.waste).toMatchObject({
      value: 10,
      sourceCount: 2,
      period: "2026-10-01",
    });
    expect(result.snapshot.payload.references.citizen.butts).toMatchObject({
      value: 240,
      sourceCount: 2,
      period: "2026-11-01",
    });
  });

  it("reuses the same period and does not recalculate it twice", async () => {
    let calls = 0;
    const first = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      fetchReferences: async () => {
        calls += 1;
        return candidate({ citizenWaste: 12, citizenButts: 240 });
      },
      writeSnapshot: async () => "applied",
    });
    if (first.status !== "captured") throw new Error("Expected a captured snapshot.");
    const second = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T04:20:00.000Z"),
      readSnapshot: async () => first.snapshot,
      fetchReferences: async () => {
        calls += 1;
        return candidate({ citizenWaste: 99, citizenButts: 999 });
      },
      writeSnapshot: async () => "applied",
    });

    if (second.status !== "reused") throw new Error("Expected the prior snapshot to be reused.");
    expect(calls).toBe(1);
    expect(second.snapshot.payload.references.citizen.waste.value).toBe(12);
  });

  it("keeps the last valid snapshot when the new population is unavailable", async () => {
    const previousResult = await runActionCollectionContextReferenceJob({
      now: new Date("2026-10-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ citizenWaste: 10, citizenButts: 200 }),
      writeSnapshot: async () => "applied",
    });
    if (previousResult.status !== "captured") throw new Error("Expected a captured snapshot.");
    const previous = storedSnapshot(previousResult.snapshot.payload);

    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      readSnapshot: async () => previous,
      fetchReferences: async () => candidate({ allUnavailable: true }),
      writeSnapshot: async () => {
        throw new Error("must not publish unavailable candidate");
      },
    });

    expect(result.status).toBe("reused");
    if (result.status !== "reused") throw new Error("Expected the prior snapshot to be reused.");
    expect(result.snapshot).toBe(previous);
  });

  it("defers a first snapshot when source data is insufficient", async () => {
    let writes = 0;

    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ allUnavailable: true }),
      writeSnapshot: async () => {
        writes += 1;
        return "applied";
      },
    });

    expect(result).toEqual({ status: "deferred", reason: "insufficient_data" });
    expect(writes).toBe(0);
  });

  it("keeps transport and RPC failures as failures", async () => {
    await expect(runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      fetchReferences: async () => {
        throw new Error("RPC unavailable");
      },
      writeSnapshot: async () => "must-not-write",
    })).rejects.toThrow("RPC unavailable");
  });

  it("does not reuse a prior structurally valid snapshot with no usable metrics", async () => {
    const generatedAt = "2026-10-01T03:20:00.000Z";
    const emptyMetric = { value: null, sourceCount: 1, period: null, generatedAt: null };
    const previous = storedSnapshot({
      period: "2026-10-01",
      generatedAt,
      formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      source: "action_collection_context_reference_averages_v1",
      references: Object.fromEntries(["citizen", "company", "school"].map((actionContext) => [
        actionContext,
        {
          actionContext,
          waste: emptyMetric,
          butts: emptyMetric,
          eligibleActionCount: 0,
          formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
        },
      ])) as ActionCollectionContextReferenceSnapshotPayload["references"],
    });

    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      readSnapshot: async () => previous,
      fetchReferences: async () => candidate({ allUnavailable: true }),
      writeSnapshot: async () => "must-not-write",
    });

    expect(result).toEqual({ status: "deferred", reason: "insufficient_data" });
  });
});
