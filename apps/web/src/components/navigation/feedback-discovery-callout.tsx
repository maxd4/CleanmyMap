"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { CmmButton } from "@/components/ui/cmm-button";
import {
  disableFeedbackDiscovery,
  isFeedbackDiscoveryPathEligible,
  markFeedbackDiscoveryShown,
  readFeedbackDiscoveryState,
  resolveFeedbackDiscoveryVisibility,
} from "@/lib/feedback-discovery";

function hasBlockingSurface(): boolean {
  if (typeof document === "undefined") {
    return true;
  }

  if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
    return true;
  }

  if (
    document.querySelector(
      ".cmm-account-setup-surface, [data-testid=\"account-completion-reminder\"]",
    )
  ) {
    return true;
  }

  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  ) && Boolean(activeElement.closest("form"));
}

export function FeedbackDiscoveryCallout({
  isAuthenticated,
  isMenuOpen,
  isPreferencesOpen,
  pathname,
}: {
  isAuthenticated: boolean;
  isMenuOpen: boolean;
  isPreferencesOpen: boolean;
  pathname: string;
}) {
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(() => {
    if (
      !isAuthenticated ||
      isMenuOpen ||
      isPreferencesOpen ||
      !isFeedbackDiscoveryPathEligible(pathname) ||
      hasBlockingSurface()
    ) {
      setVisible(false);
      return;
    }

    const visibility = resolveFeedbackDiscoveryVisibility(readFeedbackDiscoveryState());
    if (!visibility) {
      setVisible(false);
      return;
    }

    markFeedbackDiscoveryShown();
    setVisible(true);
  }, [isAuthenticated, isMenuOpen, isPreferencesOpen, pathname]);

  useEffect(() => {
    const initialEvaluation = window.setTimeout(evaluate, 0);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "cleanmymap_feedback_discovery_v1") {
        evaluate();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(initialEvaluation);
      window.removeEventListener("storage", onStorage);
    };
  }, [evaluate]);

  if (!visible) {
    return null;
  }

  return (
    <aside
      aria-label="Découverte du feedback"
      data-cmm-contextual-callout="feedback-discovery"
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] w-[min(21rem,calc(100vw-1rem))] rounded-2xl border border-amber-200/50 bg-slate-950/98 p-4 text-white shadow-[0_24px_54px_-28px_rgba(2,6,23,0.9)]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-amber-200/50 bg-slate-950"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-amber-100">
              Vous pouvez contribuer à améliorer CleanMyMap !
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Vous avez repéré un problème ou imaginé une amélioration ? Retrouvez les deux raccourcis dans le bouton doré Feedback, en haut du site.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer la présentation Feedback"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            onClick={() => {
              markFeedbackDiscoveryShown();
              setVisible(false);
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CmmButton
            size="sm"
            tone="primary"
            onClick={() => {
              markFeedbackDiscoveryShown();
              setVisible(false);
            }}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Compris
          </CmmButton>
          <CmmButton
            size="sm"
            tone="tertiary"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => {
              disableFeedbackDiscovery();
              setVisible(false);
            }}
          >
            Ne plus me le rappeler
          </CmmButton>
        </div>
      </div>
    </aside>
  );
}
