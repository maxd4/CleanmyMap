"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type DropdownPlacement = {
  openUp: boolean;
  triggerRect: Pick<DOMRect, "top" | "bottom" | "left" | "width"> | null;
  viewportWidth: number;
  viewportHeight: number;
  layoutScale: number;
};

type UseDropdownPlacementOptions = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  verticalGap?: number;
};

export const DEFAULT_DROPDOWN_VERTICAL_GAP_PX = 12;
export const DEFAULT_DROPDOWN_PANEL_HEIGHT_PX = 260;

export function resolveDropdownOpenUp(
  rect: Pick<DOMRect, "top" | "bottom">,
  viewportHeight: number,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
  panelHeight = DEFAULT_DROPDOWN_PANEL_HEIGHT_PX,
): boolean {
  const spaceAbove = rect.top - verticalGap;
  const spaceBelow = viewportHeight - rect.bottom - verticalGap;
  const requiredHeight = panelHeight > 0 ? panelHeight : DEFAULT_DROPDOWN_PANEL_HEIGHT_PX;
  if (spaceBelow >= requiredHeight) {
    return false;
  }
  if (spaceAbove >= requiredHeight) {
    return true;
  }
  return spaceAbove > spaceBelow;
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
  panelRef,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
}: UseDropdownPlacementOptions): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({
    openUp: false,
    triggerRect: null,
    viewportWidth: 0,
    viewportHeight: 0,
    layoutScale: 1,
  });

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
    const openUp = resolveDropdownOpenUp(rect, window.innerHeight, verticalGap, panelHeight);

    setPlacement({
      openUp,
      triggerRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      layoutScale: resolveDropdownLayoutScale(trigger),
    });
  }, [panelRef, triggerRef, verticalGap]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();
    let active = true;
    if (document.fonts) {
      void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ document.fonts.ready.then(() => {
        if (active) {
          updatePlacement();
        }
      }, () => undefined);
    }
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
