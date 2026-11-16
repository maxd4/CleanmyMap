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
    expect(parseCssColor(null)).toBeNull();
    expect(parseCssColor(undefined)).toBeNull();
    expect(parseCssColor(" transparent ")).toBeNull();
    expect(parseCssColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseCssColor("#abcd")).toEqual({ r: 170, g: 187, b: 204, a: 221 / 255 });
    expect(parseCssColor("#0f172a")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("#0f172a80")).toEqual({ r: 15, g: 23, b: 42, a: 128 / 255 });
    expect(parseCssColor("rgb(15, 23, 42)")).toEqual({ r: 15, g: 23, b: 42, a: 1 });
    expect(parseCssColor("rgba(255, 255, 255, 0.5)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 0.5,
    });
    expect(parseCssColor("rgb(10, 20, 30 / 0.25)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.25,
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
    expect(mixColors({ r: -20, g: 500, b: 10 }, { r: 260, g: -30, b: 30 }, -1)).toEqual({
      r: 255,
      g: 0,
      b: 30,
      a: 1,
    });
  });

  it("clamps alpha during compositing and exercises the luminance curve edges", () => {
    expect(compositeColors({ r: 255, g: 0, b: 0, a: 2 }, { r: 0, g: 0, b: 255, a: 0 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
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

  it("samples a painted backdrop and uses the canvas CSS fallback when no element is present", () => {
    const backdrop = document.createElement("div");
    backdrop.style.backgroundImage = "linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))";
    backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    document.body.appendChild(backdrop);
    document.documentElement.style.setProperty("--bg-canvas", "rgb(20, 30, 40)");
    const elementsFromPoint = vi.fn(() => [backdrop]);
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: elementsFromPoint,
    });

    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));

    function Probe() {
      const ribbonRef = useRef<HTMLElement>(null);
      useAdaptiveRibbonChrome(ribbonRef, "backdrop");
      return React.createElement("div", { ref: ribbonRef });
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(React.createElement(Probe), {
        createNodeMock: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 40, width: 100, height: 20 }),
          contains: () => false,
          parentElement: null,
        }),
      });
    });
    const firstFrame = [...frames.keys()][0];
    expect(firstFrame).toBeDefined();
    act(() => {
      if (firstFrame !== undefined) {
        frames.get(firstFrame)?.(0);
        frames.delete(firstFrame);
      }
    });
    expect(elementsFromPoint).toHaveBeenCalled();

    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => []),
    });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      const nextFrame = [...frames.keys()][0];
      if (nextFrame !== undefined) {
        frames.get(nextFrame)?.(0);
        frames.delete(nextFrame);
      }
    });
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas")).toBe(
      "rgb(20, 30, 40)",
    );
    act(() => renderer.unmount());
    backdrop.remove();
    document.documentElement.style.removeProperty("--bg-canvas");
    vi.unstubAllGlobals();
  });

  it("resolves opaque, translucent and inherited backdrop layers", () => {
    const inheritedParent = document.createElement("div");
    inheritedParent.style.backgroundColor = "rgb(20, 30, 40)";
    const inheritedChild = document.createElement("div");
    inheritedParent.appendChild(inheritedChild);

    const scenarios = [
      (() => {
        const element = document.createElement("div");
        element.style.backgroundColor = "rgb(10, 20, 30)";
        return element;
      })(),
      (() => {
        const element = document.createElement("div");
        element.style.backgroundImage = "linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))";
        return element;
      })(),
      (() => {
        const element = document.createElement("div");
        element.style.backgroundImage = "linear-gradient(rgba(255, 0, 0, 0.5), rgba(0, 0, 255, 0.5))";
        return element;
      })(),
      (() => {
        const element = document.createElement("div");
        element.style.backgroundImage = "linear-gradient(rgba(255, 0, 0, 0.5), rgba(0, 0, 255, 0.5))";
        element.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        return element;
      })(),
      (() => {
        const element = document.createElement("div");
        element.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        return element;
      })(),
      (() => {
        const element = document.createElement("div");
        element.style.backgroundColor = "rgba(0, 0, 0, 0)";
        return element;
      })(),
      inheritedChild,
    ];
    document.body.appendChild(inheritedParent);
    scenarios.forEach((element) => {
      if (!element.parentElement) {
        document.body.appendChild(element);
      }
    });

    let scenarioIndex = 0;
    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => [document.createTextNode("ignored"), scenarios[scenarioIndex]]),
    });

    function Probe() {
      const ribbonRef = useRef<HTMLElement>(null);
      useAdaptiveRibbonChrome(ribbonRef, "layers");
      return React.createElement("div", { ref: ribbonRef });
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(React.createElement(Probe), {
        createNodeMock: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 40, width: 100, height: 20 }),
          contains: () => false,
          parentElement: null,
        }),
      });
    });

    for (scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex += 1) {
      act(() => {
        window.dispatchEvent(new Event("scroll"));
        const frameId = [...frames.keys()][0];
        if (frameId !== undefined) {
          frames.get(frameId)?.(0);
          frames.delete(frameId);
        }
      });
    }

    expect(document.elementsFromPoint).toHaveBeenCalled();
    act(() => renderer.unmount());
    scenarios.forEach((element) => element.remove());
    inheritedParent.remove();
    vi.unstubAllGlobals();
  });

  it("falls back to the canvas color for a zero-sized ribbon", () => {
    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => []),
    });

    function Probe() {
      const ribbonRef = useRef<HTMLElement>(null);
      useAdaptiveRibbonChrome(ribbonRef, "zero");
      return React.createElement("div", { ref: ribbonRef });
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(React.createElement(Probe), {
        createNodeMock: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 0, width: 0, height: 0 }),
          contains: () => false,
          parentElement: null,
        }),
      });
    });
    const frameId = [...frames.keys()][0];
    act(() => {
      if (frameId !== undefined) {
        frames.get(frameId)?.(0);
        frames.delete(frameId);
      }
    });
    expect(frames.size).toBe(0);
    act(() => renderer.unmount());
    vi.unstubAllGlobals();
  });
});
