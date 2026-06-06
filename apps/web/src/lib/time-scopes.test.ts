import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTimeScopeDays,
  getTimeScopeFloorDate,
  getTimeScopeLabel,
  resolveRollingTimeScope,
  resolveTimeScopeFromRequest,
} from "./time-scopes";

describe("time scopes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps named scopes to the expected floors and labels", () => {
    const referenceDate = new Date("2026-06-05T12:00:00.000Z");

    expect(getTimeScopeFloorDate("allTime", referenceDate)).toBeNull();
    expect(getTimeScopeFloorDate("yearToDate", referenceDate)).toBe("2026-01-01");
    expect(getTimeScopeFloorDate("rolling30d", referenceDate)).toBe("2026-05-07");
    expect(getTimeScopeFloorDate("rolling90d", referenceDate)).toBe("2026-03-08");
    expect(getTimeScopeFloorDate("rolling365d", referenceDate)).toBe("2025-06-06");
    expect(getTimeScopeLabel("yearToDate")).toBe("Année en cours");
    expect(getTimeScopeDays("rolling365d")).toBe(365);
  });

  it("resolves rolling scopes and falls back cleanly for legacy day windows", () => {
    expect(resolveRollingTimeScope(30)).toBe("rolling30d");
    expect(resolveRollingTimeScope(90)).toBe("rolling90d");
    expect(resolveRollingTimeScope(365)).toBe("rolling365d");
    expect(
      resolveTimeScopeFromRequest({
        scope: null,
        days: "90",
      }),
    ).toEqual({
      scope: "rolling90d",
      days: 90,
      isLegacyDays: true,
    });
    expect(
      resolveTimeScopeFromRequest({
        scope: null,
        days: null,
        fallback: "rolling365d",
      }),
    ).toEqual({
      scope: "rolling365d",
      days: 365,
      isLegacyDays: false,
    });
  });
});
