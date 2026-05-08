import { describe, expect, it } from "vitest";
import {
  dedupeById,
  escapePostgrestLikePattern,
  mergeRowGroupsById,
  sortByCreatedAtAsc,
} from "./postgrest";

describe("escapePostgrestLikePattern", () => {
  it("escapes wildcard and backslash characters", () => {
    expect(escapePostgrestLikePattern(String.raw`a\b%c_d`)).toBe(
      String.raw`a\\b\%c\_d`,
    );
  });
});

describe("dedupeById", () => {
  it("keeps the first row for each id", () => {
    const rows = dedupeById([
      { id: "1", value: "first" },
      { id: "2", value: "second" },
      { id: "1", value: "duplicate" },
    ]);

    expect(rows).toEqual([
      { id: "1", value: "first" },
      { id: "2", value: "second" },
    ]);
  });
});

describe("mergeRowGroupsById", () => {
  it("merges groups and removes duplicate ids", () => {
    const rows = mergeRowGroupsById([
      [
        { id: "1", value: "first" },
        { id: "2", value: "second" },
      ],
      [
        { id: "2", value: "duplicate" },
        { id: "3", value: "third" },
      ],
    ]);

    expect(rows).toEqual([
      { id: "1", value: "first" },
      { id: "2", value: "second" },
      { id: "3", value: "third" },
    ]);
  });
});

describe("sortByCreatedAtAsc", () => {
  it("sorts by timestamp and uses id as a tiebreaker", () => {
    const rows = sortByCreatedAtAsc([
      { id: "b", created_at: "2025-01-01T10:00:00.000Z" },
      { id: "a", created_at: "2025-01-01T10:00:00.000Z" },
      { id: "c", created_at: "2025-01-01T09:00:00.000Z" },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["c", "a", "b"]);
  });
});
