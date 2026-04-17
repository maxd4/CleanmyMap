import { describe, expect, it } from "vitest";
import { buildCommunityEventsQueryString } from "./http";

describe("buildCommunityEventsQueryString", () => {
  it("uses defaults when params are missing", () => {
    expect(buildCommunityEventsQueryString()).toBe("limit=120");
  });

  it("clamps values to safe bounds", () => {
    expect(buildCommunityEventsQueryString({ limit: 0 })).toBe("limit=1");
    expect(buildCommunityEventsQueryString({ limit: 9999 })).toBe("limit=300");
  });
});
