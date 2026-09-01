"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CmmDialogSize = "sm" | "md" | "lg" | "xl";

type CmmDialogAccessibleName =
  | {
      ariaLabel: string;
      ariaLabelledBy?: string;
    }
  | {
      ariaLabel?: string;
      ariaLabelledBy: string;
    };

export type CmmDialogProps = CmmDialogAccessibleName & {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  ariaDescribedBy?: string;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  size?: CmmDialogSize;
  className?: string;
  panelClassName?: string;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
  "audio[controls]",
  "video[controls]",
  "summary",
  "iframe",
].join(",");

function getFocusableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

function focusWithoutScroll(element: HTMLElement) {
  element.focus({ preventScroll: true });
}

/**
 * Primitive modale canonique.
 *
 * Le composant ne rend rien lorsqu'il est fermé. La surface, les tailles et
 * les modes d'affichage sont portés par overlays.css ; ce fichier ne garde
 * que la sémantique et le comportement clavier/focus du dialog.
 */
export function CmmDialog({
  open,
  children,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  dismissible = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  size = "md",
  className,
  panelClassName,
}: CmmDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape, dismissible, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const activeElement = document.activeElement;
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel) {
      const firstFocusableElement = getFocusableElements(panel)[0];
      focusWithoutScroll(firstFocusableElement ?? panel);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialogPanel = panelRef.current;
      if (!dialogPanel) {
        return;
      }

      if (event.key === "Escape") {
        if (dismissibleRef.current && closeOnEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current?.();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogPanel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusWithoutScroll(dialogPanel);
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === firstElement || !dialogPanel.contains(active)) {
          event.preventDefault();
          focusWithoutScroll(lastElement);
        }
        return;
      }

      if (active === lastElement || !dialogPanel.contains(active)) {
        event.preventDefault();
        focusWithoutScroll(firstElement);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus) {
        focusWithoutScroll(previousFocus);
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  if (!ariaLabel?.trim() && !ariaLabelledBy?.trim()) {
    throw new Error("CmmDialog requires ariaLabel or ariaLabelledBy when open.");
  }

  return (
    <div
      className={cn("cmm-backdrop cmm-dialog-backdrop", className)}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible && closeOnBackdrop) {
          onClose?.();
        }
      }}
    >
      <div
        ref={panelRef}
        className={cn("cmm-modal-panel cmm-modal-scroll cmm-dialog-panel", panelClassName)}
        data-dialog-size={size}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
