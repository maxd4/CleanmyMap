import { describe, expect, it } from "vitest";
import { buildMapActionsQueryString } from "./http";

describe("buildMapActionsQueryString", () => {
  it("defaults to approved status for map safety", () => {
    const query = buildMapActionsQueryString();
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("approved");
  });

  it("allows explicit all status", () => {
    const query = buildMapActionsQueryString({ status: "all" });
    const params = new URLSearchParams(query);
    expect(params.has("status")).toBe(false);
  });
});
