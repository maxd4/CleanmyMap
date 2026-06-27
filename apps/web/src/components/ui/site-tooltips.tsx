"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TooltipTriggerSource = "title" | "data";

type ActiveTooltip = {
  id: string;
  content: string;
  placement: TooltipPlacement;
  trigger: HTMLElement;
  source: TooltipTriggerSource;
};

type TooltipPosition = {
  top: number;
  left: number;
  arrowTop?: number;
  arrowLeft?: number;
  placement: TooltipPlacement;
};

const SHOW_DELAY_MS = 300;
const GAP = 12;
const EDGE_PADDING = 12;
const TOOLTIP_ID = "cmm-global-tooltip";

function normalizeTooltipContent(raw: string) {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "";
  }

  const sentenceMatch = collapsed.match(/^(.{1,220}?[.!?])(?:\s|$)/);
  const sentence = (sentenceMatch?.[1] ?? collapsed).trim();
  if (sentence.length <= 120) {
    return sentence;
  }

  return `${sentence.slice(0, 117).trimEnd()}…`;
}

function getPreferredPlacement(trigger: HTMLElement): TooltipPlacement {
  const raw = trigger.getAttribute("data-tooltip-placement");
  if (raw === "bottom" || raw === "left" || raw === "right" || raw === "top") {
    return raw;
  }
  return "top";
}

function choosePlacement(
  triggerRect: DOMRect,
  tooltipSize: { width: number; height: number },
  preferred: TooltipPlacement,
): TooltipPlacement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceTop = triggerRect.top - GAP;
  const spaceBottom = viewportHeight - triggerRect.bottom - GAP;
  const spaceLeft = triggerRect.left - GAP;
  const spaceRight = viewportWidth - triggerRect.right - GAP;

  const fits = {
    top: spaceTop >= tooltipSize.height,
    bottom: spaceBottom >= tooltipSize.height,
    left: spaceLeft >= tooltipSize.width,
    right: spaceRight >= tooltipSize.width,
  } satisfies Record<TooltipPlacement, boolean>;

  if (fits[preferred]) {
    return preferred;
  }

  const ordered: TooltipPlacement[] = ["top", "bottom", "right", "left"];
  const preferredOrder = ordered.filter((placement) => placement !== preferred);
  const candidates = [preferred, ...preferredOrder];

  for (const placement of candidates) {
    if (fits[placement]) {
      return placement;
    }
  }

  const available: Record<TooltipPlacement, number> = {
    top: spaceTop,
    bottom: spaceBottom,
    left: spaceLeft,
    right: spaceRight,
  };

  return (Object.entries(available).sort((a, b) => b[1] - a[1])[0]?.[0] as TooltipPlacement) ?? preferred;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computePosition(trigger: HTMLElement, tooltipEl: HTMLElement, preferred: TooltipPlacement): TooltipPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const placement = choosePlacement(
    triggerRect,
    { width: tooltipRect.width, height: tooltipRect.height },
    preferred,
  );

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (placement === "top" || placement === "bottom") {
    const left = clamp(
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      EDGE_PADDING,
      viewportWidth - tooltipRect.width - EDGE_PADDING,
    );
    const top = placement === "top"
      ? Math.max(triggerRect.top - tooltipRect.height - GAP, EDGE_PADDING)
      : Math.min(triggerRect.bottom + GAP, viewportHeight - tooltipRect.height - EDGE_PADDING);
    const arrowLeft = clamp(
      triggerRect.left + triggerRect.width / 2 - left,
      18,
      tooltipRect.width - 18,
    );

    return { top, left, arrowLeft, placement };
  }

  const top = clamp(
    triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
    EDGE_PADDING,
    viewportHeight - tooltipRect.height - EDGE_PADDING,
  );
  const left = placement === "left"
    ? Math.max(triggerRect.left - tooltipRect.width - GAP, EDGE_PADDING)
    : Math.min(triggerRect.right + GAP, viewportWidth - tooltipRect.width - EDGE_PADDING);
  const arrowTop = clamp(
    triggerRect.top + triggerRect.height / 2 - top,
    18,
    tooltipRect.height - 18,
  );

  return { top, left, arrowTop, placement };
}

export function SiteTooltips() {
  const [mounted] = useState(() => typeof window !== "undefined");
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const restoreStateRef = useRef<{
    title?: string;
    describedBy?: string;
  } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const restoreTrigger = useCallback(() => {
    const trigger = activeTriggerRef.current;
    if (trigger && restoreStateRef.current) {
      const { title, describedBy } = restoreStateRef.current;
      if (title !== undefined && trigger.getAttribute("data-tooltip-source") === "title") {
        trigger.setAttribute("title", title);
      }
      if (describedBy !== undefined) {
        if (describedBy) {
          trigger.setAttribute("aria-describedby", describedBy);
        } else {
          trigger.removeAttribute("aria-describedby");
        }
      }
      trigger.removeAttribute("data-tooltip-source");
      trigger.removeAttribute("data-tooltip-original-title");
    }
    restoreStateRef.current = null;
    activeTriggerRef.current = null;
  }, []);

  const hideTooltip = useCallback(() => {
    clearTimer();
    restoreTrigger();
    setActiveTooltip(null);
    setPosition(null);
  }, [clearTimer, restoreTrigger]);

  const updatePosition = useCallback(() => {
    if (!activeTooltip || !tooltipRef.current) {
      return;
    }

    setPosition(computePosition(activeTooltip.trigger, tooltipRef.current, activeTooltip.placement));
  }, [activeTooltip]);

  const showTooltip = useCallback((trigger: HTMLElement, source: TooltipTriggerSource) => {
    clearTimer();

    const rawContent =
      source === "data"
        ? trigger.getAttribute("data-tooltip-content") ?? ""
        : trigger.getAttribute("title") ?? trigger.getAttribute("data-tooltip-original-title") ?? "";

    const content = normalizeTooltipContent(rawContent);
    if (!content) {
      return;
    }

    if (source === "title") {
      const existingTitle = trigger.getAttribute("title");
      if (existingTitle !== null) {
        trigger.setAttribute("data-tooltip-original-title", existingTitle);
        trigger.setAttribute("data-tooltip-source", "title");
        trigger.removeAttribute("title");
      }
    } else {
      trigger.setAttribute("data-tooltip-source", "data");
    }

    const describedBy = trigger.getAttribute("aria-describedby");
    restoreStateRef.current = {
      title: source === "title" ? (trigger.getAttribute("data-tooltip-original-title") ?? undefined) : undefined,
      describedBy: describedBy ?? undefined,
    };

    timerRef.current = window.setTimeout(() => {
      activeTriggerRef.current = trigger;
      const preferredPlacement = getPreferredPlacement(trigger);
      setActiveTooltip({
        id: TOOLTIP_ID,
        content,
        placement: preferredPlacement,
        trigger,
        source,
      });
      trigger.setAttribute("aria-describedby", TOOLTIP_ID);
      setPosition(null);
    }, SHOW_DELAY_MS);
  }, [clearTimer]);

  useEffect(() => {
    const getTrigger = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return null;
      }

      return target.closest<HTMLElement>("[data-tooltip-content], [title]");
    };

    const onPointerOver = (event: PointerEvent | MouseEvent) => {
      if ("pointerType" in event && event.pointerType === "touch") {
        return;
      }

      const trigger = getTrigger(event.target);
      if (!trigger) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && trigger.contains(relatedTarget)) {
        return;
      }

      if (activeTriggerRef.current === trigger) {
        return;
      }

      hideTooltip();
      showTooltip(trigger, trigger.hasAttribute("data-tooltip-content") ? "data" : "title");
    };

    const onPointerOut = (event: PointerEvent | MouseEvent) => {
      const trigger = getTrigger(event.target);
      if (!trigger) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && trigger.contains(relatedTarget)) {
        return;
      }

      hideTooltip();
    };

    const onFocusIn = (event: FocusEvent) => {
      const trigger = getTrigger(event.target);
      if (!trigger) {
        return;
      }

      hideTooltip();
      showTooltip(trigger, trigger.hasAttribute("data-tooltip-content") ? "data" : "title");
    };

    const onFocusOut = (event: FocusEvent) => {
      const trigger = getTrigger(event.target);
      if (!trigger) {
        return;
      }

      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && trigger.contains(relatedTarget)) {
        return;
      }

      hideTooltip();
    };

    const onPointerDown = (event: PointerEvent) => {
      const targetNode = event.target instanceof Node ? event.target : null;
      if (event.pointerType !== "touch") {
        if (
          activeTooltip &&
          tooltipRef.current &&
          (!targetNode || (!tooltipRef.current.contains(targetNode) && !activeTooltip.trigger.contains(targetNode)))
        ) {
          hideTooltip();
        }
        return;
      }

      const trigger = getTrigger(event.target);
      if (!trigger) {
        hideTooltip();
        return;
      }

      hideTooltip();
      showTooltip(trigger, trigger.hasAttribute("data-tooltip-content") ? "data" : "title");
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") {
        return;
      }

      clearTimer();
      if (activeTooltip) {
        hideTooltip();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideTooltip();
      }
    };

    const onScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("mouseover", onPointerOver, true);
    document.addEventListener("mouseout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("mouseover", onPointerOver, true);
      document.removeEventListener("mouseout", onPointerOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [activeTooltip, clearTimer, hideTooltip, showTooltip, updatePosition]);

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) {
      return;
    }

    const nextPosition = computePosition(activeTooltip.trigger, tooltipRef.current, activeTooltip.placement);
    setPosition(nextPosition);
  }, [activeTooltip]);

  const tooltipNode = activeTooltip ? (
    <div
      id={TOOLTIP_ID}
      ref={tooltipRef}
      role="tooltip"
      aria-hidden={false}
      className={cn(
        "pointer-events-none fixed z-[9999] max-w-[300px] select-none rounded-2xl border border-[rgba(161,227,235,0.18)] px-3 py-2 text-[11px] font-medium leading-snug text-white shadow-[0_24px_60px_-28px_rgba(39,195,217,0.34),0_16px_34px_-28px_rgba(91,95,207,0.24)] backdrop-blur-xl",
        "bg-[linear-gradient(135deg,rgba(65,124,132,0.98),rgba(44,95,119,0.96),rgba(91,95,207,0.88))]",
        !position && "invisible opacity-0",
      )}
      style={{
        left: `${position?.left ?? 0}px`,
        top: `${position?.top ?? 0}px`,
      }}
    >
      <span className="relative z-10 block">{activeTooltip.content}</span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute h-2.5 w-2.5 rotate-45 border border-[rgba(161,227,235,0.18)] bg-[linear-gradient(135deg,rgba(65,124,132,0.98),rgba(44,95,119,0.96),rgba(91,95,207,0.88))]",
          position?.placement === "top" && "bottom-[-5px]",
          position?.placement === "bottom" && "top-[-5px]",
          position?.placement === "left" && "right-[-5px]",
          position?.placement === "right" && "left-[-5px]",
        )}
        style={
          position?.placement === "top" || position?.placement === "bottom"
            ? { left: `${position?.arrowLeft ?? 24}px`, transform: "translateX(-50%) rotate(45deg)" }
            : { top: `${position?.arrowTop ?? 24}px`, transform: "translateY(-50%) rotate(45deg)" }
        }
      />
    </div>
  ) : null;

  if (!mounted) {
    return null;
  }

  return createPortal(tooltipNode, document.body);
}
