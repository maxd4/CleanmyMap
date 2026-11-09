"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type DropdownPlacement = {
  openUp: boolean;
  triggerRect: Pick<DOMRect, "top" | "bottom" | "left" | "width"> | null;
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  panelHeight: number;
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
    panelWidth: 0,
    panelHeight: 0,
  });

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const panelHeight = panelRect?.height ?? 0;
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
      panelWidth: panelRect?.width ?? 0,
      panelHeight,
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
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePlacement);
    if (resizeObserver && panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }

    const onResize = () => updatePlacement();
    const onScroll = () => updatePlacement();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      active = false;
      window.clearTimeout(settleTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isOpen, panelRef, updatePlacement]);

  return placement;
}
