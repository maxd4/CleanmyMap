import { describe, expect, it, vi } from "vitest";
import { formatCivilDateInTimeZone, isCivilDate, parseDateTimeLocalInTimeZone, parseCivilDateAsUtc } from "./civil-date";

describe("civil date adapter", () => {
  it.each(["America/Los_Angeles", "Europe/Paris"])(
    "keeps an explicit UTC instant when viewed in %s",
    (timezone) => {
      const parsed = parseCivilDateAsUtc("2026-01-02");
      expect(parsed?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
      expect(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(parsed ?? new Date(0)),
      ).toBe(timezone === "America/Los_Angeles" ? "2026-01-01" : "2026-01-02");
      expect(isCivilDate("2026-02-30")).toBe(false);
    },
  );

  it("rejects non-civil-date inputs instead of inventing an instant", () => {
    expect(parseCivilDateAsUtc("2026-01-02T12:00:00Z")).toBeNull();
    expect(parseCivilDateAsUtc(null)).toBeNull();
  });

  it.each([
    ["Paris", "2026-07-14T10:30", "2026-07-14T08:30:00.000Z"],
    ["Lyon", "2026-01-14T10:30", "2026-01-14T09:30:00.000Z"],
    ["Marseille", "2026-06-01T00:30", "2026-05-31T22:30:00.000Z"],
    ["Lille", "2026-12-01T10:30", "2026-12-01T09:30:00.000Z"],
    ["Corse", "2026-08-15T10:30", "2026-08-15T08:30:00.000Z"],
  ])("interprets the %s wall clock in Europe/Paris", (_city, local, instant) => {
    expect(parseDateTimeLocalInTimeZone(local).toISOString()).toBe(instant);
  });

  it("preserves the Paris civil day when the instant is near UTC midnight", () => {
    expect(formatCivilDateInTimeZone("2026-06-30T23:30:00.000Z")).toBe("2026-07-01");
    expect(formatCivilDateInTimeZone("2026-06-30T23:30:00.000Z", "UTC")).toBe("2026-06-30");
  });

  it.each([
    ["spring-forward nonexistent", "2026-03-29T02:30", /nonexistent|inexistante/i],
    ["fall-back ambiguous", "2026-10-25T02:30", /ambiguous|ambiguë/i],
  ])("rejects a %s local time", (_label, local, message) => {
    expect(() => parseDateTimeLocalInTimeZone(local)).toThrow(message);
  });

  it("does not consult the host timezone for an explicit Paris conversion", () => {
    const hostOffset = vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(420);
    try {
      expect(parseDateTimeLocalInTimeZone("2026-07-14T10:30").toISOString()).toBe("2026-07-14T08:30:00.000Z");
    } finally {
      hostOffset.mockRestore();
    }
  });
});
