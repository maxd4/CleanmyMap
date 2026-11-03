import { describe, expect, it } from "vitest";
import {
  computeMonthlyRegularityAwards,
  computeMonthlyRegularitySummary,
} from "./monthly-regularity";

function buildRow(
  actionDate: string,
  status: "pending" | "approved" | "rejected" = "pending",
) {
  return {
    action_date: actionDate,
    created_at: actionDate,
    status,
  };
}

describe("computeMonthlyRegularityAwards", () => {
  it("builds a consecutive monthly streak and gem progression", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "approved"),
      buildRow("2026-03-05", "pending"),
    ];

    const awards = computeMonthlyRegularityAwards(rows);
    const summary = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-03-20T00:00:00.000Z"),
    );

    expect(awards).toEqual([
      expect.objectContaining({
        monthKey: "2026-01",
        streak: 1,
        xpAwarded: 1,
      }),
      expect.objectContaining({
        monthKey: "2026-02",
        streak: 2,
        xpAwarded: 2,
      }),
      expect.objectContaining({
        monthKey: "2026-03",
        streak: 3,
        xpAwarded: 3,
      }),
    ]);
    expect(summary.activeMonthsTotal).toBe(3);
    expect(summary.currentStreakMonths).toBe(3);
    expect(summary.longestStreakMonths).toBe(3);
    expect(summary.currentStreak).toBe(3);
    expect(summary.currentMonthHasEligibleAction).toBe(true);
    expect(summary.currentGrade.label).toBe("Topaze");
    expect(summary.nextLabel).toBe("Saphir");
  });

  it("resets the streak when the current month has no eligible action", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "approved"),
    ];

    const summary = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-03-20T00:00:00.000Z"),
    );

    expect(summary.currentStreak).toBe(0);
    expect(summary.activeMonthsTotal).toBe(2);
    expect(summary.currentStreakMonths).toBe(0);
    expect(summary.longestStreakMonths).toBe(2);
    expect(summary.currentMonthHasEligibleAction).toBe(false);
    expect(summary.currentGrade.label).toBe("Quartz");
    expect(summary.nextLabel).toBe("Topaze");
  });

  it("moves the streak forward only when the reference month changes to a month with eligible actions", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "approved"),
    ];

    const februarySummary = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-02-20T00:00:00.000Z"),
    );
    const marchSummary = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-03-20T00:00:00.000Z"),
    );

    expect(februarySummary.currentStreak).toBe(2);
    expect(februarySummary.activeMonthsTotal).toBe(2);
    expect(februarySummary.currentGrade.label).toBe("Quartz");
    expect(februarySummary.nextLabel).toBe("Topaze");

    expect(marchSummary.currentStreak).toBe(0);
    expect(marchSummary.activeMonthsTotal).toBe(2);
    expect(marchSummary.longestStreakMonths).toBe(2);
    expect(marchSummary.currentGrade.label).toBe("Quartz");
  });

  it("ignores rejected actions and restarts the chain after a gap", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "rejected"),
      buildRow("2026-03-05", "pending"),
    ];

    const awards = computeMonthlyRegularityAwards(rows);

    expect(awards).toEqual([
      expect.objectContaining({
        monthKey: "2026-01",
        streak: 1,
        xpAwarded: 1,
      }),
      expect.objectContaining({
        monthKey: "2026-03",
        streak: 1,
        xpAwarded: 1,
      }),
    ]);
  });

  it("keeps the permanent badge after an interruption and restarts the XP streak", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "approved"),
      buildRow("2026-04-05", "pending"),
    ];

    const summary = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-04-20T00:00:00.000Z"),
    );

    expect(summary.activeMonthsTotal).toBe(3);
    expect(summary.currentStreakMonths).toBe(1);
    expect(summary.longestStreakMonths).toBe(2);
    expect(summary.currentGrade.label).toBe("Topaze");
    expect(summary.monthlyAwards.map((award) => award.xpAwarded)).toEqual([1, 2, 1]);
  });

  it("rebuilds deterministically after a rejected month", () => {
    const rows = [
      buildRow("2026-01-12", "pending"),
      buildRow("2026-02-08", "rejected"),
      buildRow("2026-03-05", "pending"),
    ];

    const first = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-03-20T00:00:00.000Z"),
    );
    const replay = computeMonthlyRegularitySummary(
      rows,
      new Date("2026-03-20T00:00:00.000Z"),
    );

    expect(first).toEqual(replay);
    expect(first.activeMonthsTotal).toBe(2);
    expect(first.currentStreakMonths).toBe(1);
    expect(first.longestStreakMonths).toBe(1);
    expect(first.monthlyAwards.map((award) => award.xpAwarded)).toEqual([1, 1]);
  });
});
