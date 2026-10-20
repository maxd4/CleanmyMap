import { describe, expect, it } from "vitest";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  filterReportGenerationContracts,
  getReportGenerationPeriodDateBounds,
  getReportGenerationPeriodBounds,
  filterReportCommunityEventsByPeriod,
  isReportGenerationDateInPeriod,
  isValidReportGenerationPeriodSelection,
} from "./generation-period";

function contractAt(
  observedAt: string,
  id: string,
  status: "approved" | "pending" = "approved",
): ActionDataContract {
  return { id, status, dates: { observedAt } } as ActionDataContract;
}

describe("report generation period", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");

  it("uses inclusive six-calendar-month bounds and excludes invalid, future and unapproved rows", () => {
    const contracts = [
      contractAt("2026-02-27T23:59:59.999Z", "before-floor"),
      contractAt("2026-02-28T00:00:00.000Z", "at-floor"),
      contractAt("2026-08-31T12:00:00.000Z", "at-now"),
      contractAt("2026-08-31T12:00:00.001Z", "future"),
      contractAt("not-a-date", "invalid"),
      contractAt("2026-08-01T00:00:00.000Z", "pending", "pending"),
    ];

    expect(
      filterReportGenerationContracts(contracts, "six_months", now).map((contract) => contract.id),
    ).toEqual(["at-floor", "at-now"]);
  });

  it("starts the current-year period at 1 January UTC across a year boundary", () => {
    const contracts = [
      contractAt("2025-12-31T23:59:59.999Z", "last-year"),
      contractAt("2026-01-01T00:00:00.000Z", "new-year"),
      contractAt("2026-08-31T12:00:00.000Z", "today"),
    ];

    expect(
      filterReportGenerationContracts(contracts, "current_year", now).map((contract) => contract.id),
    ).toEqual(["new-year", "today"]);
  });

  it("keeps every valid approved date up to now for full history", () => {
    const contracts = [
      contractAt("2020-01-01T00:00:00.000Z", "old"),
      contractAt("2026-08-31T12:00:00.000Z", "today"),
      contractAt("2026-09-01T00:00:00.000Z", "future"),
      contractAt("invalid", "invalid"),
    ];

    expect(
      filterReportGenerationContracts(contracts, "full_history", now).map((contract) => contract.id),
    ).toEqual(["old", "today"]);
  });

  it("exposes injectable upper and lower bounds without lexical date comparisons", () => {
    expect(getReportGenerationPeriodBounds("six_months", now)).toEqual({
      lowerBound: Date.parse("2026-02-28T00:00:00.000Z"),
      upperBound: now.getTime(),
    });
    expect(getReportGenerationPeriodBounds("current_year", now).lowerBound).toBe(
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
    expect(getReportGenerationPeriodBounds("full_history", now).lowerBound).toBeNull();
  });

  it("supports the added rolling windows", () => {
    const contracts = [
      contractAt("2026-05-30T12:00:00.000Z", "outside-three-months"),
      contractAt("2026-05-31T00:00:00.000Z", "at-three-month-floor"),
      contractAt("2026-08-31T12:00:00.000Z", "today"),
    ];

    expect(
      filterReportGenerationContracts(contracts, "three_months", now).map((contract) => contract.id),
    ).toEqual(["at-three-month-floor", "today"]);
    expect(getReportGenerationPeriodBounds("twelve_months", now).lowerBound).toBe(
      Date.parse("2025-08-31T00:00:00.000Z"),
    );
  });

  it("treats custom bounds as inclusive UTC civil dates and rejects reversed dates", () => {
    const selection = { id: "custom_range" as const, from: "2026-08-01", to: "2026-08-31" };
    const contracts = [
      contractAt("2026-07-31T23:59:59.999Z", "outside"),
      contractAt("2026-08-01T00:00:00.000Z", "from"),
      contractAt("2026-08-31T23:59:59.999Z", "to"),
      contractAt("2026-09-01T00:00:00.000Z", "future"),
    ];

    expect(filterReportGenerationContracts(contracts, selection, now).map((contract) => contract.id)).toEqual([
      "from",
      "to",
    ]);
    expect(() => getReportGenerationPeriodDateBounds(selection, now)).not.toThrow();
    expect(() => getReportGenerationPeriodDateBounds(
      { id: "custom_range", from: "2026-09-01", to: "2026-08-01" },
      now,
    )).toThrow(RangeError);
  });

  it("clamps calendar subtraction on leap years and keeps the UTC floor inclusive", () => {
    const leapYearNow = new Date("2024-08-31T12:00:00.000Z");
    const contracts = [
      contractAt("2024-02-28T23:59:59.999Z", "before-leap-floor"),
      contractAt("2024-02-29T00:00:00.000Z", "leap-floor"),
      contractAt("2024-08-31T12:00:00.000Z", "leap-now"),
    ];

    expect(getReportGenerationPeriodBounds("six_months", leapYearNow)).toEqual({
      lowerBound: Date.parse("2024-02-29T00:00:00.000Z"),
      upperBound: leapYearNow.getTime(),
    });
    expect(filterReportGenerationContracts(contracts, "six_months", leapYearNow).map((contract) => contract.id)).toEqual([
      "leap-floor",
      "leap-now",
    ]);
  });

  it("validates civil dates instead of accepting normalized calendar overflows", () => {
    expect(isValidReportGenerationPeriodSelection({
      id: "custom_range",
      from: "2024-02-29",
      to: "2024-02-29",
    })).toBe(true);
    expect(isValidReportGenerationPeriodSelection({
      id: "custom_range",
      from: "2023-02-29",
      to: "2023-03-01",
    })).toBe(false);
    expect(isValidReportGenerationPeriodSelection({
      id: "custom_range",
      from: "2024-02-30",
      to: "2024-03-01",
    })).toBe(false);
    expect(isValidReportGenerationPeriodSelection({
      id: "custom_range",
      from: "2024-03-01T00:00:00.000Z",
      to: "2024-03-02",
    })).toBe(false);
    expect(() => getReportGenerationPeriodBounds("six_months", new Date("invalid"))).toThrow(RangeError);
  });

  it("uses UTC civil dates for custom ranges even when offsets cross a calendar boundary", () => {
    const selection = { id: "custom_range" as const, from: "2026-08-01", to: "2026-08-31" };

    expect(isReportGenerationDateInPeriod("2026-08-01T02:30:00+02:00", selection, now)).toBe(true);
    expect(isReportGenerationDateInPeriod("2026-08-31T23:30:00-02:00", selection, now)).toBe(false);
    expect(isReportGenerationDateInPeriod("not-a-date", selection, now)).toBe(false);
  });

  it("rejects invalid relative dates and applies the same inclusive window to community events", () => {
    expect(isReportGenerationDateInPeriod("not-a-date", { id: "thirty_days" }, now)).toBe(false);
    const events = [
      { id: "at-floor", eventDate: "2026-08-01T00:00:00.000Z" },
      { id: "at-now", eventDate: now.toISOString() },
      { id: "future", eventDate: "2026-09-01T00:00:00.000Z" },
    ] as never;
    expect(filterReportCommunityEventsByPeriod(events, { id: "full_history" }, now).map((event: { id: string }) => event.id)).toEqual([
      "at-floor",
      "at-now",
    ]);
  });
});
