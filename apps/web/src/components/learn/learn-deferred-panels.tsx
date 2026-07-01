"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import type { QuizSentrainerEntryState } from "@/lib/learning/quiz-entry-state";

const DeferredLearnArtworkAccordionComponent = dynamic(
  () =>
    import("@/components/learn/learn-ressources-client").then(
      (module) => module.LearnArtworkAccordion,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[860px] animate-pulse rounded-[2rem] border border-amber-200/70 bg-white/80" />
    ),
  },
);

const DeferredLearnVulgarisationMagnitudeComparatorComponent = dynamic(
  () =>
    import("@/components/learn/learn-vulgarisation-magnitude-comparator").then(
      (module) => module.LearnVulgarisationMagnitudeComparator,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-[2rem] border border-amber-200/70 bg-white/80" />
    ),
  },
);

const DeferredImpactOrderOfMagnitudeSectionComponent = dynamic(
  () =>
    import("@/components/learn/impact-order-of-magnitude").then(
      (module) => module.ImpactOrderOfMagnitudeSection,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-[2rem] border border-amber-200/70 bg-white/80" />
    ),
  },
);

const DeferredGIECContentComponent = dynamic(
  () => import("@/components/learn/giac-content").then((module) => module.GIECContent),
  {
    ssr: false,
    loading: () => (
      <div className="h-[540px] animate-pulse rounded-[2rem] border border-amber-200/70 bg-white/80" />
    ),
  },
);

const DeferredPlanetaryBoundariesInteractiveComponent = dynamic(
  () =>
    import("@/components/learn/planetary-boundaries").then(
      (module) => module.PlanetaryBoundariesInteractive,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[760px] animate-pulse rounded-[2rem] border border-violet-200/70 bg-white/80" />
    ),
  },
);

const DeferredSustainableGoalsInteractiveComponent = dynamic(
  () =>
    import("@/components/learn/sustainable-goals").then(
      (module) => module.SustainableGoalsInteractive,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-[2rem] border border-violet-200/70 bg-white/80" />
    ),
  },
);

const DeferredEnvironmentalQuizComponent = dynamic(
  () => import("@/components/learn/environmental-quiz").then((module) => module.EnvironmentalQuiz),
  {
    ssr: false,
    loading: () => (
      <div className="h-[760px] animate-pulse rounded-[2rem] border border-amber-200/70 bg-white/80" />
    ),
  },
);

function DeferredLoadingShell({
  accent,
  message,
  heightClassName,
}: {
  accent: "amber" | "violet";
  message: string;
  heightClassName: string;
}) {
  const borderClassName = accent === "violet" ? "border-violet-200/70" : "border-amber-200/70";
  const pulseClassName = accent === "violet" ? "border-violet-500/20" : "border-amber-500/20";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex items-center justify-center rounded-[2rem] border bg-white/80",
        borderClassName,
        heightClassName,
      )}
    >
      <div className="space-y-3 text-center">
        <div className={cn("mx-auto h-12 w-12 animate-pulse rounded-full border-2", pulseClassName)} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function DeferredSection({
  children,
  fallback,
  className,
  rootMargin = "260px 0px",
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin,
  });

  return (
    <div ref={ref} className={className}>
      {isInView ? children : fallback}
    </div>
  );
}

function getDeferredMessage(locale?: LearnLocale) {
  return locale === "en" ? "Loading the deep dive" : "Chargement de l'approfondissement";
}

function getQuizDeferredMessage(locale?: LearnLocale) {
  return locale === "en"
    ? "The quiz activates as you approach the section."
    : "Le quiz s'active à l'approche de la section.";
}

export function DeferredLearnArtworkAccordion({ locale }: { locale: LearnLocale }) {
  const message = locale === "en" ? "Loading the resources" : "Chargement des ressources";

  return (
    <DeferredSection
      className="min-h-[860px]"
      rootMargin="300px 0px"
      fallback={
        <DeferredLoadingShell
          accent="amber"
          message={message}
          heightClassName="h-[860px]"
        />
      }
    >
      <DeferredLearnArtworkAccordionComponent locale={locale} />
    </DeferredSection>
  );
}

export function DeferredLearnVulgarisationMagnitudeComparator({
  className,
  locale,
}: {
  className?: string;
  locale?: LearnLocale;
}) {
  return (
    <DeferredSection
      className={cn("min-h-[520px]", className)}
      rootMargin="300px 0px"
      fallback={
        <DeferredLoadingShell
          accent="amber"
          message={getDeferredMessage(locale)}
          heightClassName="h-[520px]"
        />
      }
    >
      <DeferredLearnVulgarisationMagnitudeComparatorComponent className={className} />
    </DeferredSection>
  );
}

export function DeferredImpactOrderOfMagnitudeSection({ locale }: { locale?: LearnLocale }) {
  return (
    <DeferredSection
      className="min-h-[420px]"
      rootMargin="300px 0px"
      fallback={
        <DeferredLoadingShell
          accent="amber"
          message={getDeferredMessage(locale)}
          heightClassName="h-[420px]"
        />
      }
    >
      <DeferredImpactOrderOfMagnitudeSectionComponent />
    </DeferredSection>
  );
}

export function DeferredGIECContent({ locale }: { locale?: LearnLocale }) {
  return (
    <DeferredSection
      className="min-h-[540px]"
      rootMargin="300px 0px"
      fallback={
        <DeferredLoadingShell
          accent="amber"
          message={getDeferredMessage(locale)}
          heightClassName="h-[540px]"
        />
      }
    >
      <DeferredGIECContentComponent />
    </DeferredSection>
  );
}

export function DeferredPlanetaryBoundariesInteractive({ locale }: { locale?: LearnLocale }) {
  return (
    <DeferredSection
      className="min-h-[760px]"
      rootMargin="320px 0px"
      fallback={
        <DeferredLoadingShell
          accent="violet"
          message={getDeferredMessage(locale)}
          heightClassName="h-[760px]"
        />
      }
    >
      <DeferredPlanetaryBoundariesInteractiveComponent />
    </DeferredSection>
  );
}

export function DeferredSustainableGoalsInteractive({ locale }: { locale?: LearnLocale }) {
  return (
    <DeferredSection
      className="min-h-[520px]"
      rootMargin="320px 0px"
      fallback={
        <DeferredLoadingShell
          accent="violet"
          message={getDeferredMessage(locale)}
          heightClassName="h-[520px]"
        />
      }
    >
      <DeferredSustainableGoalsInteractiveComponent />
    </DeferredSection>
  );
}

type DeferredEnvironmentalQuizProps = QuizSentrainerEntryState & {
  locale?: LearnLocale;
};

export function DeferredEnvironmentalQuiz({
  locale,
  initialAccessType,
  initialCollectiveMode,
  initialDemoMode,
  initialSchoolTrack,
}: DeferredEnvironmentalQuizProps) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "240px 0px",
  });

  return (
    <div ref={ref} className="min-h-[760px]">
      {isInView ? (
        <DeferredEnvironmentalQuizComponent
          initialAccessType={initialAccessType}
          initialCollectiveMode={initialCollectiveMode}
          initialDemoMode={initialDemoMode}
          initialSchoolTrack={initialSchoolTrack}
        />
      ) : (
        <DeferredLoadingShell
          accent="amber"
          message={getQuizDeferredMessage(locale)}
          heightClassName="h-[760px]"
        />
      )}
    </div>
  );
}
