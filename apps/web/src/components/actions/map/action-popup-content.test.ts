import { describe, expect, it } from "vitest";
import { buildActionUpdateHref } from "./action-popup-content.utils";

describe("buildActionUpdateHref", () => {
  it("returns the action creation url when coordinates are valid", () => {
    expect(buildActionUpdateHref(42, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/actions/new?lat=48.8566&lng=2.3522",
    );
  });

  it("adds clean-place mode for non-positive scores", () => {
    expect(buildActionUpdateHref(0, { latitude: 48.8566, longitude: 2.3522 })).toBe(
      "/actions/new?lat=48.8566&lng=2.3522&mode=propre",
    );
  });

  it("returns null when coordinates are missing", () => {
    expect(buildActionUpdateHref(18, { latitude: null, longitude: 2.3522 })).toBeNull();
    expect(buildActionUpdateHref(18, { latitude: 48.8566, longitude: null })).toBeNull();
  });
});
