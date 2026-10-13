import { describe, expect, it } from "vitest";
import { formatSpogomiCountdown, getSpogomiCountdownState } from "./spogomi-countdown.model";

const NOW = Date.parse("2030-01-02T03:04:05.000Z");

describe("SPOGOMI countdown", () => {
  it("keeps an unknown editorial date disabled", () => {
    expect(getSpogomiCountdownState(null, NOW)).toEqual({ kind: "unknown" });
  });

  it("counts down from an exact instant with an explicit offset", () => {
    const state = getSpogomiCountdownState("2030-01-03T04:05:06+00:00", NOW);
    expect(state).toEqual({ kind: "future", totalSeconds: 90_061 });
    if (state.kind !== "future") throw new Error("expected a future countdown");
    expect(formatSpogomiCountdown(state.totalSeconds)).toBe("1 j 01 h 01 min 01 s");
  });

  it("handles invalid, exact-zero and past instants without system time", () => {
    expect(getSpogomiCountdownState("not-a-date", NOW)).toEqual({ kind: "invalid" });
    expect(getSpogomiCountdownState("2030-01-02T03:04:05.000Z", NOW)).toEqual({ kind: "started" });
    expect(getSpogomiCountdownState("2030-01-01T03:04:05.000Z", NOW)).toEqual({ kind: "started" });
  });
});
