import { describe, expect, it } from "vitest";
import { ActionSupabaseError, parseActionRows, parseActionSupabaseResult } from "./query";

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
});
