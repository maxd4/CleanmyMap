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
    const previousPayload = (await runActionCollectionContextReferenceJob({
      now: new Date("2026-10-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ citizenWaste: 10, citizenButts: 200 }),
      writeSnapshot: async () => "applied",
    })).snapshot.payload;
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
    const second = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T04:20:00.000Z"),
      readSnapshot: async () => first.snapshot,
      fetchReferences: async () => {
        calls += 1;
        return candidate({ citizenWaste: 99, citizenButts: 999 });
      },
      writeSnapshot: async () => "applied",
    });

    expect(second.status).toBe("reused");
    expect(calls).toBe(1);
    expect(second.snapshot.payload.references.citizen.waste.value).toBe(12);
  });

  it("keeps the last valid snapshot when the new population is unavailable", async () => {
    const previous = storedSnapshot((await runActionCollectionContextReferenceJob({
      now: new Date("2026-10-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ citizenWaste: 10, citizenButts: 200 }),
      writeSnapshot: async () => "applied",
    })).snapshot.payload);

    const result = await runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      readSnapshot: async () => previous,
      fetchReferences: async () => candidate({ allUnavailable: true }),
      writeSnapshot: async () => {
        throw new Error("must not publish unavailable candidate");
      },
    });

    expect(result.status).toBe("reused");
    expect(result.snapshot).toBe(previous);
  });

  it("does not create a first snapshot from fewer than two sources", async () => {
    let writes = 0;

    await expect(runActionCollectionContextReferenceJob({
      now: new Date("2026-11-01T03:20:00.000Z"),
      fetchReferences: async () => candidate({ allUnavailable: true }),
      writeSnapshot: async () => {
        writes += 1;
        return "applied";
      },
    })).rejects.toThrow("Aucune référence contextuelle");

    expect(writes).toBe(0);
  });
});
