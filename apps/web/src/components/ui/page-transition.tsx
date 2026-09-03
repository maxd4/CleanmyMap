"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useSitePreferences } from "./site-preferences-provider";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { displayMode } = useSitePreferences();
  const isStatic = shouldReduceMotion || displayMode === "sobre";
  const isMinimal = displayMode === "minimaliste" && !shouldReduceMotion;

  const animate = isStatic || isMinimal
    ? { opacity: 1 }
    : { opacity: 1, y: 0, filter: "blur(0px)" };
  const exit = isStatic || isMinimal
    ? { opacity: 0 }
    : { opacity: 0, y: -10, filter: "blur(10px)" };
  const transition: Transition = isStatic
    ? { duration: 0 }
    : isMinimal
      ? { duration: 0.2, ease: "easeOut" }
      : {
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1] as const,
        };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={false}
        animate={animate}
        exit={exit}
        transition={transition}
        className="w-full flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
