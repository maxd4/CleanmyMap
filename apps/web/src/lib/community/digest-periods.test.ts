import { describe, expect, it } from "vitest";

import { getCommunityDigestPeriod, isDateInCommunityDigestPeriod } from "./digest-periods";

describe("community digest periods", () => {
  it("uses the Paris calendar day around UTC midnight", () => {
    expect(getCommunityDigestPeriod("daily", new Date("2026-01-01T00:30:00.000Z")).periodKey).toBe("2026-01-01");
    expect(getCommunityDigestPeriod("daily", new Date("2025-12-31T22:59:59.000Z")).periodKey).toBe("2025-12-31");
  });

  it("keeps ISO week-year at the December/January boundary", () => {
    expect(getCommunityDigestPeriod("weekly", new Date("2025-12-29T12:00:00.000Z")).periodKey).toBe("2026-W01");
    expect(getCommunityDigestPeriod("weekly", new Date("2026-01-04T23:30:00.000Z")).periodKey).toBe("2026-W02");
  });

  it("keeps the week window aligned to Paris midnights through DST", () => {
    const before = getCommunityDigestPeriod("daily", new Date("2026-03-29T00:30:00.000Z"));
    const after = getCommunityDigestPeriod("daily", new Date("2026-03-29T01:30:00.000Z"));
    expect(before.periodKey).toBe("2026-03-29");
    expect(after.periodKey).toBe("2026-03-29");
    expect(after.end.getTime() - after.start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("keeps an ISO week stable when the Paris clock changes inside it", () => {
    const before = getCommunityDigestPeriod("weekly", new Date("2026-03-28T23:30:00.000Z"));
    const after = getCommunityDigestPeriod("weekly", new Date("2026-03-29T01:30:00.000Z"));
    expect(before.periodKey).toBe("2026-W13");
    expect(after.periodKey).toBe("2026-W13");
    expect(after.end.getTime() - after.start.getTime()).toBe(167 * 60 * 60 * 1000);
  });

  it("uses an inclusive start and exclusive end for novelty", () => {
    const period = getCommunityDigestPeriod("daily", new Date("2026-02-03T12:00:00.000Z"));
    expect(isDateInCommunityDigestPeriod(period.start, period)).toBe(true);
    expect(isDateInCommunityDigestPeriod(period.end, period)).toBe(false);
  });
});
