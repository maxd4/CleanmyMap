"use client";

import { useEffect, useRef, useState } from "react";
import type { BadgeFamily } from "./utils";

type Milestone = {
  level: number;
  title: string;
  icon: string;
  rank: string;
  family?: BadgeFamily;
};

export function shouldEmitMilestone(previousLevel: number | null, level: number) {
  return previousLevel !== null && level > previousLevel;
}

export function useInfiniteBadgeController(
  level: number,
  title: string,
  icon: string,
  rank: string,
  family: BadgeFamily | undefined,
  onMilestoneReached?: (payload: Milestone) => void,
) {
  const [isOpen, setIsOpen] = useState(false);
  const previousLevelRef = useRef<number | null>(null);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = level;

    if (shouldEmitMilestone(previousLevel, level)) {
      onMilestoneReached?.({ level, title, icon, rank, family });
    }
  }, [family, icon, level, onMilestoneReached, rank, title]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
