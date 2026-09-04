"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type DropdownPlacement = {
  openUp: boolean;
  triggerRect: Pick<DOMRect, "top" | "bottom"> | null;
};

type UseDropdownPlacementOptions = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  verticalGap?: number;
};

export function useDropdownPlacement({
  isOpen,
  triggerRef,
  verticalGap = 12,
}: UseDropdownPlacementOptions): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({
    openUp: false,
    triggerRect: null,
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

    setPlacement({
      openUp,
      triggerRect: {
        top: rect.top,
        bottom: rect.bottom,
      },
    });
  }, [triggerRef, verticalGap]);

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
