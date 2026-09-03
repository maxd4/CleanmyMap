import { describe, expect, it } from "vitest";
import {
  getSectionClerkAccessMode,
  getAppRouteClerkAccessMode,
} from "./clerk-access";

describe("community Clerk access contract", () => {
  it("keeps the community section visible without requiring authentication", () => {
    expect(getSectionClerkAccessMode("community")).toBe("visible");
    expect(getAppRouteClerkAccessMode("/sections/community")).toBe("visible");
  });
});
