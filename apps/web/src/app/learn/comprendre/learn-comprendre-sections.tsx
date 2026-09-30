import Link from "next/link";

import {
  DeferredGIECContent,
  DeferredImpactOrderOfMagnitudeSection,
  DeferredLearnArtworkAccordion,
  DeferredLearnVulgarisationMagnitudeComparator,
  DeferredPlanetaryBoundariesInteractive,
  DeferredSustainableGoalsInteractive,
} from "@/components/learn/learn-deferred-panels";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnComprendreSsrContent } from "@/components/learn/learn-comprendre-ssr-content";
import { LearnVulgarisationPathSection } from "@/components/learn/learn-vulgarisation-path-section";
import type { Locale } from "@/lib/ui/preferences";

type ProgressCueProps = {
  eyebrow: string;
  title: string;
  detail: string;
};

function ProgressCue({ eyebrow, title, detail }: ProgressCueProps) {
  return (
    <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm md:p-5">
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          {eyebrow}
        </p>
        <h4 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">{title}</h4>
        <p className="cmm-text-body">{detail}</p>
      </div>
    </section>
  );
}

export function LearnDirectPathSection({ locale }: { locale: Locale }) {
  return (
    <section className="rounded-[1.6rem] border border-amber-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {locale === "fr" ? "Chemin direct" : "Direct path"}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? "Aller au quiz, garder la méthodologie sous la main"
              : "Go to the quiz, keep methodology close"}
          </h3>
          <p className="cmm-text-body">
            {locale === "fr"
              ? "Le quiz reste le prochain geste. La méthodologie sert de repère secondaire quand il faut creuser un point."
              : "The quiz is the next step. Methodology stays as a secondary reference when you need to dig deeper."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/learn/sentrainer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-600 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
          >
            {locale === "fr" ? "Passer au quiz" : "Go to the quiz"}
          </Link>
          <Link
            href="/methodologie"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
          >
            {locale === "fr" ? "Voir la méthodologie" : "See the methodology"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LearnReadingFlowSection({ locale }: { locale: Locale }) {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          {locale === "fr" ? "Fil de lecture" : "Reading flow"}
        </p>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">
          {locale === "fr" ? "Contexte, repères, méthode, puis systèmes" : "Context, cues, method, then systems"}
        </h3>
        <p className="cmm-text-body">
          {locale === "fr"
            ? "Chaque bloc tient une seule idée. La page avance du cadrage vers l'échelle, puis vers les cadres de référence."
            : "Each block carries a single idea. The page moves from framing to scale, then to reference systems."}
        </p>
      </div>
      <LearnVulgarisationPathSection locale={locale} />
      <LearnComprendreSsrContent locale={locale} />
      <ProgressCue
        eyebrow={locale === "fr" ? "À retenir" : "Keep in mind"}
        title={locale === "fr" ? "Lire le contexte avant de comparer" : "Read the context before comparing"}
        detail={
          locale === "fr"
            ? "Le cadrage et la méthode évitent de surinterpréter le chiffre brut."
            : "Framing and method prevent overreading the raw number."
        }
      />
    </section>
  );
}

export function LearnScaleSection({ locale }: { locale: Locale }) {
  return (
    <>
      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {locale === "fr" ? "Repères d'échelle" : "Scale cues"}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Comparer avant d'interpréter" : "Compare before interpreting"}
          </h3>
          <p className="cmm-text-body">
            {locale === "fr"
              ? "Le comparateur et le calcul d'impact servent de pont entre le chiffre brut et la lecture utile."
              : "The comparator and impact calculator bridge the raw number and a useful reading."}
          </p>
        </div>
        <DeferredLearnVulgarisationMagnitudeComparator locale={locale} />
        <DeferredImpactOrderOfMagnitudeSection locale={locale} />
      </div>
      <ProgressCue
        eyebrow={locale === "fr" ? "Pour aller plus loin" : "Go deeper"}
        title={
          locale === "fr"
            ? "Passer des ordres de grandeur aux cadres de référence"
            : "Move from orders of magnitude to reference frameworks"
        }
        detail={
          locale === "fr"
            ? "Le comparateur prépare la lecture du GIEC, des limites planétaires et des objectifs durables."
            : "The comparator prepares the reading of the IPCC, planetary boundaries and sustainable goals."
        }
      />
    </>
  );
}

export function LearnReferenceSystemsSection({ locale }: { locale: Locale }) {
  return (
    <>
      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {locale === "fr" ? "Systèmes de référence" : "Reference systems"}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les cadres plus larges viennent ensuite" : "Broader frameworks come next"}
          </h3>
          <p className="cmm-text-body">
            {locale === "fr"
              ? "On quitte le cas individuel pour les grands repères scientifiques et les cadres qui aident à situer l'action."
              : "We move from the individual case to the larger scientific references and the frames that help situate action."}
          </p>
        </div>
        <DeferredGIECContent locale={locale} />
        <DeferredPlanetaryBoundariesInteractive locale={locale} />
        <DeferredSustainableGoalsInteractive locale={locale} />
      </div>
      <ProgressCue
        eyebrow={locale === "fr" ? "En synthèse" : "In summary"}
        title={locale === "fr" ? "Relier les cadres pour situer l'action" : "Connect the frameworks to situate action"}
        detail={
          locale === "fr"
            ? "GIEC, limites planétaires et objectifs durables donnent un même langage pour décider."
            : "IPCC, planetary boundaries and sustainable goals provide a shared language for decisions."
        }
      />
    </>
  );
}

export function LearnDeepDiveSection({ locale }: { locale: Locale }) {
  return (
    <>
      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            {locale === "fr" ? "Approfondissements" : "Deep dives"}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "À ouvrir si l'on veut voir plus large" : "Open if you want the wider picture"}
          </h3>
          <p className="cmm-text-body">
            {locale === "fr"
              ? "Ces blocs prolongent la lecture après le repère principal. Ils n'ouvrent pas la page, ils l'étendent."
              : "These blocks extend the reading after the main cue. They do not define the page; they extend it."}
          </p>
        </div>
        <DeferredLearnArtworkAccordion locale={locale} />
      </div>
      <LearnBlockJourneySection locale={locale} currentPageId="comprendre" compact />
    </>
  );
}
