import { BookOpen, Droplets, Globe, Target } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GIEC_REPORTS } from "@/data/content/giec-reports";
import { SUSTAINABLE_GOALS } from "@/data/content/sustainable-goals";
import { PLANETARY_BOUNDARIES, PLANETARY_BOUNDARIES_REFERENCE } from "./planetary-boundaries-data";
import { buildImpactMagnitudeSnapshot, type ImpactMagnitudeInputs } from "@/lib/learning/impact-magnitude";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { formatLearnNumber } from "@/lib/learning/format-learn-number";

const COMPARATOR_INPUTS: ImpactMagnitudeInputs = { cigaretteButts: 10, wasteKg: 20, volunteerMinutes: 30 };

export function LearnComprendreSsrContent({ locale }: { locale: LearnLocale }) {
  const fr = locale === "fr";
  const comparator = buildImpactMagnitudeSnapshot(COMPARATOR_INPUTS, IMPACT_PROXY_CONFIG.factors);
  const crossed = PLANETARY_BOUNDARIES.filter((boundary) => boundary.status === "transgressed").length;
  return (
    <section aria-labelledby="learn-comprendre-ssr-title" className="space-y-4">
      <h2 id="learn-comprendre-ssr-title" className="text-xl font-bold cmm-text-primary">{fr ? "Les repères essentiels avant les graphiques" : "Essential cues before the charts"}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CmmCard as="article" tone="family" className="space-y-3">
          <BookOpen className="h-6 w-6 text-amber-800 dark:text-amber-300" aria-hidden="true" />
          <h3 className="font-bold cmm-text-primary">{fr ? "GIEC" : "IPCC"}</h3>
          <p className="text-3xl font-bold tabular-nums cmm-text-primary">{GIEC_REPORTS.length}</p>
          <p className="cmm-text-body">{fr ? "Contributions et synthèse du sixième cycle, 2021–2023." : "Contributions and synthesis of the sixth cycle, 2021–2023."}</p>
          <a className="text-sm font-semibold underline text-amber-900 dark:text-amber-200" href={GIEC_REPORTS[GIEC_REPORTS.length - 1]?.sourceUrl} target="_blank" rel="noreferrer">{fr ? "Source : GIEC" : "Source: IPCC"}</a>
        </CmmCard>
        <CmmCard as="article" tone="family" className="space-y-3">
          <Globe className="h-6 w-6 text-amber-800 dark:text-amber-300" aria-hidden="true" />
          <h3 className="font-bold cmm-text-primary">{fr ? "Limites planétaires" : "Planetary boundaries"}</h3>
          <p className="text-3xl font-bold tabular-nums cmm-text-primary">{crossed}/{PLANETARY_BOUNDARIES.length}</p>
          <div className="grid grid-cols-9 gap-1" aria-hidden="true">{PLANETARY_BOUNDARIES.map((boundary) => <span key={boundary.id} className={`h-3 rounded ${boundary.status === "transgressed" ? "bg-rose-600" : "bg-emerald-600"}`} />)}</div>
          <p className="cmm-text-body">{fr ? "Limites franchies, évaluation 2026. Les processus ne sont pas commensurables." : "Boundaries transgressed in the 2026 assessment. Processes are not commensurable."}</p>
          <a className="text-sm font-semibold underline text-amber-900 dark:text-amber-200" href={PLANETARY_BOUNDARIES_REFERENCE.url} target="_blank" rel="noreferrer">{PLANETARY_BOUNDARIES_REFERENCE.label}</a>
        </CmmCard>
        <CmmCard as="article" tone="family" className="space-y-3">
          <Target className="h-6 w-6 text-amber-800 dark:text-amber-300" aria-hidden="true" />
          <h3 className="font-bold cmm-text-primary">{fr ? "Objectifs de développement durable" : "Sustainable Development Goals"}</h3>
          <p className="text-3xl font-bold tabular-nums cmm-text-primary">{SUSTAINABLE_GOALS.length}</p>
          <p className="cmm-text-body">{fr ? "Objectifs de l'ONU adoptés en 2015, horizon 2030." : "UN goals adopted in 2015 for 2030."}</p>
          <a className="text-sm font-semibold underline text-amber-900 dark:text-amber-200" href={fr ? "https://sdgs.un.org/fr/goals" : "https://sdgs.un.org/goals"} target="_blank" rel="noreferrer">{fr ? "Source : ONU" : "Source: UN"}</a>
        </CmmCard>
        <CmmCard as="article" tone="family" className="space-y-3">
          <Droplets className="h-6 w-6 text-sky-700 dark:text-sky-300" aria-hidden="true" />
          <h3 className="font-bold cmm-text-primary">{fr ? "Ordre de grandeur" : "Order of magnitude"}</h3>
          <p className="text-3xl font-bold tabular-nums cmm-text-primary">{formatLearnNumber(locale, comparator.waterLiters)} L</p>
          <p className="cmm-text-body">{fr ? "Volume potentiellement exposé à la pollution de 10 mégots, selon le proxy CleanMyMap. Ni eau économisée ni eau mesurée." : "Volume potentially exposed to pollution from 10 cigarette butts under the CleanMyMap proxy. Neither water saved nor measured."}</p>
          <a className="text-sm font-semibold underline text-amber-900 dark:text-amber-200" href="/methodologie">{IMPACT_PROXY_CONFIG.version}</a>
        </CmmCard>
      </div>
      <p className="cmm-text-small">{fr ? "Ces résumés orientent la lecture. Les onglets donnent accès aux sources, hypothèses et outils correspondants." : "These summaries guide reading. The tabs open the corresponding sources, assumptions and tools."}</p>
    </section>
  );
}
