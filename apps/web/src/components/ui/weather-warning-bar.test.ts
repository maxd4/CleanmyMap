import { describe, expect, it, vi } from "vitest";

const canRequestGeolocationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/browser/geolocation", () => ({
  canRequestGeolocation: canRequestGeolocationMock,
}));

import { shouldRequestWeatherGeolocation } from "./weather-warning-bar";

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
});
