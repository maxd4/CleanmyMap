import { describe, expect, it } from "vitest";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import { resolveRouteDataStatus } from "./route-data-status";

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
});
