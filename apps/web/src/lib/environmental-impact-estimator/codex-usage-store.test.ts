import { describe, expect, it } from "vitest";
import {
  buildCodexMonthlyUsageEstimate,
  buildCodexUsageWeeklySnapshot,
} from "./codex-usage-store";

describe("codex usage store", () => {
  it("builds a weekly snapshot with a transparent CO2e proxy", () => {
    const snapshot = buildCodexUsageWeeklySnapshot({
      weekStart: "2026-05-19",
      weekEnd: "2026-05-25",
      sessionCount: 5,
      conversationCount: 9,
      turnCount: 36,
      toolCallCount: 12,
      shellCommandCount: 14,
      fileTouchCount: 20,
      testRunCount: 5,
      changedLineCount: 520,
      activeMinutes: 240,
      source: "manual",
      notes: ["Semaine test"],
    });

    expect(snapshot.weekStart).toBe("2026-05-19");
    expect(snapshot.weekEnd).toBe("2026-05-25");
    expect(snapshot.estimatedKgCo2eProxy).toBeGreaterThan(0);
    expect(snapshot.confidencePercent).toBeGreaterThan(80);
  });

  it("aggregates several weeks into a monthly Codex estimate", () => {
    const aggregate = buildCodexMonthlyUsageEstimate([
      buildCodexUsageWeeklySnapshot({
        weekStart: "2026-05-12",
        weekEnd: "2026-05-18",
        sessionCount: 4,
        conversationCount: 8,
        turnCount: 32,
        toolCallCount: 10,
        shellCommandCount: 12,
        fileTouchCount: 18,
        testRunCount: 4,
        changedLineCount: 480,
        activeMinutes: 210,
        source: "manual",
      }),
      buildCodexUsageWeeklySnapshot({
        weekStart: "2026-05-19",
        weekEnd: "2026-05-25",
        sessionCount: 5,
        conversationCount: 9,
        turnCount: 36,
        toolCallCount: 12,
        shellCommandCount: 14,
        fileTouchCount: 20,
        testRunCount: 5,
        changedLineCount: 520,
        activeMinutes: 240,
        source: "manual",
      }),
    ]);

    expect(aggregate.weekCount).toBe(2);
    expect(aggregate.source).toBe("manual");
    expect(aggregate.estimatedKgCo2eProxy).toBeGreaterThan(0);
    expect(aggregate.monthlyEquivalent.sessionCount).toBeGreaterThan(0);
    expect(aggregate.notes.length).toBeGreaterThan(0);
  });
});
