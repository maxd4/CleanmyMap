import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(),
  weather: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null }),
}));
vi.mock("next/navigation", () => ({
  usePathname: mocks.pathname,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ displayMode: "sobre" }),
}));
vi.mock("@/components/ui/weather-warning-bar", () => ({
  WeatherWarningBar: (props: { autoGeolocation?: boolean }) => {
    mocks.weather(props);
    return null;
  },
}));

import { AppShellSurface } from "./app-shell-surface";

describe("AppShellSurface route weather geolocation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables weather auto-geolocation only on the canonical route", () => {
    mocks.pathname.mockReturnValue("/sections/route");

    renderToStaticMarkup(
      <AppShellSurface>
        <span>route</span>
      </AppShellSurface>,
    );

    expect(mocks.weather).toHaveBeenCalledWith({ autoGeolocation: false });
  });

  it("keeps weather auto-geolocation enabled on other surfaces", () => {
    mocks.pathname.mockReturnValue("/dashboard");

    renderToStaticMarkup(
      <AppShellSurface>
        <span>dashboard</span>
      </AppShellSurface>,
    );

    expect(mocks.weather).toHaveBeenCalledWith({ autoGeolocation: true });
  });
});
