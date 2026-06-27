"use client";

import dynamic from "next/dynamic";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { useInViewOnce } from "@/components/ui/use-in-view-once";

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

export function DeferredLearnArtworkAccordion({ locale }: { locale: LearnLocale }) {
  return <DeferredLearnArtworkAccordionComponent locale={locale} />;
}

export function DeferredLearnVulgarisationMagnitudeComparator({
  className,
}: {
  className?: string;
}) {
  return <DeferredLearnVulgarisationMagnitudeComparatorComponent className={className} />;
}

export function DeferredImpactOrderOfMagnitudeSection() {
  return <DeferredImpactOrderOfMagnitudeSectionComponent />;
}

export function DeferredGIECContent() {
  return <DeferredGIECContentComponent />;
}

export function DeferredPlanetaryBoundariesInteractive() {
  return <DeferredPlanetaryBoundariesInteractiveComponent />;
}

export function DeferredSustainableGoalsInteractive() {
  return <DeferredSustainableGoalsInteractiveComponent />;
}

export function DeferredEnvironmentalQuiz() {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "240px 0px",
  });

  return (
    <div ref={ref} className="min-h-[760px]">
      {isInView ? (
        <DeferredEnvironmentalQuizComponent />
      ) : (
        <div className="flex h-[760px] items-center justify-center rounded-[2rem] border border-amber-200/70 bg-white/80">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-2 border-amber-500/20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Le quiz s&apos;active à l&apos;approche de la section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
