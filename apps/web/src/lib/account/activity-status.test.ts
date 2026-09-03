import { describe, expect, it } from "vitest";
import { readActivityStatus, toggleActivityStatus } from "./activity-status";

describe("account activity status", () => {
  it("defaults to active when metadata is absent", () => {
    expect(readActivityStatus(undefined)).toBe("active");
    expect(readActivityStatus({})).toBe("active");
  });

  it("reads inactive from Clerk unsafe metadata", () => {
    expect(readActivityStatus({ activity_status: "inactive" })).toBe("inactive");
  });

  it("fails closed to active for unknown metadata values", () => {
    expect(readActivityStatus({ activity_status: "away" })).toBe("active");
  });

  it("toggles active and inactive", () => {
    expect(toggleActivityStatus("active")).toBe("inactive");
    expect(toggleActivityStatus("inactive")).toBe("active");
  });
});
