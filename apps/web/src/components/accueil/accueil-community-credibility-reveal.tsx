"use client";

import type { RefObject } from "react";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type HomeCommunityCredibilityRevealProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

export function HomeCommunityCredibilityReveal({
  sectionRef,
}: HomeCommunityCredibilityRevealProps) {
  useGsapReveal(sectionRef, {
    selector: "[data-gsap-reveal]",
    start: "top 78%",
    stagger: 0.06,
    duration: 0.65,
    y: 20,
  });

  return null;
}
