import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveBrowserRouteOrigin } from "./route-geolocation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser route origin", () => {
  it("returns a browser origin when geolocation succeeds", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 48.861, longitude: 2.361 },
      } as GeolocationPosition);
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(resolveBrowserRouteOrigin()).resolves.toEqual({
      latitude: 48.861,
      longitude: 2.361,
      source: "browser",
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it("returns no origin when the user refuses geolocation", async () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: "denied" } as GeolocationPositionError);
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(resolveBrowserRouteOrigin()).resolves.toBeUndefined();
  });

  it("returns no origin when geolocation is unavailable or blocked by policy", async () => {
    vi.stubGlobal("navigator", {});
    await expect(resolveBrowserRouteOrigin()).resolves.toBeUndefined();

    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    vi.stubGlobal("document", {
      permissionsPolicy: { allowsFeature: () => false },
    });

    await expect(resolveBrowserRouteOrigin()).resolves.toBeUndefined();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
