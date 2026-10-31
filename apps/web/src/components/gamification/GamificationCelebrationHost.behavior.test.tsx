import * as React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confettiMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("canvas-confetti", () => ({ default: confettiMock }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: { div: (props: Record<string, unknown>) => React.createElement("div", props) },
}));

import { dispatchGamificationCelebration, GAMIFICATION_CELEBRATION_EVENT } from "@/lib/gamification/celebration";
import { rendererText } from "@/__tests__/support/action-behavior-test-helpers";
import { GamificationCelebrationHost } from "./GamificationCelebrationHost";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function installWindow() {
  const target = new EventTarget();
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const fakeWindow = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    matchMedia: () => ({ matches: false }),
    setTimeout: (callback: () => void) => {
      const id = nextTimer++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  vi.stubGlobal("window", fakeWindow);
  return {
    expireAll: () => {
      for (const callback of timers.values()) callback();
      timers.clear();
    },
  };
}

describe("GamificationCelebrationHost behavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  beforeEach(() => {
    confettiMock.mockClear();
  });

  it("deduplicates repeated announcements, allows explicit close and expires the terminal toast", () => {
    const timers = installWindow();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<GamificationCelebrationHost />); });

    act(() => {
      dispatchGamificationCelebration({
        title: "Palier atteint",
        message: "Première contribution confirmée",
        tone: "actions",
        dedupeKey: "award:action-1",
        durationMs: 5000,
      });
    });
    expect(renderer.root.findByProps({ "data-motion-role": "transient" })).toBeTruthy();
    expect(rendererText(renderer)).toContain("Première contribution confirmée");
    expect(confettiMock).toHaveBeenCalledTimes(2);

    act(() => {
      dispatchGamificationCelebration({
        title: "Doublon",
        message: "Cet effet ne doit pas se répéter",
        dedupeKey: "award:action-1",
      });
    });
    expect(rendererText(renderer)).toContain("Première contribution confirmée");
    expect(rendererText(renderer)).not.toContain("Cet effet ne doit pas se répéter");

    const close = renderer.root.findByProps({ "aria-label": "Fermer la notification de gamification" });
    act(() => { close.props.onClick(); });
    expect(renderer.toJSON()).toBeNull();

    act(() => {
      dispatchGamificationCelebration({ title: "Nouveau", message: "Notification terminale", confetti: false, sound: false });
    });
    expect(rendererText(renderer)).toContain("Notification terminale");
    act(() => { timers.expireAll(); });
    expect(renderer.toJSON()).toBeNull();
    renderer.unmount();
  });

  it("removes its event listener on unmount", () => {
    installWindow();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<GamificationCelebrationHost />); });
    renderer.unmount();
    act(() => {
      window.dispatchEvent(new CustomEvent(GAMIFICATION_CELEBRATION_EVENT, {
        detail: { title: "Late", message: "Ignored", sound: false, confetti: false },
      }));
    });
    expect(renderer.toJSON()).toBeNull();
  });
});
