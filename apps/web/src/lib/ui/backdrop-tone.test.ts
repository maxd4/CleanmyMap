import { describe, expect, it } from "vitest";
import {
  BACKDROP_TONES,
  BACKDROP_WHITE_MIX_CEILING,
  resolveBackdropToneKey,
} from "@/lib/ui/backdrop-tone";

describe("backdrop tone resolution", () => {
  it("resolves the impact reports route to the red backdrop tone", () => {
    expect(resolveBackdropToneKey("/reports")).toBe("red");
  });

  it("returns null when no pathname is available", () => {
    expect(resolveBackdropToneKey(null)).toBeNull();
  });

  it("keeps the canvas baseline and white mix ceiling stable", () => {
    expect(BACKDROP_WHITE_MIX_CEILING).toBe(0.34);
    expect(BACKDROP_TONES.home.canvas).toBe("#e6f8ef");
  });
});
