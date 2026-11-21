import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeActionAccessibilityNeeds } from "./accessibility-support";

describe("action accessibility support contract", () => {
  it("deduplicates only allowlisted functional needs", () => {
    expect(normalizeActionAccessibilityNeeds(["rest_breaks", "rest_breaks", "human_support"]))
      .toEqual(["rest_breaks", "human_support"]);
  });

  it.each([
    null,
    "rest_breaks",
    [],
    ["medical_diagnosis"],
    ["rest_breaks", "medical_diagnosis"],
  ])("rejects malformed, empty or non-functional needs: %j", (value) => {
    expect(normalizeActionAccessibilityNeeds(value)).toBeNull();
  });
});
