import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import {
  AccessibilityObservationConflictError,
  buildDeclaredAccessibilityObservationMeasures,
  getCurrentAccessibilityObservations,
  updateActionAccessibilityObservation,
} from "./accessibility-observations";

function buildClient(params: {
  read: { updated_at: string; preparation_data: Record<string, unknown> };
  write?: { updated_at: string } | null;
}) {
  const readMaybeSingle = vi.fn().mockResolvedValue({ data: params.read, error: null });
  const updateMaybeSingle = vi.fn().mockResolvedValue({ data: params.write === undefined ? { updated_at: "revision-2" } : params.write, error: null });
  const readEq = vi.fn().mockReturnValue({ maybeSingle: readMaybeSingle });
  const readSelect = vi.fn().mockReturnValue({ eq: readEq });
  const writeFilters: Array<[string, unknown]> = [];
  const writeQuery = {
    eq: vi.fn((column: string, value: unknown) => {
      writeFilters.push([column, value]);
      return writeQuery;
    }),
    select: vi.fn(() => writeQuery),
    maybeSingle: updateMaybeSingle,
  };
  const update = vi.fn().mockReturnValue(writeQuery);
  const from = vi.fn()
    .mockReturnValueOnce({ select: readSelect })
    .mockReturnValueOnce({ update });
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    update,
    writeFilters,
    updateMaybeSingle,
    readMaybeSingle,
  };
}

describe("action accessibility observation identity and persistence", () => {
  it("keeps definition identities stable across mission reordering", () => {
    const first = buildDeclaredAccessibilityObservationMeasures({
      accessibilityAlternativeMissions: ["Tri", "Compost"],
    });
    const reordered = buildDeclaredAccessibilityObservationMeasures({
      accessibilityAlternativeMissions: ["Compost", "Tri"],
    });
    expect(reordered.sort((left, right) => left.key.localeCompare(right.key)))
      .toEqual(first.sort((left, right) => left.key.localeCompare(right.key)));
  });

  it("filters attestations after mission, plan, or route-version changes", () => {
    const original = {
      accessibilityPausePlan: "Pause près du banc",
      accessibilityAlternativeMissions: ["Tri adapté"],
      accessibilityAlternativeRouteVersionId: "route-v1",
      routeVersioning: {
        schemaVersion: "action-route-versioning-v1" as const,
        active: { versionId: "route-v2" },
        history: [
          { versionId: "route-v1", appliedAt: "2026-11-01T00:00:00.000Z", appliedByUserId: "organizer", operationalRoute: { geometry: "A" }, calculation: {} },
          { versionId: "route-v2", appliedAt: "2026-11-02T00:00:00.000Z", appliedByUserId: "organizer", operationalRoute: { geometry: "B" }, calculation: {} },
        ],
      },
    };
    const measures = buildDeclaredAccessibilityObservationMeasures(original);
    const stored = measures.map((measure) => ({
      ...measure,
      evidenceKind: "organizer_observation" as const,
      observedAt: new Date().toISOString().slice(0, 10),
    }));
    expect(getCurrentAccessibilityObservations({ ...original, accessibilityObservedMeasures: stored })).toHaveLength(3);

    const changed = {
      ...original,
      accessibilityPausePlan: "Pause près de la fontaine",
      accessibilityAlternativeMissions: ["Tri manuel"],
      accessibilityAlternativeRouteVersionId: "route-v2",
    };
    expect(getCurrentAccessibilityObservations({ ...changed, accessibilityObservedMeasures: stored })).toEqual([]);
  });

  it("rejects a stale revision without writing and preserves all current preparation fields", async () => {
    const read = {
      updated_at: "revision-2",
      preparation_data: { accessibilityPausePlan: "Pause", safetyInstructions: "Porter des gants" },
    };
    const staleClient = buildClient({ read });
    const measure = buildDeclaredAccessibilityObservationMeasures(read.preparation_data)[0];
    await expect(updateActionAccessibilityObservation(staleClient.client, {
      actionId: "action-1",
      expectedRevision: "revision-1",
      measurementKey: measure.key,
      definitionHash: measure.definitionHash,
      observed: true,
      evidenceKind: "organizer_observation",
      observedAt: new Date().toISOString().slice(0, 10),
    })).rejects.toBeInstanceOf(AccessibilityObservationConflictError);
    expect(staleClient.from).toHaveBeenCalledTimes(1);

    const currentClient = buildClient({ read });
    await updateActionAccessibilityObservation(currentClient.client, {
      actionId: "action-1",
      expectedRevision: "revision-2",
      measurementKey: measure.key,
      definitionHash: measure.definitionHash,
      observed: true,
      evidenceKind: "organizer_observation",
      observedAt: new Date().toISOString().slice(0, 10),
    });
    expect(currentClient.update).toHaveBeenCalledWith({
      preparation_data: expect.objectContaining({
        accessibilityPausePlan: "Pause",
        safetyInstructions: "Porter des gants",
        accessibilityObservedMeasures: [expect.objectContaining({ key: measure.key, definitionHash: measure.definitionHash })],
      }),
    });
    expect(currentClient.writeFilters).toEqual([["id", "action-1"], ["updated_at", "revision-2"]]);
  });

  it("rejects an observation date in the future", async () => {
    const client = buildClient({
      read: { updated_at: "revision-1", preparation_data: { accessibilityPausePlan: "Pause" } },
    });
    const measure = buildDeclaredAccessibilityObservationMeasures({ accessibilityPausePlan: "Pause" })[0];
    await expect(updateActionAccessibilityObservation(client.client, {
      actionId: "action-1",
      expectedRevision: "revision-1",
      measurementKey: measure.key,
      definitionHash: measure.definitionHash,
      observed: true,
      evidenceKind: "organizer_observation",
      observedAt: "2999-01-01",
    })).rejects.toThrow("valid date no later than today");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("treats a concurrent change after read as a conflict with no accepted write", async () => {
    const client = buildClient({
      read: { updated_at: "revision-1", preparation_data: { accessibilityPausePlan: "Pause" } },
      write: null,
    });
    const measure = buildDeclaredAccessibilityObservationMeasures({ accessibilityPausePlan: "Pause" })[0];
    await expect(updateActionAccessibilityObservation(client.client, {
      actionId: "action-1",
      expectedRevision: "revision-1",
      measurementKey: measure.key,
      definitionHash: measure.definitionHash,
      observed: true,
      evidenceKind: "participant_feedback",
      observedAt: new Date().toISOString().slice(0, 10),
    })).rejects.toBeInstanceOf(AccessibilityObservationConflictError);
    expect(client.writeFilters).toEqual([["id", "action-1"], ["updated_at", "revision-1"]]);
  });
});
