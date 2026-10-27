import { describe, expect, it } from "vitest";
import {
  compareCreatorInboxRecordCursors,
  encodeCreatorInboxHistoricalCursor,
  isCreatorInboxRecordCursor,
  isCreatorInboxHistoricalRecordCursor,
  parseCreatorInboxHistoricalCursor,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";

function cursor(createdAt: string, id: string): CreatorInboxRecordCursor {
  return { createdAt, id };
}

describe("creator inbox cursor contract", () => {
  it("orders valid timestamps before the id tie-breaker", () => {
    expect(
      compareCreatorInboxRecordCursors(
        cursor("2026-10-27T10:00:00.000Z", "later"),
        cursor("2026-10-27T09:59:59.999Z", "earlier"),
      ),
    ).toBeGreaterThan(0);
    expect(
      compareCreatorInboxRecordCursors(
        cursor("2026-10-27T10:00:00.000Z", "a"),
        cursor("2026-10-27T10:00:00.000Z", "b"),
      ),
    ).toBeLessThan(0);
    expect(
      compareCreatorInboxRecordCursors(
        cursor("2026-10-27T10:00:00.000Z", "same"),
        cursor("2026-10-27T10:00:00.000Z", "same"),
      ),
    ).toBe(0);
  });

  it("compares equivalent timezone representations by id", () => {
    expect(
      compareCreatorInboxRecordCursors(
        cursor("2026-10-27T12:00:00+02:00", "a"),
        cursor("2026-10-27T10:00:00.000Z", "b"),
      ),
    ).toBeLessThan(0);
    expect(
      compareCreatorInboxRecordCursors(
        cursor("2026-10-27T10:00:00.000Z", "b"),
        cursor("2026-10-27T12:00:00+02:00", "a"),
      ),
    ).toBeGreaterThan(0);
  });

  it("keeps the valid-date and invalid-date boundary transitive", () => {
    const a = cursor("2026-10-27T10:00:00.000Z", "z");
    const b = cursor("2026-10-27T12:00:00+02:00", "a");
    const c = cursor("2026-10-27T11:00:00-invalid", "x");

    expect(compareCreatorInboxRecordCursors(a, b)).toBeGreaterThan(0);
    expect(compareCreatorInboxRecordCursors(a, c)).toBeGreaterThan(0);
    expect(compareCreatorInboxRecordCursors(b, c)).toBeGreaterThan(0);
    expect(compareCreatorInboxRecordCursors(c, b)).toBeLessThan(0);
    // A > B and B > C must imply A > C for this cursor order.
    expect(compareCreatorInboxRecordCursors(a, c)).toBeGreaterThan(0);
  });

  it("falls back lexicographically for invalid dates and still uses id ties", () => {
    expect(
      compareCreatorInboxRecordCursors(
        cursor("not-a-date-b", "a"),
        cursor("not-a-date-a", "z"),
      ),
    ).toBeGreaterThan(0);
    expect(
      compareCreatorInboxRecordCursors(
        cursor("not-a-date", "a"),
        cursor("not-a-date", "b"),
      ),
    ).toBeLessThan(0);
    expect(
      compareCreatorInboxRecordCursors(
        cursor("not-a-date", "same"),
        cursor("not-a-date", "same"),
      ),
    ).toBe(0);
  });

  it("defines a deterministic antisymmetric and transitive total order", () => {
    const values = [
      cursor("2026-10-27T10:00:00.000Z", "z"),
      cursor("2026-10-27T10:00:00.000Z", "a"),
      cursor("2026-10-27T12:00:00+02:00", "m"),
      cursor("2026-10-27T09:00:00.000Z", "x"),
      cursor("invalid", "x"),
      cursor("invalid", "y"),
      cursor("invalid-later", "z"),
    ];

    for (const left of values) {
      for (const right of values) {
        const forward = Math.sign(compareCreatorInboxRecordCursors(left, right));
        const reverse = Math.sign(compareCreatorInboxRecordCursors(right, left));
        expect(forward === 0 ? reverse : forward).toBe(forward === 0 ? 0 : -reverse);
      }
    }

    for (const left of values) {
      for (const middle of values) {
        for (const right of values) {
          const leftToMiddle = compareCreatorInboxRecordCursors(left, middle);
          const middleToRight = compareCreatorInboxRecordCursors(middle, right);
          if (leftToMiddle > 0 && middleToRight > 0) {
            expect(compareCreatorInboxRecordCursors(left, right)).toBeGreaterThan(0);
          }
          if (leftToMiddle < 0 && middleToRight < 0) {
            expect(compareCreatorInboxRecordCursors(left, right)).toBeLessThan(0);
          }
        }
      }
    }

    const expected = [
      cursor("invalid", "x"),
      cursor("invalid", "y"),
      cursor("invalid-later", "z"),
      cursor("2026-10-27T09:00:00.000Z", "x"),
      cursor("2026-10-27T10:00:00.000Z", "a"),
      cursor("2026-10-27T12:00:00+02:00", "m"),
      cursor("2026-10-27T10:00:00.000Z", "z"),
    ];
    expect([...values].sort(compareCreatorInboxRecordCursors)).toEqual(expected);
    expect([...values].reverse().sort(compareCreatorInboxRecordCursors)).toEqual(expected);
    expect([...values].sort(compareCreatorInboxRecordCursors).sort(compareCreatorInboxRecordCursors)).toEqual(expected);
  });

  it("validates finite dates and bounded non-empty ids", () => {
    expect(isCreatorInboxRecordCursor(cursor("2026-10-27T10:00:00.000Z", "id"))).toBe(true);
    expect(isCreatorInboxRecordCursor(cursor("2026-10-27T10:00:00+02:00", "id"))).toBe(true);
    expect(isCreatorInboxRecordCursor(cursor("invalid", "id"))).toBe(false);
    expect(isCreatorInboxRecordCursor(cursor("2026-10-27T10:00:00.000Z", ""))).toBe(false);
    expect(isCreatorInboxRecordCursor(cursor("2026-10-27T10:00:00.000Z", " "))).toBe(false);
    expect(isCreatorInboxRecordCursor(cursor("2026-10-27T10:00:00.000Z", "x".repeat(129)))).toBe(false);
    expect(isCreatorInboxRecordCursor(null)).toBe(false);
    expect(isCreatorInboxRecordCursor({ createdAt: "2026-10-27T10:00:00.000Z" })).toBe(false);
  });

  it("keeps malformed historical keys out of the SQL cursor contract", () => {
    const historical = {
      version: 1 as const,
      kind: "historical" as const,
      createdAt: "invalid-c",
      id: "invalid-c",
    };

    expect(isCreatorInboxHistoricalRecordCursor(historical)).toBe(true);
    expect(isCreatorInboxRecordCursor(historical)).toBe(false);
    const encoded = encodeCreatorInboxHistoricalCursor(historical);
    expect(parseCreatorInboxHistoricalCursor(encoded)).toEqual(historical);
    expect(parseCreatorInboxHistoricalCursor(`${encoded}x`)).toBeNull();
    const validDatePayload = Buffer.from(JSON.stringify({
      version: 1,
      kind: "historical",
      createdAt: "2026-10-27T10:00:00.000Z",
      id: "invalid-c",
    }), "utf8").toString("base64url");
    expect(parseCreatorInboxHistoricalCursor(`historic-v1.${validDatePayload}`)).toBeNull();
    expect(isCreatorInboxHistoricalRecordCursor({
      version: 1,
      kind: "historical",
      createdAt: "invalid-c",
      id: "id.without.safe.shape",
    })).toBe(false);
  });
});
