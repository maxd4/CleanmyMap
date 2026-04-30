import { describe, expect, it } from "vitest";
import { getProfileLabel, normalizeProfileRole, resolveProfile } from "./profiles";

describe("profile aliases", () => {
  it("keeps IMU as the displayed label for the top profile", () => {
    expect(getProfileLabel("max", "fr")).toBe("IMU");
    expect(getProfileLabel("max", "en")).toBe("IMU");
  });

  it("maps IMU metadata back to the internal top profile", () => {
    expect(normalizeProfileRole("IMU")).toBe("max");
    expect(
      resolveProfile({
        metadataRole: "imu",
        isAdmin: false,
        isMax: false,
      }),
    ).toBe("max");
  });
});
