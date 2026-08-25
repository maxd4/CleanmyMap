import { describe, expect, it } from "vitest";
import {
  ACTION_REVISIT_PRIORITY_CONSTANTS,
  presentActionRevisitPriority,
  resolveObservationAgeDays,
} from "./revisit-priority";

const NOW = new Date("2026-08-25T00:00:00.000Z");

function observedDate(ageDays: number): string {
  const date = new Date(NOW.getTime() - ageDays * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

describe("action revisit priority presentation", () => {
  it("keeps the observed score unchanged for fresh observations", () => {
    const result = presentActionRevisitPriority(42, observedDate(0), NOW);

    expect(result.observedScore).toBe(42);
    expect(result.freshnessMalus).toBe(0);
    expect(result.revisitPriority).toBe(42);
  });

  it("applies no malus through 30 days and 0.1 per additional day", () => {
    expect(
      presentActionRevisitPriority(42, observedDate(30), NOW).freshnessMalus,
    ).toBe(0);
    expect(
      presentActionRevisitPriority(42, observedDate(31), NOW).freshnessMalus,
    ).toBe(0.1);
    expect(
      presentActionRevisitPriority(42, observedDate(80), NOW).freshnessMalus,
    ).toBe(5);
  });

  it("caps the malus at 30 and the priority at 100", () => {
    const stale = presentActionRevisitPriority(10, observedDate(10_000), NOW);
    const saturated = presentActionRevisitPriority(99.9, observedDate(31), NOW);

    expect(stale.freshnessMalus).toBe(
      ACTION_REVISIT_PRIORITY_CONSTANTS.maxMalus,
    );
    expect(stale.revisitPriority).toBe(40);
    expect(saturated.revisitPriority).toBe(100);
  });

  it("does not age observations dated in the future", () => {
    expect(resolveObservationAgeDays(observedDate(-2), NOW)).toBe(0);
  });
});
