"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";

import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type RibbonTutorialStep = {
  target: string;
  fallbackTarget?: string;
  title: string;
  description: string;
};

type RibbonTutorialCopy = {
  trigger: string;
  homepageTrigger: string;
  homepageIntro: string;
  homepageDescription: string;
  dialogLabel: string;
  stepLabel: (current: number, total: number) => string;
  close: string;
  previous: string;
  next: string;
  skip: string;
  finish: string;
  steps: RibbonTutorialStep[];
};

const RIBBON_TUTORIAL_COPY: Record<Locale, RibbonTutorialCopy> = {
  fr: {
    trigger: "Découvrir le ruban",
    homepageTrigger: "Tutoriel du ruban",
    homepageIntro: "Nouveau sur CleanMyMap ?",
    homepageDescription: "Découvrez le ruban en 1 minute.",
    dialogLabel: "Tutoriel du ruban de navigation",
    stepLabel: (current, total) => `Étape ${current} sur ${total}`,
    close: "Fermer le tutoriel du ruban",
    previous: "Précédent",
    next: "Suivant",
    skip: "Passer",
    finish: "Terminer",
    steps: [
      {
        target: "home",
        title: "Accueil",
        description: "Revenez ici à tout moment pour retrouver le point de départ de CleanMyMap.",
      },
      {
        target: "search",
        fallbackTarget: "primary",
        title: "Rechercher",
        description: "Ouvrez la recherche globale pour trouver une rubrique, un outil ou une aide sans parcourir les menus.",
      },
      {
        target: "product",
        title: "Navigation produit",
        description: "Ces blocs regroupent les grands parcours du produit. Ouvrez un bloc pour afficher ses rubriques.",
      },
      {
        target: "preferences",
        title: "Préférences",
        description: "Adaptez l’affichage et la langue, puis retrouvez vos préférences de compte.",
      },
      {
        target: "feedback",
        title: "Feedback",
        description: "Signalez un problème, proposez une idée, contactez-nous ou soutenez le projet.",
      },
      {
        target: "account",
        title: "Profil et espace personnel",
        description: "Accédez à vos notifications, votre profil et votre statut. Connectez-vous si ces options ne sont pas encore disponibles.",
      },
    ],
  },
  en: {
    trigger: "Discover the ribbon",
    homepageTrigger: "Ribbon tutorial",
    homepageIntro: "New to CleanMyMap?",
    homepageDescription: "Discover the ribbon in 1 minute.",
    dialogLabel: "Navigation ribbon tutorial",
    stepLabel: (current, total) => `Step ${current} of ${total}`,
    close: "Close the navigation ribbon tutorial",
    previous: "Previous",
    next: "Next",
    skip: "Skip",
    finish: "Finish",
    steps: [
      {
        target: "home",
        title: "Home",
        description: "Come back here at any time to return to CleanMyMap’s starting point.",
      },
      {
        target: "search",
        fallbackTarget: "primary",
        title: "Search",
        description: "Open global search to find a section, tool or help without browsing every menu.",
      },
      {
        target: "product",
        title: "Product navigation",
        description: "These blocks group the product’s main journeys. Open a block to see its sections.",
      },
      {
        target: "preferences",
        title: "Preferences",
        description: "Adjust the display and language, then access your account preferences.",
      },
      {
        target: "feedback",
        title: "Feedback",
        description: "Report a problem, suggest an idea, contact us or support the project.",
      },
      {
        target: "account",
        title: "Profile and personal space",
        description: "Access notifications, your profile and your status. Sign in if these options are not available yet.",
      },
    ],
  },
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const SPOTLIGHT_PADDING_PX = 8;

function isVisibleTarget(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none"
    && style.visibility !== "hidden"
    && rect.width > 0
    && rect.height > 0;
}

function findTutorialTarget(step: RibbonTutorialStep): HTMLElement | null {
  const findVisible = (name: string) => Array.from(
    document.querySelectorAll<HTMLElement>(`[data-navigation-tutorial-target="${name}"]`),
  ).find(isVisibleTarget) ?? null;

  return findVisible(step.target) ?? (step.fallbackTarget ? findVisible(step.fallbackTarget) : null);
}

export function RibbonTutorial({
  locale,
  entryPoint = "ribbon",
}: {
  locale: Locale;
  entryPoint?: "ribbon" | "homepage";
}) {
  const copy = RIBBON_TUTORIAL_COPY[locale];
  const isHomepageEntryPoint = entryPoint === "homepage";
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const step = copy.steps[stepIndex] ?? copy.steps[0];

  const updatePosition = useCallback(() => {
    if (!open || !step) return;

    const target = findTutorialTarget(step);
    const targetBox = target?.getBoundingClientRect();
    const nextRect = targetBox
      ? {
          top: targetBox.top,
          left: targetBox.left,
          width: targetBox.width,
          height: targetBox.height,
        }
      : null;

    setSpotlightRect(nextRect);
  }, [open, step]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(updatePosition);
    const retry = window.setTimeout(updatePosition, 80);
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, step, updatePosition]);

  const close = useCallback(() => {
    setOpen(false);
    setSpotlightRect(null);
  }, []);

  const openTutorial = () => {
    setStepIndex(0);
    setOpen(true);
  };

  const goNext = () => {
    if (stepIndex >= copy.steps.length - 1) {
      close();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goPrevious = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const spotlightStyle = useMemo<CSSProperties | null>(() => {
    if (!spotlightRect) return null;

    return {
      top: spotlightRect.top - SPOTLIGHT_PADDING_PX,
      left: spotlightRect.left - SPOTLIGHT_PADDING_PX,
      width: spotlightRect.width + SPOTLIGHT_PADDING_PX * 2,
      height: spotlightRect.height + SPOTLIGHT_PADDING_PX * 2,
    };
  }, [spotlightRect]);

  const overlay = open ? (
    <>
      <div
        aria-hidden="true"
        data-motion-role="overlay"
        data-navigation-ribbon-tour-spotlight-layer
        className="pointer-events-none fixed inset-0 z-[39]"
      >
        {spotlightStyle ? (
          <div
            data-navigation-ribbon-tour-spotlight
            className="absolute rounded-2xl border-2 border-amber-200/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.74),0_0_0_5px_rgba(251,191,36,0.16)]"
            style={spotlightStyle}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-950/74" />
        )}
      </div>

      <CmmDialog
        open={open}
        onClose={close}
        ariaLabel={copy.dialogLabel}
        ariaDescribedBy="ribbon-tutorial-description"
        size="sm"
        className="cmm-navigation-ribbon-tour-backdrop"
        panelClassName="cmm-navigation-ribbon-tour-panel z-[41] max-w-none overflow-hidden rounded-[1.35rem] border border-amber-200/30 bg-slate-950/98 p-0 text-white shadow-[0_28px_70px_-30px_rgba(2,6,23,0.96)]"
      >
        <div className="cmm-navigation-ribbon-tour-content">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] text-amber-200/85">
                {copy.stepLabel(stepIndex + 1, copy.steps.length)}
              </p>
              <h2 id="ribbon-tutorial-title" className="mt-1 text-lg font-black tracking-tight text-white">
                {step.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label={copy.close}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
              onClick={close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="px-5 py-5">
            <div className="mb-5 flex items-center gap-3" aria-hidden="true">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200">
                <Compass className="h-5 w-5" />
              </div>
              <div className="flex min-w-0 flex-1 gap-1.5">
                {copy.steps.map((item, index) => (
                  <span
                    key={item.target}
                    className={cn(
                      "h-1.5 flex-1 rounded-full bg-white/10",
                      index <= stepIndex && "bg-amber-300/80",
                    )}
                  />
                ))}
              </div>
            </div>
            <p id="ribbon-tutorial-description" className="text-sm leading-6 text-slate-200">
              {step.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-white/[0.03] px-5 py-4">
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={goPrevious}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {copy.previous}
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
                onClick={close}
              >
                {copy.skip}
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-amber-200/35 bg-amber-300/15 px-3.5 text-sm font-bold text-amber-50 transition-colors hover:border-amber-100/60 hover:bg-amber-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                onClick={goNext}
              >
                {stepIndex === copy.steps.length - 1 ? (
                  <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                {stepIndex === copy.steps.length - 1 ? copy.finish : copy.next}
              </button>
            </div>
          </div>
        </div>
      </CmmDialog>
    </>
  ) : null;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      aria-label={isHomepageEntryPoint ? copy.homepageTrigger : copy.trigger}
      title={isHomepageEntryPoint ? copy.homepageTrigger : copy.trigger}
      aria-haspopup="dialog"
      data-navigation-tutorial-trigger
      className={isHomepageEntryPoint
        ? "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/65 bg-white px-4 py-2.5 text-sm font-bold text-[#047957] shadow-[0_14px_28px_-18px_rgba(0,40,30,0.62)] transition hover:border-white hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
        : "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-amber-200/25 bg-amber-400/10 px-0 text-amber-50 transition-colors hover:border-amber-200/50 hover:bg-amber-300/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 xl:h-10 xl:w-auto xl:px-3"}
      onClick={openTutorial}
    >
      <Compass className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
      <span className={isHomepageEntryPoint ? undefined : "cmm-ribbon-text hidden font-semibold xl:inline"}>
        {isHomepageEntryPoint ? copy.homepageTrigger : copy.trigger}
      </span>
    </button>
  );

  return (
    <>
      {isHomepageEntryPoint ? (
        <div
          data-navigation-tutorial-entry="homepage"
          className="mt-5 flex max-w-[38rem] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/30 bg-emerald-950/20 px-4 py-3 text-white/95 shadow-[0_16px_34px_-26px_rgba(0,40,30,0.72)] backdrop-blur-sm sm:mt-6 sm:px-5 sm:py-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-white sm:text-base">
              {copy.homepageIntro}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-emerald-50/85 sm:text-sm">
              {copy.homepageDescription}
            </p>
          </div>
          {trigger}
        </div>
      ) : trigger}

      {typeof document !== "undefined" && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
