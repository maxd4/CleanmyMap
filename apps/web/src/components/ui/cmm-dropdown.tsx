"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
  useDropdownPlacement,
} from "./use-dropdown-placement";

export type CmmDropdownPanelRole = "menu" | "region";

export type CmmDropdownTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  type: "button";
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-haspopup"?: "menu" | "dialog";
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter: () => void;
};

type CmmDropdownProps = {
  id: string;
  ariaLabel: string;
  children: ReactNode;
  renderTrigger: (props: CmmDropdownTriggerProps) => ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelRole?: CmmDropdownPanelRole;
  triggerHasPopup?: "menu" | "dialog" | null;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  wrapperClassName?: string;
  verticalGap?: number;
  hoverCloseDelayMs?: number;
};

const DEFAULT_HOVER_CLOSE_DELAY_MS = 160;

export function CmmDropdown({
  id,
  ariaLabel,
  children,
  renderTrigger,
  open,
  defaultOpen = false,
  onOpenChange,
  panelRole = "menu",
  triggerHasPopup = "menu",
  panelClassName,
  panelStyle,
  wrapperClassName,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
  hoverCloseDelayMs = DEFAULT_HOVER_CLOSE_DELAY_MS,
}: CmmDropdownProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledOpen;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedMarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedRef = useRef(false);
  const clickToggleOpenRef = useRef<boolean | null>(null);
  const wasOpenRef = useRef(isOpen);
  const [canHover, setCanHover] = useState(false);
  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
    verticalGap,
  });

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }, []);

  const clearHoverOpenedMarker = useCallback(() => {
    if (hoverOpenedMarkerTimerRef.current) {
      clearTimeout(hoverOpenedMarkerTimerRef.current);
      hoverOpenedMarkerTimerRef.current = null;
    }
    hoverOpenedRef.current = false;
  }, []);

  const openFromHover = useCallback(() => {
    clearCloseTimer();
    clearHoverOpenTimer();
    clearHoverOpenedMarker();
    hoverOpenTimerRef.current = setTimeout(() => {
      setOpen(true);
      hoverOpenedRef.current = true;
      hoverOpenedMarkerTimerRef.current = setTimeout(() => {
        hoverOpenedRef.current = false;
        hoverOpenedMarkerTimerRef.current = null;
      }, hoverCloseDelayMs);
      hoverOpenTimerRef.current = null;
    }, 0);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, hoverCloseDelayMs, setOpen]);

  const closeFromHover = useCallback(() => {
    clearHoverOpenTimer();
    clearHoverOpenedMarker();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, hoverCloseDelayMs);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, hoverCloseDelayMs, setOpen]);

  const closeAndRestoreFocus = useCallback(() => {
    clearHoverOpenTimer();
    clearHoverOpenedMarker();
    clearCloseTimer();
    setOpen(false);
    triggerRef.current?.focus();
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, setOpen]);

  const toggle = useCallback(() => {
    clearHoverOpenTimer();
    clearHoverOpenedMarker();
    clearCloseTimer();
    const openBeforeClick = clickToggleOpenRef.current ?? isOpen;
    clickToggleOpenRef.current = null;
    setOpen(!openBeforeClick);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, isOpen, setOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateCanHover = () => setCanHover(mediaQuery.matches);

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);
    return () => mediaQuery.removeEventListener("change", updateCanHover);
  }, []);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !wrapperRef.current?.contains(target)) {
        closeAndRestoreFocus();
      }
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeAndRestoreFocus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeAndRestoreFocus, isOpen, setOpen]);

  useEffect(
    () => () => {
      clearHoverOpenTimer();
      clearHoverOpenedMarker();
      clearCloseTimer();
    },
    [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker],
  );

  const triggerProps: CmmDropdownTriggerProps = {
    ref: triggerRef,
    type: "button",
    "aria-expanded": isOpen,
    "aria-controls": id,
    ...(triggerHasPopup ? { "aria-haspopup": triggerHasPopup } : {}),
    onMouseDown: () => {
      clearHoverOpenTimer();
      if (hoverOpenedRef.current) {
        clearHoverOpenedMarker();
        clickToggleOpenRef.current = false;
        setOpen(false);
        return;
      }
      clickToggleOpenRef.current = isOpen;
    },
    onClick: (event) => {
      if (!event.defaultPrevented) {
        toggle();
      }
    },
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    },
    onMouseEnter: () => {
      if (canHover) {
        openFromHover();
      }
    },
  };

  const triggerRect = placement.triggerRect;
  const layoutScale = placement.layoutScale;
  const triggerCenter = triggerRect
    ? `${(triggerRect.left + triggerRect.width / 2) / layoutScale}px`
    : "50%";
  const fixedPositionStyle: CSSProperties = {
    ...panelStyle,
    left: triggerCenter,
    ...(triggerRect
      ? placement.openUp
        ? {
            bottom: `${(placement.viewportHeight - triggerRect.top + verticalGap) / layoutScale}px`,
          }
        : { top: `${(triggerRect.bottom + verticalGap) / layoutScale}px` }
      : {}),
  };

  return (
    <div
      ref={wrapperRef}
      className={cn("relative shrink-0", wrapperClassName)}
      onMouseEnter={canHover ? openFromHover : undefined}
      onMouseLeave={canHover ? closeFromHover : undefined}
    >
      {renderTrigger(triggerProps)}
      {isOpen ? (
        <div
          id={id}
          role={panelRole}
          aria-label={ariaLabel}
          className={cn(
            "fixed z-[70] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-visible",
            panelClassName,
          )}
          style={fixedPositionStyle}
          onMouseEnter={canHover ? openFromHover : undefined}
          onMouseLeave={canHover ? closeFromHover : undefined}
        >
          <span
            aria-hidden="true"
            className="pointer-events-auto absolute left-0 right-0"
            style={
              placement.openUp
                ? { bottom: `-${verticalGap}px`, height: `${verticalGap}px` }
                : { top: `-${verticalGap}px`, height: `${verticalGap}px` }
            }
            onMouseEnter={canHover ? openFromHover : undefined}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/15",
              placement.openUp
                ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0"
                : "-top-2",
            )}
            style={panelStyle}
          />
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { DEFAULT_HOVER_CLOSE_DELAY_MS };
