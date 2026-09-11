"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type DropdownPlacement = {
  openUp: boolean;
  triggerRect: Pick<DOMRect, "top" | "bottom" | "left" | "width"> | null;
  viewportHeight: number;
  layoutScale: number;
};

type UseDropdownPlacementOptions = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  verticalGap?: number;
};

export const DEFAULT_DROPDOWN_VERTICAL_GAP_PX = 12;

export function resolveDropdownOpenUp(
  rect: Pick<DOMRect, "top" | "bottom">,
  viewportHeight: number,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
): boolean {
  const spaceAbove = rect.top - verticalGap;
  const spaceBelow = viewportHeight - rect.bottom - verticalGap;
  return spaceBelow < 260 && spaceAbove > spaceBelow;
}
function resolveDropdownLayoutScale(element: HTMLElement): number {
  let scale = 1;
  let current: HTMLElement | null = element;
  while (current) {
    const zoom = Number.parseFloat(window.getComputedStyle(current).zoom);
    if (Number.isFinite(zoom) && zoom > 0) {
      scale *= zoom;
    }
    current = current.parentElement;
  }

  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function useDropdownPlacement({
  isOpen,
  triggerRef,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
}: UseDropdownPlacementOptions): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({
    openUp: false,
    triggerRect: null,
    viewportHeight: 0,
    layoutScale: 1,
  });

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const openUp = resolveDropdownOpenUp(rect, window.innerHeight, verticalGap);

    setPlacement({
      openUp,
      triggerRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      },
      viewportHeight: window.innerHeight,
      layoutScale: resolveDropdownLayoutScale(trigger),
    });
  }, [triggerRef, verticalGap]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) {
        updatePlacement();
      }
    });
    const settleTimer = window.setTimeout(updatePlacement, 600);

    const onResize = () => updatePlacement();
    const onScroll = () => updatePlacement();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      active = false;
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, updatePlacement]);

  return placement;
}
