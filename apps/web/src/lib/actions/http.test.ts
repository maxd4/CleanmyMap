import { describe, expect, it } from "vitest";
import { buildActionsQueryString, buildMapActionsQueryString } from "./http";

describe("buildActionsQueryString", () => {
  it("uses defaults when params are missing", () => {
    expect(buildActionsQueryString()).toBe("limit=30");
  });

  it("clamps limit and serializes status", () => {
    expect(buildActionsQueryString({ status: "approved", limit: 999 })).toBe("limit=200&status=approved");
    expect(buildActionsQueryString({ status: "pending", limit: 0 })).toBe("limit=1&status=pending");
  });

  it("skips status when all is selected", () => {
    expect(buildActionsQueryString({ status: "all", limit: 20 })).toBe("limit=20");
  });
});

describe("buildMapActionsQueryString", () => {
  it("uses defaults when params are missing", () => {
    expect(buildMapActionsQueryString()).toBe("limit=80&days=30");
  });

  it("clamps values to safe bounds", () => {
    expect(buildMapActionsQueryString({ limit: 9999, days: 9999 })).toBe("limit=300&days=3650");
    expect(buildMapActionsQueryString({ limit: 0, days: 0 })).toBe("limit=1&days=1");
  });

  it("adds status when provided", () => {
    expect(buildMapActionsQueryString({ status: "rejected", limit: 55, days: 7 })).toBe(
      "limit=55&days=7&status=rejected",
    );
  });
});
