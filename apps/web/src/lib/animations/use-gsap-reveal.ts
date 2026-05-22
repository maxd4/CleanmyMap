"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { useEffect } from "react";

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

export function useGsapReveal(
  scopeRef: RefObject<HTMLElement | null>,
  options: UseGsapRevealOptions = {},
) {
  const {
    selector = "[data-gsap-reveal]",
    start = "top 80%",
    end,
    stagger = 0.08,
    duration = 0.6,
    delay = 0,
    ease = "power3.out",
    once = true,
  } = options;

  useEffect(() => {
    const root = scopeRef.current;
    if (!root) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) {
      return;
    }

    let ctx: gsap.Context | null = null;
    const frameId = window.requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        gsap.to(targets, {
          opacity: 1,
          duration,
          delay,
          ease,
          stagger,
          clearProps: "opacity",
          scrollTrigger: {
            trigger: root,
            start,
            end,
            once,
          },
        });
      }, root);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      ctx?.revert();
    };
  }, [delay, duration, ease, end, once, scopeRef, selector, stagger, start]);
}
