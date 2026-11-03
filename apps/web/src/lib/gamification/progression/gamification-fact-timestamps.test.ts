import { describe, expect, it } from "vitest";
import {
  DETERMINISTIC_FALLBACK_OCCURRED_ON,
  latestOccurredOn,
  occurredOnAtThreshold,
  occurredOnFrom,
} from "./gamification-fact-timestamps";

describe("gamification fact timestamps", () => {
  const rows = [
    { occurredAt: "2026-10-10T10:00:00.000Z" },
    { occurredAt: "2026-10-10T11:00:00.000Z" },
    { occurredAt: "2026-10-12T10:00:00.000Z" },
  ];

  it("uses chronological date order while preserving equal-date thresholds", () => {
    expect(occurredOnAtThreshold(rows, 1, (row) => row.occurredAt)).toBe("2026-10-10");
    expect(occurredOnAtThreshold(rows, 2, (row) => row.occurredAt)).toBe("2026-10-10");
    expect(occurredOnAtThreshold(rows, 3, (row) => row.occurredAt)).toBe("2026-10-12");
  });

  it("uses the latest date and the deterministic fallback at the boundaries", () => {
    expect(latestOccurredOn(rows, (row) => row.occurredAt)).toBe("2026-10-12");
    expect(occurredOnAtThreshold(rows, 0, (row) => row.occurredAt)).toBe(DETERMINISTIC_FALLBACK_OCCURRED_ON);
    expect(occurredOnFrom(null)).toBe(DETERMINISTIC_FALLBACK_OCCURRED_ON);
  });
});
