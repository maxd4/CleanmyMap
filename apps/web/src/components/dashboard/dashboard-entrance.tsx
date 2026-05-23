"use client";

import { useRef, type ReactNode } from "react";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type DashboardEntranceProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardEntrance({
  children,
  className,
}: DashboardEntranceProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(scopeRef, {
    selector: "[data-gsap-reveal]",
    start: "top 84%",
    stagger: 0.08,
    duration: 0.58,
    y: 18,
  });

  return (
    <div ref={scopeRef} className={className}>
      {children}
    </div>
  );
}
