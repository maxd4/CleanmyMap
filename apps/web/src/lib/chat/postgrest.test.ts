import { describe, expect, it } from "vitest";
import {
  dedupeById,
  escapePostgrestLikePattern,
  mergeRowGroupsById,
  parseChatRows,
  parseChatSingleRow,
  parseChatSupabaseResult,
  sortByCreatedAtAsc,
} from "./postgrest";

describe("Chat Supabase boundary parsers", () => {
  it("keeps valid result envelopes and rejects malformed row collections", () => {
    const result = parseChatSupabaseResult({
      data: [{ id: "message-1" }],
      error: null,
      count: null,
    });

    expect(result.error).toBeNull();
    expect(parseChatRows(result.data, (value): value is { id: string } =>
      typeof value === "object" && value !== null && !Array.isArray(value) &&
      "id" in value && typeof value.id === "string",
    )).toEqual([{ id: "message-1" }]);
    expect(parseChatRows({ id: "message-1" }, (value): value is { id: string } =>
      typeof value === "object" && value !== null,
    )).toBeNull();
  });

  it("fails closed for invalid envelopes and single rows", () => {
    const malformedError = parseChatSupabaseResult({
      data: null,
      error: { code: "P0001" },
    });

    expect(malformedError.error).toBeInstanceOf(Error);
    expect(malformedError.error).toMatchObject({
      message: "La réponse Supabase du Chat est invalide.",
    });

    expect(parseChatSupabaseResult({ data: "invalid", error: { message: "boom" } })).toMatchObject({
      data: "invalid",
      error: { message: "boom" },
    });
    expect(parseChatSingleRow({ id: 42 }, (value): value is { id: string } =>
      typeof value === "object" && value !== null && !Array.isArray(value) &&
      "id" in value && typeof value.id === "string",
    )).toBeNull();
  });

  it("preserves Supabase error semantics and metadata", () => {
    const result = parseChatSupabaseResult({
      data: null,
      error: {
        message: "Invalid DM peer",
        code: "P0001",
        details: "internal detail",
        hint: "internal hint",
      },
      count: 0,
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error).toMatchObject({
      message: "Invalid DM peer",
      code: "P0001",
      details: "internal detail",
      hint: "internal hint",
    });
    expect(result.data).toBeNull();
    expect(result.count).toBe(0);
  });

  it("keeps valid null-error envelopes unchanged", () => {
    const result = parseChatSupabaseResult({ data: [], error: null, count: 0 });

    expect(result).toEqual({ data: [], error: null, count: 0 });
  });
});

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
