import { describe, expect, it } from "vitest";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import {
  resolveRouteDataLayers,
  resolveRouteDataStatus,
  resolveRouteRecommendationStatus,
} from "./route-data-status";

function sourceHealth(overrides: Partial<UnifiedSourceHealth> = {}): UnifiedSourceHealth {
  return {
    partial: false,
    failedSources: [],
    availableSources: ["spots"],
    warnings: [],
    ...overrides,
  };
}

describe("route data status", () => {
  it("distinguishes a genuinely empty available source", () => {
    expect(
      resolveRouteDataStatus({
        candidateCount: 0,
        isTruncated: false,
        sourceHealth: sourceHealth(),
      }),
    ).toBe("empty");
  });

  it("marks truncated or partial data explicitly", () => {
    expect(
      resolveRouteDataStatus({
        candidateCount: 2,
        isTruncated: true,
        sourceHealth: sourceHealth(),
      }),
    ).toBe("partial");
  });

  it("never maps an unavailable source to an empty dataset", () => {
    expect(
      resolveRouteDataStatus({
        candidateCount: 0,
        isTruncated: false,
        sourceHealth: sourceHealth({
          partial: true,
          failedSources: ["spots"],
          availableSources: [],
          warnings: ["source unavailable"],
        }),
      }),
    ).toBe("unavailable");
  });

  it("summarizes healthy, empty and degraded route responses", () => {
    expect(
      resolveRouteRecommendationStatus({
        dataStatus: "complete",
        selectedCount: 2,
        routeGeometryMode: "network",
      }),
    ).toBe("ok");
    expect(
      resolveRouteRecommendationStatus({
        dataStatus: "empty",
        selectedCount: 0,
        routeGeometryMode: "fallback",
      }),
    ).toBe("empty");
    expect(
      resolveRouteRecommendationStatus({
        dataStatus: "partial",
        selectedCount: 2,
        routeGeometryMode: "network",
      }),
    ).toBe("degraded");
    expect(
      resolveRouteRecommendationStatus({
        dataStatus: "complete",
        selectedCount: 1,
        routeGeometryMode: "fallback",
      }),
    ).toBe("degraded");
  });

  it("distingue une source observée vide d'une prédiction disponible sélectionnée", () => {
    expect(resolveRouteDataLayers({
      observed: { candidateCount: 0, isTruncated: false, sourceHealth: sourceHealth() },
      prediction: { status: "available", selectedCount: 1 },
      selectedCount: 1,
      routeGeometryMode: "network",
    })).toEqual({ observed: "empty", prediction: "available", recommendation: "ok" });
  });

  it("conserve empty lorsque les deux familles ne produisent aucun stop", () => {
    expect(resolveRouteDataLayers({
      observed: { candidateCount: 0, isTruncated: false, sourceHealth: sourceHealth() },
      prediction: { status: "unavailable", selectedCount: 0 },
      selectedCount: 0,
      routeGeometryMode: "fallback",
    })).toEqual({ observed: "empty", prediction: "unavailable", recommendation: "empty" });
  });
});
