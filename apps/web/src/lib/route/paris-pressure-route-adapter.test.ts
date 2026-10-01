import { describe, expect, it, vi } from "vitest";
import { applyParisPressureToCandidates } from "./paris-pressure-route-adapter";
import { parisPressureSnapshot as snapshot } from "@/lib/geo/__tests__/paris-pressure-fixture";

describe("Paris pressure route adapter", () => {
  it("applies a bounded structural boost without changing source data", () => {
    const candidates = applyParisPressureToCandidates([{ id: "spot-1", latitude: 48.8566, longitude: 2.3522, score: 50, reason: "base" }], snapshot);
    expect(candidates[0]?.score).toBeCloseTo(56.4);
    expect(candidates[0]?.reason).toContain("Pression humaine structurelle");
  });

  it("keeps the route score capped", () => {
    const candidates = applyParisPressureToCandidates([{ id: "spot-1", latitude: 48.8566, longitude: 2.3522, score: 99.9, reason: "base" }], snapshot);
    expect(candidates[0]?.score).toBe(100);
  });

  it("preserves observed family and evidence while applying pressure", () => {
    const evidence = {
      family: "observed" as const,
      source: "trash_spotter_spots" as const,
      proof: "validated" as const,
      observedAt: "2026-08-20T10:00:00.000Z",
    };
    const [candidate] = applyParisPressureToCandidates([{
      id: "spot-1",
      latitude: 48.8566,
      longitude: 2.3522,
      score: 50,
      reason: "base",
      family: "observed" as const,
      evidence,
    }], snapshot);

    expect(candidate).toMatchObject({ family: "observed", evidence });
  });

  it("n'effectue aucun appel réseau", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      applyParisPressureToCandidates([{ id: "spot-1", latitude: 48.8566, longitude: 2.3522, score: 50, reason: "base" }], snapshot);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
