"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { AnnuairePartnerDrawerPanel } from "./annuaire-partner-drawer.panel";

interface AnnuairePartnerDrawerProps {
  entry: EnrichedAnnuaireEntry | null;
  isOpen: boolean;
  onClose: () => void;
  fr: boolean;
}

export function AnnuairePartnerDrawer({ entry, isOpen, onClose, fr }: AnnuairePartnerDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const drawerTitleId = useId();
  const entryId = entry?.id;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !entryId) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        drawerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus();
      }
      restoreFocusRef.current = null;
    };
  }, [entryId, isOpen]);

  if (!entry) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <AnnuairePartnerDrawerPanel
        drawerRef={drawerRef}
        closeButtonRef={closeButtonRef}
        drawerTitleId={drawerTitleId}
        entry={entry}
        isOpen={isOpen}
        onClose={onClose}
        fr={fr}
        shouldReduceMotion={shouldReduceMotion}
      />
    </AnimatePresence>,
    document.body,
  );
}
