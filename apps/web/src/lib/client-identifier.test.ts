import { describe, expect, it } from "vitest";
import { createClientIdentifier } from "./client-identifier";

describe("createClientIdentifier", () => {
  it("uses the requested prefix and produces distinct identifiers", () => {
    const first = createClientIdentifier("test");
    const second = createClientIdentifier("test");

    expect(first).toMatch(/^test-/);
    expect(second).toMatch(/^test-/);
    expect(second).not.toBe(first);
  });

  it("supports callers whose secure identifier had no prefix", () => {
    const value = createClientIdentifier();

    expect(value).toMatch(/^[0-9a-f-]+$/i);
    expect(value).not.toMatch(/^-/);
  });
});
