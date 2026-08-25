import { describe, expect, it } from "vitest";
import { resolveSignalementCoordinate } from "./page";

describe("canonical Trash Spotter entry coordinates", () => {
  it("accepts valid map coordinates and ignores invalid values", () => {
    expect(resolveSignalementCoordinate("48.8566", -90, 90)).toBe(48.8566);
    expect(resolveSignalementCoordinate(["2.3522"], -180, 180)).toBe(2.3522);
    expect(resolveSignalementCoordinate("not-a-coordinate", -90, 90)).toBeNull();
    expect(resolveSignalementCoordinate("181", -180, 180)).toBeNull();
  });
});
