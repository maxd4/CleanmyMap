// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/methodologie" as string | null,
  dynamicLoaders: [] as Promise<unknown>[],
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/ui/network-toast", () => ({
  NetworkToastHost: () => <div data-loaded-module="network-toast" />,
}));
vi.mock("@/components/gamification/GamificationCelebrationHost", () => ({
  GamificationCelebrationHost: () => <div data-loaded-module="gamification" />,
}));
vi.mock("@/components/ui/vibrant-background-no-ssr", () => ({
  VibrantBackgroundNoSSR: () => <div data-loaded-module="background" />,
}));
vi.mock("@/components/ui/site-tooltips", () => ({
  SiteTooltips: () => <div data-loaded-module="tooltips" />,
}));
vi.mock("@/components/ui/conditional-analytics", () => ({
  ConditionalAnalytics: () => <div data-loaded-module="analytics" />,
}));
vi.mock("@/components/ui/cookie-consent-banner", () => ({
  CookieConsentBanner: () => <div data-loaded-module="cookies" />,
}));

vi.mock("next/dynamic", () => {
  let componentIndex = 0;
  return {
    default: (
      loader: () => Promise<unknown>,
      options?: { loading?: () => React.ReactNode },
    ) => {
      options?.loading?.();
      const pendingLoader = loader();
      mocks.dynamicLoaders.push(pendingLoader);
      void pendingLoader.catch(() => undefined);
      componentIndex += 1;
      const name = `deferred-${componentIndex}`;
      return function MockDeferredComponent() {
        return <div data-deferred-component={name} />;
      };
    },
  };
});

import {
  DeferredGlobalChrome,
  isAuthSurfacePath,
  shouldLoadDeferredChrome,
} from "./deferred-global-chrome";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(async () => {
  await Promise.all(mocks.dynamicLoaders);
});

describe("DeferredGlobalChrome behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.pathname = "/methodologie";
    Reflect.deleteProperty(window, "requestIdleCallback");
    Reflect.deleteProperty(window, "cancelIdleCallback");
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function render() {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<DeferredGlobalChrome />);
    });
  }

  it("classifies auth surfaces and keeps public chrome immediately available", () => {
    expect(isAuthSurfacePath("/sign-in")).toBe(true);
    expect(isAuthSurfacePath("/sign-up/verify")).toBe(true);
    expect(isAuthSurfacePath("/onboarding")).toBe(false);
    expect(isAuthSurfacePath(null)).toBe(false);
    expect(shouldLoadDeferredChrome("/sign-in", false)).toBe(false);
    expect(shouldLoadDeferredChrome("/sign-in", true)).toBe(true);
    expect(shouldLoadDeferredChrome("/methodologie", false)).toBe(true);

    mocks.pathname = "/methodologie";
    render();

    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(6);
  });

  it("loads auth chrome after requestIdleCallback and cancels the scheduled callback", () => {
    let idleCallback: (() => void) | undefined;
    const cancelIdleCallback = vi.fn();
    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: (callback: () => void) => {
        idleCallback = callback;
        return 42;
      },
    });
    Object.defineProperty(window, "cancelIdleCallback", {
      configurable: true,
      value: cancelIdleCallback,
    });
    mocks.pathname = "/sign-in";

    render();
    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(1);
    expect(idleCallback).toBeDefined();

    act(() => {
      idleCallback?.();
    });
    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(6);

    act(() => root.unmount());
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });

  it("falls back to a timeout when requestIdleCallback is unavailable", () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(window, "requestIdleCallback");
    mocks.pathname = "/sign-up";

    render();
    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(6);
  });

  it("does not schedule auth idle work after leaving the auth route before mounting", () => {
    mocks.pathname = "/sign-in";
    render();

    act(() => {
      mocks.pathname = "/methodologie";
      root.render(<DeferredGlobalChrome />);
    });

    expect(host.querySelectorAll("[data-deferred-component]")).toHaveLength(6);
  });
});
