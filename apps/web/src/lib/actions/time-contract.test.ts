import { describe, expect, it } from "vitest";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  getTimeContractValidationMessage,
  normalizeClockTime,
  formatBusinessDurationMinutes,
  roundBusinessDurationMinutes,
} from "./time-contract";

describe("action temporal contract", () => {
  it("derives a same-day event window", () => {
    expect(deriveEventDurationMinutes("09:15", "11:00")).toEqual({
      eventDurationMinutes: 105,
      status: "available",
    });
  });

  it("normalizes PostgreSQL time values for the minute-level contract", () => {
    expect(normalizeClockTime("09:00:00")).toBe("09:00");
    expect(normalizeClockTime("09:00")).toBe("09:00");
    expect(normalizeClockTime("25:00:00")).toBeNull();
  });

  it("derives organization time from the event window and action time", () => {
    expect(
      deriveOrganizationMinutes({
        actionDurationMinutes: 75,
        eventDurationMinutes: 105,
      }),
    ).toEqual({ organizationMinutes: 30, status: "available" });
  });

  it("keeps derived durations unavailable for a partial window", () => {
    expect(deriveEventDurationMinutes("09:15", null)).toEqual({
      eventDurationMinutes: null,
      status: "incomplete",
    });
    expect(
      deriveOrganizationMinutes({
        actionDurationMinutes: 75,
        eventDurationMinutes: null,
      }),
    ).toEqual({ organizationMinutes: null, status: "unavailable" });
  });

  it("reports invalid and reversed hours explicitly", () => {
    expect(deriveEventDurationMinutes("25:00", "26:00").status).toBe("invalid");
    expect(deriveEventDurationMinutes("11:00", "09:00")).toEqual({
      eventDurationMinutes: null,
      status: "inconsistent",
    });
    expect(
      getTimeContractValidationMessage({
        actionDurationMinutes: 120,
        startTime: "09:00",
        endTime: "10:00",
      }),
    ).toContain("inférieur au temps d’action");
  });

  it("accepts a zero-length event without inventing an overnight window", () => {
    expect(deriveEventDurationMinutes("00:00", "00:00")).toEqual({
      eventDurationMinutes: 0,
      status: "available",
    });
  });

  it("rounds only the business display duration to the nearest quarter hour", () => {
    expect(roundBusinessDurationMinutes(62)).toBe(60);
    expect(roundBusinessDurationMinutes(68)).toBe(75);
    expect(formatBusinessDurationMinutes(62)).toBe("60 min");
    expect(formatBusinessDurationMinutes(68)).toBe("75 min");
  });

  it("keeps the exact duration for calculations while formatting only the UX label", () => {
    const exactDurationMinutes = 68;

    expect(formatBusinessDurationMinutes(exactDurationMinutes)).toBe("75 min");
    expect(
      deriveOrganizationMinutes({
        actionDurationMinutes: exactDurationMinutes,
        eventDurationMinutes: 90,
      }),
    ).toEqual({ organizationMinutes: 22, status: "available" });
    expect(exactDurationMinutes).toBe(68);
  });
});
