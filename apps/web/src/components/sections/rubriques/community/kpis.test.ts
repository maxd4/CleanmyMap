import { describe, expect, it } from "vitest";
import type { EventConversionSummary } from "@/lib/community/engagement";
import { buildConversionKpiCards, formatPct } from "./kpis";

const summary: EventConversionSummary = {
  eventsCount: 5,
  rsvpYesTotal: 60,
  attendanceTotalKnown: 42,
  linkedActionsTotal: 18,
  rsvpToAttendanceRate: 70,
  attendanceToActionRate: 42.857142857,
  rsvpToActionRate: 30,
};

describe("community KPI helpers", () => {
  it("formats percentages and handles missing values", () => {
    expect(formatPct(42)).toBe("42.0%");
    expect(formatPct(null)).toBe("n/a");
    expect(formatPct(Number.NaN)).toBe("n/a");
  });

  it("builds the three conversion KPI cards", () => {
    const cards = buildConversionKpiCards(summary);
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.id)).toEqual([
      "rsvp_to_attendance",
      "attendance_to_action",
      "rsvp_to_action",
    ]);
    expect(cards[0]).toMatchObject({
      title: "Conversion RSVP -> presence",
      value: "70.0%",
    });
    expect(cards[1]).toMatchObject({
      title: "Conversion presence -> action",
      value: "42.9%",
    });
  });
});
