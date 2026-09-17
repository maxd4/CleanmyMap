"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { useEffect } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

gsap.registerPlugin(ScrollTrigger);

type UseGsapRevealOptions = {
  selector?: string;
  start?: string;
  end?: string;
  stagger?: number;
  duration?: number;
  y?: number;
  x?: number;
  delay?: number;
  ease?: string;
  once?: boolean;
};

const LAYOUT_REFRESH_DELAY_FRAMES = 2;
const REVEAL_FAILSAFE_DELAY_MS = 1800;
const MINIMAL_REVEAL_MAX_DURATION = 0.2;

function clearRevealStyles(targets: HTMLElement[]): void {
  for (const target of targets) {
    target.style.removeProperty("opacity");
    target.style.removeProperty("transform");
  }
}

export function useGsapReveal(
  scopeRef: RefObject<HTMLElement | null>,
  options: UseGsapRevealOptions = {},
) {
  const { displayMode } = useSitePreferences();
  const {
    selector = "[data-gsap-reveal]",
    start = "top 80%",
    end,
    stagger = 0.08,
    duration = 0.6,
    x,
    y,
    delay = 0,
    ease = "power3.out",
    once = true,
  } = options;

  const isMinimalDisplayMode = displayMode === "minimaliste";
  const isStaticDisplayMode = displayMode === "sobre";
  const revealDuration = isMinimalDisplayMode
    ? Math.min(Math.max(duration, 0), MINIMAL_REVEAL_MAX_DURATION)
    : duration;
  const revealDelay = isMinimalDisplayMode ? 0 : delay;
  const revealStagger = isMinimalDisplayMode ? 0 : stagger;
  const revealX = isMinimalDisplayMode ? undefined : x;
  const revealY = isMinimalDisplayMode ? undefined : y;

  useEffect(() => {
    const root = scopeRef.current;
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) {
      return;
    }

    // The public content is visible before GSAP owns it. This also clears a
    // stale inline state left by a previous mount before starting a new one.
    clearRevealStyles(targets);

    if (
      isStaticDisplayMode ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let ctx: gsap.Context | null = null;
    let disposed = false;
    let restoring = false;
    let refreshFrameId: number | null = null;
    let refreshFramesRemaining = LAYOUT_REFRESH_DELAY_FRAMES;
    let failsafeTimeoutId: number | null = null;

    const clearFailsafe = () => {
      if (failsafeTimeoutId !== null) {
        window.clearTimeout(failsafeTimeoutId);
        failsafeTimeoutId = null;
      }
    };

    const restoreVisible = () => {
      if (restoring) {
        clearRevealStyles(targets);
        return;
      }

      restoring = true;
      clearFailsafe();
      try {
        ctx?.revert();
      } finally {
        ctx = null;
        clearRevealStyles(targets);
        restoring = false;
      }
    };

    const finishVisible = () => {
      clearFailsafe();
      clearRevealStyles(targets);
    };

    const requestLayoutRefresh = () => {
      if (disposed) return;
      if (refreshFramesRemaining > 0) {
        refreshFramesRemaining -= 1;
        refreshFrameId = window.requestAnimationFrame(requestLayoutRefresh);
        return;
      }

      try {
        // A single post-hydration refresh lets ScrollTrigger measure the
        // final layout without introducing a permanent refresh loop.
        ScrollTrigger.refresh(true);
      } catch {
        restoreVisible();
      }
    };

    const frameId = window.requestAnimationFrame(() => {
      if (disposed) return;

      ctx = gsap.context(() => {
        try {
          gsap.fromTo(
            targets,
            {
              opacity: 0,
              ...(revealX === undefined ? {} : { x: revealX }),
              ...(revealY === undefined ? {} : { y: revealY }),
            },
            {
              opacity: 1,
              ...(revealX === undefined ? {} : { x: 0 }),
              ...(revealY === undefined ? {} : { y: 0 }),
              duration: revealDuration,
              delay: revealDelay,
              ease,
              stagger: revealStagger,
              clearProps: "opacity,transform",
              immediateRender: false,
              onComplete: finishVisible,
              onInterrupt: restoreVisible,
              scrollTrigger: {
                trigger: root,
                start,
                end,
                once,
              },
            },
          );
          refreshFrameId = window.requestAnimationFrame(requestLayoutRefresh);
          failsafeTimeoutId = window.setTimeout(() => {
            if (targets.some((target) => target.style.opacity === "0")) {
              restoreVisible();
            }
          }, REVEAL_FAILSAFE_DELAY_MS);
        } catch {
          restoreVisible();
        }
      }, root);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      if (refreshFrameId !== null) {
        window.cancelAnimationFrame(refreshFrameId);
      }
      restoreVisible();
    };
  }, [
    displayMode,
    ease,
    end,
    isStaticDisplayMode,
    once,
    revealDelay,
    revealDuration,
    revealStagger,
    revealX,
    revealY,
    scopeRef,
    selector,
    start,
  ]);
}
