import { describe, expect, it } from "vitest";
import { shouldRequireAccountSetup } from "@/lib/auth/account-setup";

describe("shouldRequireAccountSetup", () => {
  it("requires setup for a recent account without completion flag", () => {
    const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, false)).toBe(true);
  });

  it("does not require setup once completion is flagged", () => {
    const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, true)).toBe(false);
  });

  it("does not require setup for an older account without completion flag", () => {
    const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, false)).toBe(false);
  });
});
