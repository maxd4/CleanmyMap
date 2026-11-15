import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const canRequestGeolocationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/browser/geolocation", () => ({
  canRequestGeolocation: canRequestGeolocationMock,
}));

import { shouldRequestWeatherGeolocation } from "./weather-warning-bar";

const weatherSource = readFileSync(new URL("./weather-warning-bar.tsx", import.meta.url), "utf8");

describe("WeatherWarningBar geolocation policy", () => {
  it("never checks or requests geolocation when the surface disables it", () => {
    expect(shouldRequestWeatherGeolocation(false)).toBe(false);
    expect(canRequestGeolocationMock).not.toHaveBeenCalled();
  });

  it("keeps the existing weather geolocation behavior enabled elsewhere", () => {
    canRequestGeolocationMock.mockReturnValueOnce(true);

    expect(shouldRequestWeatherGeolocation(true)).toBe(true);
    expect(canRequestGeolocationMock).toHaveBeenCalledOnce();
  });

  it("keeps the warning below the header and dropdown overlay planes", () => {
    expect(weatherSource).toContain("relative z-30");
    expect(weatherSource).not.toContain("z-[60]");
  });
});
