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
    expect(summary.currentStreak).toBe(3);
    expect(summary.currentMonthHasEligibleAction).toBe(true);
    expect(summary.currentGrade.label).toBe("Saphir");
    expect(summary.nextLabel).toBe("Rubis");
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
    expect(summary.currentMonthHasEligibleAction).toBe(false);
    expect(summary.currentGrade.label).toBe("Observateur");
    expect(summary.nextLabel).toBe("Quartz");
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
    expect(februarySummary.currentGrade.label).toBe("Topaze");
    expect(februarySummary.nextLabel).toBe("Saphir");

    expect(marchSummary.currentStreak).toBe(0);
    expect(marchSummary.currentGrade.label).toBe("Observateur");
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
});
