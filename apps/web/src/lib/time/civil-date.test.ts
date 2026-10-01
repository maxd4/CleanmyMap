import { describe, expect, it } from "vitest";
import { isCivilDate, parseCivilDateAsUtc } from "./civil-date";

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
});
