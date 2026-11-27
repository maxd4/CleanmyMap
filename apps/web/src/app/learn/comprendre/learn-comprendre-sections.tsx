import { ArrowRight, Calculator, Droplets, Globe, Palette, Target, Zap } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  DeferredGIECContent,
  DeferredImpactOrderOfMagnitudeSection,
  DeferredLearnArtworkAccordion,
  DeferredLearnVulgarisationMagnitudeComparator,
  DeferredPlanetaryBoundariesInteractive,
  DeferredSustainableGoalsInteractive,
} from "@/components/learn/learn-deferred-panels";
import { LearnComprendreSsrContent } from "@/components/learn/learn-comprendre-ssr-content";
import { LearnComprendreVisualIntro } from "@/components/learn/learn-comprendre-visual-intro";
import { LearnVulgarisationPathSection } from "@/components/learn/learn-vulgarisation-path-section";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import type { Locale } from "@/lib/ui/preferences";
import type { LucideIcon } from "lucide-react";

type Localized = { fr: string; en: string };

function ThemeIntroduction({ locale, icon: Icon, title, description }: {
  locale: Locale; icon: LucideIcon; title: Localized; description: Localized;
}) {
  return (
    <CmmCard tone="family" as="section" className="flex items-start gap-4 md:items-center">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-amber-800 shadow-sm">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="text-2xl font-bold tracking-tight cmm-text-primary">{title[locale]}</h2>
        <p className="cmm-text-body">{description[locale]}</p>
      </div>
    </CmmCard>
  );
}

export function LearnReadingFlowSection({ locale }: { locale: Locale }) {
  return (
    <>
      <LearnComprendreVisualIntro locale={locale} card={LEARN_OVERVIEW_CARDS[locale][0]}
        question={locale === "fr" ? "Comment lire un chiffre environnemental ?" : "How should we read an environmental figure?"}
        clue={locale === "fr" ? "Vérifier ce qui est mesuré, la méthode du calcul et les limites avant de tirer une conclusion." : "Check what is measured, the calculation method and its limitations before drawing a conclusion."}
        action={{ href: "/methodologie", label: locale === "fr" ? "Voir la méthodologie" : "Read the methodology" }} />
      <LearnComprendreSsrContent locale={locale} />
      <LearnVulgarisationPathSection locale={locale} />
    </>
  );
}

export function LearnScaleSection({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  return (
    <>
      <ThemeIntroduction locale={locale} icon={Calculator}
        title={{ fr: "Comparer des ordres de grandeur", en: "Compare orders of magnitude" }}
        description={{ fr: "Manipulez les deux outils existants pour relier une quantité à une échelle compréhensible, sans confondre un proxy et une mesure.", en: "Use the two existing tools to connect a quantity to an understandable scale without confusing a proxy with a measurement." }} />
      <DeferredLearnVulgarisationMagnitudeComparator locale={locale} />
      <DeferredImpactOrderOfMagnitudeSection locale={locale} />
      <div className="grid gap-3 md:grid-cols-2">
        <CmmCard tone="family" className="space-y-3">
          <Droplets className="h-6 w-6 text-sky-700" aria-hidden="true" />
          <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Pollution de l'eau ≠ consommation d'eau" : "Water pollution ≠ water consumption"}</h3>
          <p className="cmm-text-body">{fr ? "Un volume d'eau potentiellement exposé à la pollution d'un mégot ne constitue pas un volume réellement économisé ou dépollué." : "A volume potentially exposed to cigarette-butt pollution is not a measured volume saved or cleaned."}</p>
          <CmmButton href="/methodologie" tone="secondary" size="sm">{fr ? "Facteurs et limites" : "Factors and limitations"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></CmmButton>
        </CmmCard>
        <CmmCard tone="family" className="space-y-3">
          <Zap className="h-6 w-6 text-amber-800" aria-hidden="true" />
          <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Énergie, carbone et IA" : "Energy, carbon and AI"}</h3>
          <p className="cmm-text-body">{fr ? "Une consommation électrique et les émissions associées dépendent d'unités et d'hypothèses distinctes. Explorez le calculateur d'empreinte IA et ses incertitudes." : "Electricity use and associated emissions depend on different units and assumptions. Explore the AI footprint calculator and its uncertainties."}</p>
          <CmmButton href="/learn/empreinte-ia" tone="secondary" size="sm">{fr ? "Mon empreinte IA" : "My AI footprint"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></CmmButton>
        </CmmCard>
      </div>
    </>
  );
}

export function LearnClimateSection({ locale }: { locale: Locale }) {
  return (
    <>
      <ThemeIntroduction locale={locale} icon={Globe}
        title={{ fr: "Climat et limites planétaires", en: "Climate and planetary boundaries" }}
        description={{ fr: "Les rapports du GIEC synthétisent la recherche climatique ; les limites planétaires décrivent des processus distincts du système Terre. Ces cadres ne mesurent pas l'impact individuel.", en: "IPCC reports synthesize climate research; planetary boundaries describe distinct Earth-system processes. Neither framework measures individual impact." }} />
      <DeferredGIECContent locale={locale} />
      <DeferredPlanetaryBoundariesInteractive locale={locale} />
    </>
  );
}

export function LearnGoalsSection({ locale }: { locale: Locale }) {
  return (
    <>
      <ThemeIntroduction locale={locale} icon={Target}
        title={{ fr: "Les objectifs de développement durable", en: "The Sustainable Development Goals" }}
        description={{ fr: "Explorez les 17 objectifs de l'ONU, adoptés en 2015 à l'horizon 2030. Les cibles et indicateurs sont un cadre collectif, pas une preuve automatique des résultats d'une cleanwalk.", en: "Explore the UN's 17 goals adopted in 2015 for 2030. Targets and indicators are a collective framework, not automatic evidence of a clean-up's results." }} />
      <DeferredSustainableGoalsInteractive locale={locale} />
    </>
  );
}

export function LearnDeepDiveSection({ locale }: { locale: Locale }) {
  return (
    <>
      <ThemeIntroduction locale={locale} icon={Palette}
        title={{ fr: "Art et environnement", en: "Art and environment" }}
        description={{ fr: "Des œuvres et démarches artistiques questionnent la consommation, les déchets et notre rapport aux milieux naturels. L'art sensibilise ; il ne remplace pas une preuve scientifique.", en: "Artworks and artistic practices question consumption, waste and our relationship with nature. Art raises awareness; it does not replace scientific evidence." }} />
      <DeferredLearnArtworkAccordion locale={locale} />
    </>
  );
}
