"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import {
  DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
  useDropdownPlacement,
} from "./use-dropdown-placement";

export type CmmDropdownPanelRole = "menu" | "region" | "dialog";

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

export type CmmDropdownProps = {
  id: string;
  ariaLabel: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  renderTrigger: (props: CmmDropdownTriggerProps) => ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelRole?: CmmDropdownPanelRole;
  triggerHasPopup?: "menu" | "dialog" | null;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  panelAlignment?: "center" | "start";
  wrapperClassName?: string;
  verticalGap?: number;
  openOnHover?: boolean;
  hoverCloseDelayMs?: number;
};

const DEFAULT_HOVER_CLOSE_DELAY_MS = 160;
const PANEL_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");
const VIEWPORT_MARGIN_PX = 8;

function subscribeToDocumentBody() {
  return () => undefined;
}

function getPortalTarget() {
  return typeof document === "undefined" ? null : document.body;
}

function getServerPortalTarget() {
  return null;
}

export function CmmDropdown({
  id,
  ariaLabel,
  ariaLabelledBy,
  children,
  renderTrigger,
  open,
  defaultOpen = false,
  onOpenChange,
  panelRole = "menu",
  triggerHasPopup = "menu",
  panelClassName,
  panelStyle,
  panelAlignment = "center",
  wrapperClassName,
  verticalGap = DEFAULT_DROPDOWN_VERTICAL_GAP_PX,
  openOnHover = true,
  hoverCloseDelayMs = DEFAULT_HOVER_CLOSE_DELAY_MS,
}: CmmDropdownProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledOpen;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedMarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedRef = useRef(false);
  const clickToggleOpenRef = useRef<boolean | null>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const focusPanelOnOpenRef = useRef(false);
  const wasOpenRef = useRef(isOpen);
  const [canHover, setCanHover] = useState(false);
  const portalTarget = useSyncExternalStore(subscribeToDocumentBody, getPortalTarget, getServerPortalTarget);
  const placement = useDropdownPlacement({
    isOpen,
    panelRef,
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
    restoreFocusOnCloseRef.current = false;
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, hoverCloseDelayMs);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, hoverCloseDelayMs, setOpen]);

  const closeAndRestoreFocus = useCallback(() => {
    clearHoverOpenTimer();
    clearHoverOpenedMarker();
    clearCloseTimer();
    restoreFocusOnCloseRef.current = true;
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
    restoreFocusOnCloseRef.current = openBeforeClick;
    setOpen(!openBeforeClick);
  }, [clearCloseTimer, clearHoverOpenTimer, clearHoverOpenedMarker, isOpen, setOpen]);

  useEffect(() => {
    if (!openOnHover || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateCanHover = () => setCanHover(mediaQuery.matches);

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);
    return () => mediaQuery.removeEventListener("change", updateCanHover);
  }, [openOnHover]);

  useEffect(() => {
    if (isOpen && focusPanelOnOpenRef.current) {
      focusPanelOnOpenRef.current = false;
      panelRef.current?.querySelector<HTMLElement>(PANEL_FOCUSABLE_SELECTOR)?.focus();
    }
    if (wasOpenRef.current && !isOpen && restoreFocusOnCloseRef.current) {
      triggerRef.current?.focus();
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
    if (wasOpenRef.current && !isOpen) {
      restoreFocusOnCloseRef.current = true;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
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
        clickToggleOpenRef.current = true;
        return;
      }
      clickToggleOpenRef.current = isOpen;
      if (!isOpen) {
        focusPanelOnOpenRef.current = true;
      }
    },
    onClick: (event) => {
      if (!event.defaultPrevented) {
        toggle();
      }
    },
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isOpen) {
          focusPanelOnOpenRef.current = true;
        }
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
  const triggerCenter = triggerRect ? triggerRect.left + triggerRect.width / 2 : null;
  const measuredPanelWidth = placement.panelWidth > 0 ? placement.panelWidth : null;
  const panelWidthForPlacement = measuredPanelWidth === null
    ? 0
    : Math.min(measuredPanelWidth, Math.max(0, placement.viewportWidth - VIEWPORT_MARGIN_PX * 2));
  const idealPanelLeft = triggerRect && measuredPanelWidth !== null
    ? panelAlignment === "start"
      ? triggerRect.left
      : (triggerCenter ?? 0) - panelWidthForPlacement / 2
    : null;
  const maxPanelLeft = Math.max(VIEWPORT_MARGIN_PX, placement.viewportWidth - VIEWPORT_MARGIN_PX - panelWidthForPlacement);
  const clampedPanelLeft = idealPanelLeft === null
    ? null
    : Math.min(maxPanelLeft, Math.max(VIEWPORT_MARGIN_PX, idealPanelLeft));
  const panelLeft = clampedPanelLeft === null
    ? panelAlignment === "start" && triggerRect ? `${Math.max(VIEWPORT_MARGIN_PX, triggerRect.left)}px` : "50%"
    : `${clampedPanelLeft}px`;
  const panelTransform = clampedPanelLeft === null && panelAlignment === "center" ? "translateX(-50%)" : "none";
  const arrowStyle = panelAlignment === "start" && triggerRect
    ? {
        left: clampedPanelLeft === null || measuredPanelWidth === null
          ? `${triggerRect.width / 2}px`
          : `${Math.min(Math.max(triggerCenter! - clampedPanelLeft, 12), Math.max(12, measuredPanelWidth - 12))}px`,
      }
    : undefined;
  const availablePanelHeight = triggerRect && placement.viewportHeight > 0
    ? Math.max(
        0,
        (placement.openUp
          ? triggerRect.top - verticalGap
          : placement.viewportHeight - triggerRect.bottom - verticalGap) - 1,
      )
    : null;
  const maxPanelHeight = availablePanelHeight === null
    ? panelStyle?.maxHeight ?? "calc(100vh - 1rem)"
    : `min(${panelStyle?.maxHeight ?? "calc(100vh - 1rem)"}, ${availablePanelHeight}px)`;
  const fixedPositionStyle: CSSProperties = {
    ...panelStyle,
    maxHeight: maxPanelHeight,
    left: panelLeft,
    transform: panelTransform,
    ...(triggerRect
      ? placement.openUp
        ? {
            bottom: `${placement.viewportHeight - triggerRect.top + verticalGap}px`,
          }
        : { top: `${triggerRect.bottom + verticalGap}px` }
      : {}),
  };

  const panel = isOpen ? (
    <div
      ref={panelRef}
      id={id}
      role={panelRole}
      aria-label={ariaLabel}
      {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {})}
      className={cn(
        "fixed z-[70] flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-visible",
        panelClassName,
      )}
      style={fixedPositionStyle}
      onMouseEnter={openOnHover && canHover ? openFromHover : undefined}
      onMouseLeave={openOnHover && canHover ? closeFromHover : undefined}
    >
      <span
        aria-hidden="true"
        className="pointer-events-auto absolute left-0 right-0"
        style={
          placement.openUp
            ? { bottom: `-${verticalGap}px`, height: `${verticalGap}px` }
            : { top: `-${verticalGap}px`, height: `${verticalGap}px` }
        }
        onMouseEnter={openOnHover && canHover ? openFromHover : undefined}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-black/35",
          placement.openUp
            ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0"
            : "-top-2",
        )}
        style={{
          backgroundColor: panelStyle?.backgroundColor,
          backgroundImage: panelStyle?.backgroundImage,
          borderColor: "rgba(15, 23, 42, 0.34)",
          ...arrowStyle,
        }}
      />
      <div
        data-cmm-dropdown-scroll-region
        className="min-h-0 min-w-0 overflow-y-auto"
      >
        {children}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative shrink-0", wrapperClassName)}
      onMouseEnter={openOnHover && canHover ? openFromHover : undefined}
      onMouseLeave={openOnHover && canHover ? closeFromHover : undefined}
    >
      {renderTrigger(triggerProps)}
      {portalTarget && panel ? createPortal(panel, portalTarget) : panel}
    </div>
  );
}

export { DEFAULT_HOVER_CLOSE_DELAY_MS };
