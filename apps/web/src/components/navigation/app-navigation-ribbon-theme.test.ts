// @vitest-environment jsdom

import React, { useEffect, useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRibbonChrome,
  compositeColors,
  mixColors,
  parseCssColor,
  relativeLuminance,
  useAdaptiveRibbonChrome,
} from "./app-navigation-ribbon-theme";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("app-navigation-ribbon-theme", () => {
  beforeEach(() => {
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => []),
    });
  });

  it("parses common CSS color formats", () => {
    expect(parseCssColor("#0f172a")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("#0f172a80")).toEqual({ r: 15, g: 23, b: 42, a: 128 / 255 });
    expect(parseCssColor("rgb(15, 23, 42)")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("rgba(255, 255, 255, 0.5)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 0.5,
    });
    expect(parseCssColor("rgb(15, 23)")).toBeNull();
    expect(parseCssColor("#12345")).toBeNull();
  });

  it("composites translucent colors over a backdrop", () => {
    expect(
      compositeColors(
        { r: 255, g: 255, b: 255, a: 0.5 },
        { r: 0, g: 0, b: 0, a: 1 },
      ),
    ).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it("mixes two colors by weight", () => {
    expect(
      mixColors(
        { r: 255, g: 255, b: 255 },
        { r: 0, g: 0, b: 0 },
        0.25,
      ),
    ).toEqual({ r: 64, g: 64, b: 64, a: 1 });
  });

  it("keeps the ribbon light on bright surfaces and still tinted on dark ones", () => {
    const lightChrome = buildRibbonChrome({
      r: 246,
      g: 248,
      b: 252,
      a: 1,
    });
    const darkChrome = buildRibbonChrome({
      r: 8,
      g: 15,
      b: 32,
      a: 1,
    });

    expect(lightChrome.backgroundImage).not.toBe(darkChrome.backgroundImage);
    expect(
      relativeLuminance(
        parseCssColor(lightChrome.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 1 },
      ),
    ).toBeGreaterThan(
      relativeLuminance(
        parseCssColor(darkChrome.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 1 },
      ),
    );
    expect(relativeLuminance({ r: 246, g: 248, b: 252 })).toBeGreaterThan(
      relativeLuminance({ r: 8, g: 15, b: 32 }),
    );
  });

  it("schedules backdrop sampling once per frame and cancels pending work on cleanup", () => {
    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    });
    const cancelAnimationFrame = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    function Probe({ dependencyKey }: { dependencyKey: string }) {
      const ribbonRef = useRef<HTMLElement>(null);
      const chrome = useAdaptiveRibbonChrome(ribbonRef, dependencyKey);
      useEffect(() => undefined, [chrome]);
      return React.createElement("div", { ref: ribbonRef });
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(React.createElement(Probe, { dependencyKey: "map" }), {
        createNodeMock: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 40, width: 100, height: 20 }),
          contains: () => false,
          parentElement: null,
        }),
      });
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      const id = [...frames.keys()][0];
      if (id !== undefined) {
        frames.get(id)?.(0);
        frames.delete(id);
      }
    });
    act(() => {
      renderer.update(React.createElement(Probe, { dependencyKey: "route" }));
    });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    act(() => {
      renderer.unmount();
    });
    expect(cancelAnimationFrame).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
