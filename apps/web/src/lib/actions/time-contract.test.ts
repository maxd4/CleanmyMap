import { describe, expect, it } from "vitest";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  getTimeContractValidationIssues,
  getTimeContractValidationMessage,
  normalizeClockTime,
  formatBusinessDurationMinutes,
  formatBusinessDurationRangeMinutes,
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

  it("checks rendez-vous, departure, global window, and declared duration together", () => {
    expect(getTimeContractValidationIssues({
      actionDurationMinutes: 120,
      meetingTime: "08:30",
      departureTime: "08:00",
      startTime: "09:00",
      endTime: "10:00",
    })).toEqual([
      {
        field: "departureTime",
        message: "L’heure de départ doit être postérieure ou égale à l’heure de rendez-vous.",
      },
      {
        field: "meetingTime",
        message: "L’heure de rendez-vous doit être comprise dans le créneau global.",
      },
      {
        field: "departureTime",
        message: "L’heure de départ doit être comprise dans le créneau global.",
      },
      {
        field: "durationMinutes",
        message: "Le créneau total de l’événement est inférieur au temps d’action déclaré.",
      },
    ]);
  });

  it("accepts incomplete optional hours and an unknown duration", () => {
    expect(getTimeContractValidationIssues({
      actionDurationMinutes: undefined,
      meetingTime: "09:00",
      departureTime: "",
      startTime: "",
      endTime: "10:00",
    })).toEqual([]);
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

  it("displays operational estimates as quarter-hour intervals", () => {
    expect(formatBusinessDurationRangeMinutes(52)).toBe("45 min – 1 h");
    expect(formatBusinessDurationRangeMinutes(60)).toBe("1 h");
  });
});
