import { afterEach, describe, expect, it } from "vitest";
import { isCivilDate, parseCivilDateAsUtc } from "./civil-date";

describe("civil date adapter", () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimezone;
  });

  it.each(["America/Los_Angeles", "Europe/Paris"])(
    "is independent from the host timezone: %s",
    (timezone) => {
      process.env.TZ = timezone;
      expect(parseCivilDateAsUtc("2026-01-02")?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
      expect(isCivilDate("2026-02-30")).toBe(false);
    },
  );

  it("rejects non-civil-date inputs instead of inventing an instant", () => {
    expect(parseCivilDateAsUtc("2026-01-02T12:00:00Z")).toBeNull();
    expect(parseCivilDateAsUtc(null)).toBeNull();
  });
});
