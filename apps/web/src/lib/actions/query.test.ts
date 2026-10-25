import { describe, expect, it } from "vitest";
import {
  ActionSupabaseError,
  parseActionRows,
  parseActionSingleRow,
  parseActionSupabaseResult,
} from "./query";

describe("parseActionSupabaseResult", () => {
  it("preserves Supabase error semantics and metadata", () => {
    const result = parseActionSupabaseResult({
      data: null,
      error: {
        message: "private_registration_already_decided",
        code: "P0001",
        details: "private SQL detail",
        hint: "private SQL hint",
      },
      count: 0,
    });

    expect(result.data).toBeNull();
    expect(result.count).toBe(0);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error).toBeInstanceOf(ActionSupabaseError);
    expect(result.error).toMatchObject({
      message: "private_registration_already_decided",
      code: "P0001",
      details: "private SQL detail",
      hint: "private SQL hint",
    });
  });

  it("normalizes structurally invalid responses with a neutral Error", () => {
    const result = parseActionSupabaseResult({ data: null, error: { code: "P0001" } });

    expect(result.data).toBeNull();
    expect(result.count).toBeNull();
    expect(result.error).toBeInstanceOf(ActionSupabaseError);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("La réponse Supabase est invalide.");
  });

  it("keeps valid null, array and count results unchanged", () => {
    const empty = parseActionSupabaseResult({ data: null, error: null, count: 0 });
    const rows = parseActionSupabaseResult({
      data: [{ action_id: "action-1" }],
      error: null,
      count: 1,
    });

    expect(empty).toMatchObject({ data: null, error: null, count: 0 });
    expect(rows).toMatchObject({ data: [{ action_id: "action-1" }], error: null, count: 1 });
    expect(parseActionRows(rows.data, (value): value is { action_id: string } =>
      typeof value === "object" && value !== null && !Array.isArray(value) &&
      "action_id" in value && typeof value.action_id === "string",
    )).toEqual([{ action_id: "action-1" }]);
  });

  it("keeps only validated error metadata and normalizes an invalid count", () => {
    const result = parseActionSupabaseResult({
      data: null,
      error: {
        message: "business_error",
        code: 42,
        details: null,
        hint: { internal: true },
      },
      count: "1",
    });

    expect(result.error).toBeInstanceOf(ActionSupabaseError);
    expect(result.error).toMatchObject({ message: "business_error" });
    expect(result.error?.code).toBeUndefined();
    expect(result.error?.details).toBeUndefined();
    expect(result.error?.hint).toBeUndefined();
    expect(result.count).toBeNull();
  });

  it.each([
    null,
    undefined,
    {},
    [],
    "invalid",
  ])("normalizes a structurally invalid response: %j", (value) => {
    const result = parseActionSupabaseResult(value);

    expect(result.data).toBeNull();
    expect(result.count).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("La réponse Supabase est invalide.");
  });
});

describe("Action row parsers", () => {
  const isActionIdRow = (value: unknown): value is { action_id: string } =>
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    "action_id" in value && typeof value.action_id === "string";

  it("keeps empty row collections distinct from malformed collections", () => {
    expect(parseActionRows([], isActionIdRow)).toEqual([]);
    expect(parseActionRows([{ action_id: "action-1" }, { action_id: 4 }], isActionIdRow)).toBeNull();
    expect(parseActionRows({ action_id: "action-1" }, isActionIdRow)).toBeNull();
  });

  it("accepts a single row or the first row of a singleton array", () => {
    expect(parseActionSingleRow({ action_id: "action-1" }, isActionIdRow)).toEqual({ action_id: "action-1" });
    expect(parseActionSingleRow([{ action_id: "action-1" }], isActionIdRow)).toEqual({ action_id: "action-1" });
    expect(parseActionSingleRow([], isActionIdRow)).toBeNull();
    expect(parseActionSingleRow([{ action_id: 4 }], isActionIdRow)).toBeNull();
  });
});
