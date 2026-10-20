import { describe, expect, it, vi } from "vitest";
import { formatCivilDateInTimeZone, formatDateTimeInTimeZone, isCivilDate, parseActionDateAsUtc, parseDateTimeLocalInTimeZone, parseCivilDateAsUtc } from "./civil-date";

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

  it("parses canonical action dates and rejects impossible or ambiguous values", () => {
    expect(parseActionDateAsUtc("2024-02-29")?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(parseActionDateAsUtc("2026-02-28")?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(parseActionDateAsUtc("2026-03-01T00:30:00.000Z")?.toISOString()).toBe("2026-03-01T00:30:00.000Z");
    expect(parseActionDateAsUtc("2026-03-01T00:30:00+01:00")?.toISOString()).toBe("2026-02-28T23:30:00.000Z");
    expect(parseActionDateAsUtc("2026-02-28T23:30:00-02:00")?.toISOString()).toBe("2026-03-01T01:30:00.000Z");
    expect(parseActionDateAsUtc("2026-02-30")).toBeNull();
    expect(parseActionDateAsUtc("2026-02-30T00:00:00Z")).toBeNull();
    expect(parseActionDateAsUtc("not-a-date")).toBeNull();
  });

  it.each([
    "2026-03-01T00:30:00",
    "2026-03-01 00:30:00Z",
    "March 1, 2026",
    "2026/03/01",
  ])("rejects a non-canonical action date without inventing a host-timezone instant: %s", (value) => {
    expect(parseActionDateAsUtc(value)).toBeNull();
  });

  it("keeps action-date parsing stable when the host timezone changes", () => {
    try {
      const results = ["UTC", "Europe/Paris"].map((timezone) => {
        vi.stubEnv("TZ", timezone);
        return [
          parseActionDateAsUtc("2026-03-01T00:30:00.000Z")?.toISOString(),
          parseActionDateAsUtc("2026-03-01T00:30:00")?.toISOString() ?? null,
        ];
      });
      expect(results).toEqual([
        ["2026-03-01T00:30:00.000Z", null],
        ["2026-03-01T00:30:00.000Z", null],
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("keeps the default and explicit date-time formats tied to the requested timezone", () => {
    const instant = "2026-06-30T23:30:00.000Z";
    expect(formatDateTimeInTimeZone(instant)).toBe(
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(instant)),
    );
    expect(formatDateTimeInTimeZone(instant, "UTC", { dateStyle: "full", timeStyle: "long" })).toBe(
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "long", timeZone: "UTC" }).format(new Date(instant)),
    );
  });

  it("preserves the DST transition when formatting an instant in an IANA timezone", () => {
    const before = formatDateTimeInTimeZone("2026-03-29T00:30:00.000Z", "Europe/Paris", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const after = formatDateTimeInTimeZone("2026-03-29T01:30:00.000Z", "Europe/Paris", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    expect(before).toBe("01:30");
    expect(after).toBe("03:30");
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
