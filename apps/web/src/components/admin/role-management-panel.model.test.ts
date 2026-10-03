import { describe, expect, it } from "vitest";
import {
  validateRoleChangeReason,
} from "./role-management-panel.model";

describe("validateRoleChangeReason", () => {
  it("requires a non-blank reason", () => {
    expect(validateRoleChangeReason("   ")).toBe("required");
  });

  it("enforces the API minimum and maximum", () => {
    expect(validateRoleChangeReason("court")).toBeNull();
    expect(validateRoleChangeReason("non")).toBe("too_short");
    expect(validateRoleChangeReason("x".repeat(501))).toBe("too_long");
  });
});
