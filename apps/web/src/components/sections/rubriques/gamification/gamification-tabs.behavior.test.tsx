import { act, create, type ReactTestInstance } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GamificationSummary } from "@/lib/gamification/progression/gamification-summary";
import { GamificationTabs } from "./gamification-tabs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const summary = {
  progressions: [
    { id: "participation", state: "in_progress" },
    { id: "exploration", state: "not_started" },
  ],
  milestones: [{ id: "parcours_documente", state: "completed" }],
} as GamificationSummary;

describe("GamificationTabs interactive & deferred deep-link behavior", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.assign(globalThis, {
      window: originalWindow,
      document: originalDocument,
      MutationObserver: originalMutationObserver,
    });
  });

  it("navigates across all 5 tabs via clicks and keyboard (ArrowRight/ArrowLeft/Home/End)", () => {
    const focusSpy = vi.fn();
    const fakeDoc = {
      getElementById: (id: string) => ({ id, focus: focusSpy }),
    };
    const fakeWin = {
      location: { hash: "", pathname: "/sections/gamification", search: "" },
      history: { state: null, replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number,
      cancelAnimationFrame: (id: number) => clearTimeout(id),
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    Object.assign(globalThis, { window: fakeWin, document: fakeDoc });

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GamificationTabs
          locale="fr"
          summary={summary}
          receiptId={null}
          renderPanel={(tab) => <div data-panel={tab}>{tab}</div>}
        />,
      );
    });

    const tabs = (): ReactTestInstance[] => renderer.root.findAllByProps({ role: "tab" });
    expect(tabs()).toHaveLength(5);
    expect(renderer.root.findByProps({ "data-panel": "acquired" })).toBeTruthy();

    for (const [index, expected] of [
      [1, "active"],
      [2, "discover"],
      [3, "community"],
      [4, "badges"],
      [0, "acquired"],
    ] as const) {
      act(() => {
        (tabs()[index].props.onClick as () => void)();
      });
      expect(renderer.root.findByProps({ "data-panel": expected })).toBeTruthy();
    }

    const preventDefault = vi.fn();
    act(() => {
      (tabs()[0].props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void)({
        key: "ArrowRight",
        preventDefault,
      });
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(renderer.root.findByProps({ "data-panel": "active" })).toBeTruthy();

    act(() => {
      (tabs()[1].props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void)({
        key: "End",
        preventDefault,
      });
    });
    expect(renderer.root.findByProps({ "data-panel": "badges" })).toBeTruthy();

    act(() => {
      (tabs()[4].props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void)({
        key: "Home",
        preventDefault,
      });
    });
    expect(renderer.root.findByProps({ "data-panel": "acquired" })).toBeTruthy();

    act(() => {
      (tabs()[0].props.onKeyDown as (e: { key: string; preventDefault: () => void }) => void)({
        key: "ArrowLeft",
        preventDefault,
      });
    });
    expect(renderer.root.findByProps({ "data-panel": "badges" })).toBeTruthy();
    act(() => {
      renderer.unmount();
    });
  });

  it("waits for deferred #spogomi-collection mount via MutationObserver and respects prefers-reduced-motion", () => {
    let targetMounted = false;
    let observerCallback: (() => void) | null = null;
    const disconnectSpy = vi.fn();
    const scrollIntoViewSpy = vi.fn();
    const focusSpy = vi.fn();
    const classList = { add: vi.fn(), remove: vi.fn() };

    class FakeMutationObserver {
      constructor(cb: () => void) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {
        disconnectSpy();
      }
    }

    const fakeDoc = {
      body: {},
      getElementById: (id: string) => {
        if (id === "gamification-panel-badges") return {};
        if (id === "spogomi-collection" && targetMounted) {
          return {
            id,
            scrollIntoView: scrollIntoViewSpy,
            focus: focusSpy,
            classList,
          };
        }
        return null;
      },
    };
    const fakeWin = {
      location: { hash: "#spogomi-collection", pathname: "/sections/gamification", search: "" },
      history: { state: null, replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: (q: string) => ({ matches: q === "(prefers-reduced-motion: reduce)" }),
      requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number,
      cancelAnimationFrame: (id: number) => clearTimeout(id),
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    Object.assign(globalThis, {
      window: fakeWin,
      document: fakeDoc,
      MutationObserver: FakeMutationObserver,
    });

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GamificationTabs
          locale="fr"
          summary={summary}
          receiptId={null}
          renderPanel={(tab) => <div data-panel={tab}>{tab}</div>}
        />,
      );
    });

    expect(renderer.root.findByProps({ "data-panel": "badges" })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    targetMounted = true;
    act(() => {
      observerCallback?.();
      vi.advanceTimersByTime(16);
    });

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(disconnectSpy).toHaveBeenCalled();
    act(() => {
      renderer.unmount();
    });
  });
});
