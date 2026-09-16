import { describe, expect, it } from "vitest";
import { usesRegistrationStore } from "./action-phase";

describe("usesRegistrationStore", () => {
  it.each([
    ["pre_action", true],
    ["post_action_draft", true],
    ["post_action_complete", false],
  ] as const)("maps %s to the canonical participation store boundary", (phase, expected) => {
    expect(usesRegistrationStore(phase)).toBe(expected);
  });
});
