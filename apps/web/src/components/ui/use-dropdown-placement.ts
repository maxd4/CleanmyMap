"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type DropdownPlacement = {
  openUp: boolean;
  alignRight: boolean;
};

type UseDropdownPlacementOptions = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  minPanelWidth?: number;
  verticalGap?: number;
};

export function useDropdownPlacement({
  isOpen,
  triggerRef,
  minPanelWidth = 320,
  verticalGap = 12,
}: UseDropdownPlacementOptions): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({
    openUp: false,
    alignRight: false,
  });

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const spaceAbove = rect.top - verticalGap;
    const spaceBelow = window.innerHeight - rect.bottom - verticalGap;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const alignRight = rect.right + minPanelWidth > window.innerWidth - 16;

    setPlacement({
      openUp,
      alignRight,
    });
  }, [minPanelWidth, triggerRef, verticalGap]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();

    const onResize = () => updatePlacement();
    const onScroll = () => updatePlacement();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, updatePlacement]);

  return placement;
}
