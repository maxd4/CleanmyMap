import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeCleanup: undefined as (() => void) | undefined,
  displayMode: "exhaustif" as "exhaustif" | "minimaliste" | "sobre",
  fromTo: vi.fn(),
  context: vi.fn((callback: () => void) => {
    callback();
    return { revert: vi.fn() };
  }),
  registerPlugin: vi.fn(),
  set: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: (effect: () => (() => void) | undefined) => {
    mocks.activeCleanup = effect();
  },
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ displayMode: mocks.displayMode }),
}));

vi.mock("gsap", () => ({
  default: {
    context: mocks.context,
    fromTo: mocks.fromTo,
    registerPlugin: mocks.registerPlugin,
    set: mocks.set,
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { refresh: mocks.refresh },
}));

import { useGsapReveal } from "./use-gsap-reveal";

function makeTarget() {
  return {
    style: {
      opacity: "",
      removeProperty: vi.fn(function removeProperty(this: { opacity: string }, property: string) {
        if (property === "opacity") this.opacity = "";
      }),
    },
  } as unknown as HTMLElement;
}

function makeRoot(target?: HTMLElement) {
  return {
    querySelectorAll: vi.fn(() => (target ? [target] : [])),
  } as unknown as HTMLElement;
}

function installWindow({ reducedMotion = false, runTimeouts = false } = {}) {
  let nextFrameId = 0;
  vi.stubGlobal("window", {
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return ++nextFrameId;
    }),
    cancelAnimationFrame: vi.fn(),
    setTimeout: vi.fn((callback: TimerHandler) => {
      if (runTimeouts && typeof callback === "function") callback();
      return 1;
    }),
    clearTimeout: vi.fn(),
  });
}

function resetMocks() {
  vi.clearAllMocks();
  mocks.activeCleanup = undefined;
  mocks.displayMode = "exhaustif";
  mocks.fromTo.mockImplementation(() => undefined);
}

describe("useGsapReveal visibility contract", () => {
  it("keeps the public reveal content visible without GSAP initialization", () => {
    const baseCss = readFileSync(
      new URL("../../styles/base.css", import.meta.url),
      "utf8",
    );

    expect(baseCss).not.toMatch(
      /\[data-gsap-reveal\][^{]*\{[\s\S]*?opacity\s*:\s*0/,
    );
  });

  it("leaves content visible when reduced motion is requested", () => {
    resetMocks();
    installWindow({ reducedMotion: true });
    const target = makeTarget();
    target.style.opacity = "0";

    useGsapReveal(
      { current: makeRoot(target) },
      { x: 12, y: 20, stagger: 0.3, duration: 0.65, delay: 0.1, ease: "power2.out" },
    );

    expect(target.style.opacity).toBe("");
    expect(mocks.fromTo).not.toHaveBeenCalled();
  });

  it("keeps sobre mode static and never starts GSAP", () => {
    resetMocks();
    mocks.displayMode = "sobre";
    installWindow();
    const target = makeTarget();
    target.style.opacity = "0";

    useGsapReveal({ current: makeRoot(target) }, { x: 12, y: 20, stagger: 0.2 });

    expect(target.style.opacity).toBe("");
    expect(mocks.fromTo).not.toHaveBeenCalled();
  });

  it("does nothing when the reveal scope has no target", () => {
    resetMocks();
    installWindow();

    useGsapReveal({ current: makeRoot() });

    expect(mocks.fromTo).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("takes possession only through GSAP and animates x/y back to visible", () => {
    resetMocks();
    installWindow();
    const target = makeTarget();

    useGsapReveal(
      { current: makeRoot(target) },
      { x: 12, y: 20, stagger: 0.3, duration: 0.65, delay: 0.1, ease: "power2.out" },
    );

    expect(mocks.fromTo).toHaveBeenCalledTimes(1);
    const [targets, fromVars, toVars] = mocks.fromTo.mock.calls[0];
    expect(targets).toEqual([target]);
    expect(fromVars).toMatchObject({ opacity: 0, x: 12, y: 20 });
    expect(toVars).toMatchObject({
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.65,
      delay: 0.1,
      ease: "power2.out",
      stagger: 0.3,
      clearProps: "opacity,transform",
      immediateRender: false,
    });
    target.style.opacity = "0";
    toVars.onComplete();
    expect(target.style.opacity).toBe("");
    expect(mocks.refresh).toHaveBeenCalledWith(true);
  });

  it("keeps minimaliste motion short without displacement or decorative stagger", () => {
    resetMocks();
    mocks.displayMode = "minimaliste";
    installWindow();
    const target = makeTarget();

    useGsapReveal(
      { current: makeRoot(target) },
      { x: 120, y: 80, stagger: 0.4, duration: 0.65, delay: 0.3 },
    );

    const [, fromVars, toVars] = mocks.fromTo.mock.calls[0];
    expect(fromVars).toEqual({ opacity: 0 });
    expect(toVars).toMatchObject({
      opacity: 1,
      duration: 0.2,
      delay: 0,
      stagger: 0,
    });
    expect(toVars).not.toHaveProperty("x");
    expect(toVars).not.toHaveProperty("y");
  });

  it("restores visibility during cleanup and on remount", () => {
    resetMocks();
    installWindow();
    const target = makeTarget();
    const root = makeRoot(target);

    useGsapReveal({ current: root });
    target.style.opacity = "0";
    mocks.activeCleanup?.();

    expect(target.style.opacity).toBe("");
    expect(target.style.removeProperty).toHaveBeenCalledWith("transform");

    useGsapReveal({ current: root });
    expect(target.style.opacity).toBe("");
    expect(mocks.fromTo).toHaveBeenCalledTimes(2);
  });

  it("cleans the previous reveal before a display mode change", () => {
    resetMocks();
    installWindow();
    const target = makeTarget();
    const root = makeRoot(target);

    useGsapReveal({ current: root }, { x: 18, y: 18 });
    target.style.opacity = "0";
    mocks.activeCleanup?.();
    expect(target.style.opacity).toBe("");

    mocks.displayMode = "sobre";
    useGsapReveal({ current: root }, { x: 18, y: 18 });

    expect(target.style.opacity).toBe("");
    expect(mocks.fromTo).toHaveBeenCalledTimes(1);
  });

  it("fails open when GSAP initialization throws", () => {
    resetMocks();
    installWindow();
    const target = makeTarget();
    target.style.opacity = "0";
    mocks.fromTo.mockImplementationOnce(() => {
      throw new Error("ScrollTrigger unavailable");
    });

    useGsapReveal({ current: makeRoot(target) });

    expect(target.style.opacity).toBe("");
  });

  it("uses the failsafe when an animation leaves opacity at zero", () => {
    resetMocks();
    installWindow({ runTimeouts: true });
    const target = makeTarget();
    mocks.fromTo.mockImplementationOnce(() => {
      target.style.opacity = "0";
    });

    useGsapReveal({ current: makeRoot(target) });

    expect(target.style.opacity).not.toBe("0");
    expect(target.style.removeProperty).toHaveBeenCalledWith("opacity");
  });
});
