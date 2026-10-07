import {
  BookOpen,
  Brain,
  Info,
  Scaling,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { DISPLAY_MODE_DESCRIPTIONS } from "@/lib/ui/preferences";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { FreePlanServicesMethodologyVisual } from "./free-plan-services-methodology-visual";
import { ReferenceDocCard, type OpenSourceDoc } from "./action-map-methodology-section";

type MethodologyData = {
  scope: string;
  version: string;
};

type BaseProps = {
  isFrench: boolean;
  locale: "fr" | "en";
  methodology: MethodologyData;
};

export function MethodologieDisplayModesSection({ isFrench, locale }: Pick<BaseProps, "isFrench" | "locale">) {
  return (
    <section
      id="modes-affichage"
      aria-labelledby="modes-affichage-title"
      className="scroll-mt-28 space-y-6 rounded-[2rem] border border-rose-100 bg-rose-50/45 p-6 text-slate-950 shadow-[0_18px_46px_-34px_rgba(190,24,93,0.24)] sm:p-8 lg:p-10"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
          <Info className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-rose-700">
            {isFrench ? "Présentation" : "Presentation"}
          </p>
          <h2 id="modes-affichage-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {isFrench ? "Modes d’affichage" : "Display modes"}
          </h2>
        </div>
      </div>

      <p className="cmm-text-body max-w-4xl font-medium">
        {isFrench
          ? "Les trois modes changent la présentation, pas le produit."
          : "The three modes change presentation, not the product."}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {([
          ["exhaustif", isFrench ? "Exhaustif" : "Exhaustive"],
          ["minimaliste", isFrench ? "Minimaliste" : "Minimal"],
          ["sobre", isFrench ? "Sobre" : "Calm"],
        ] as const).map(([mode, title]) => (
          <article key={mode} className="rounded-2xl border border-rose-100 bg-white p-5">
            <h3 className="text-base font-bold text-slate-950">{title}</h3>
            <p className="cmm-text-small cmm-text-secondary mt-2">{DISPLAY_MODE_DESCRIPTIONS[mode][locale]}</p>
          </article>
        ))}
      </div>

      <p className="rounded-2xl border border-rose-200 bg-rose-100/70 px-4 py-3 text-sm font-semibold leading-relaxed text-rose-950">
        {isFrench
          ? "Le mode change la présentation, jamais les fonctionnalités, permissions ou données."
          : "The mode changes presentation, never features, permissions or data."}
      </p>
    </section>
  );
}

export function MethodologieCalculationSection({ isFrench, methodology }: Pick<BaseProps, "isFrench" | "methodology">) {
  const items = [
    { label: "Version", val: methodology.version, icon: <BookOpen size={16} /> },
    { label: "Sources", val: "Configuration runtime", icon: <Zap size={16} /> },
    { label: isFrench ? "Périmètre" : "Scope", val: isFrench ? "Approuvé + filtres" : "Approved + filters", icon: <Scaling size={16} /> },
    { label: isFrench ? "Nature" : "Nature", val: isFrench ? "Proxys, pas mesures" : "Proxies, not measurements", icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-8 shadow-[0_18px_44px_-32px_rgba(190,24,93,0.25)] transition-all duration-700 md:p-12">
      <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-5">
        <ShieldCheck size={400} className="text-red-400" />
      </div>
      <div className="relative z-10 grid items-center gap-16 md:grid-cols-2">
        <div className="space-y-8">
          <h2 className="flex items-center gap-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            <Brain className="text-rose-600" />
            <span>Méthode de calcul</span>
          </h2>
          <p className="cmm-text-body max-w-md font-medium">
            Les KPI terrain utilisent le calcul runtime versionné. Les valeurs déclarées et estimées sont distinguées avant l’application des proxys à la masse ou aux mégots retenus. Périmètre : {methodology.scope}
          </p>
          <div className="flex gap-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-2.5 cmm-text-caption font-black uppercase tracking-widest text-rose-700">
              Version {methodology.version}
            </div>
            <div className="rounded-xl bg-rose-600 px-5 py-2.5 cmm-text-caption font-black uppercase tracking-widest text-white shadow-xl shadow-rose-600/20">
              Proxy versionné
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, index) => (
            <div key={index} className="group flex flex-col gap-3 rounded-2xl border border-rose-100 bg-rose-50/55 p-5 shadow-sm transition-all hover:border-rose-200">
              <div className="text-red-400 transition-transform group-hover:scale-110">{item.icon}</div>
              <div className="space-y-1">
                <div className="cmm-text-caption font-black uppercase tracking-widest text-slate-500">{item.label}</div>
                <div className="text-sm font-bold text-rose-800">{item.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type QuotaProps = BaseProps & {
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  githubStats: GitHubRepositoryStats | null;
  quotaServicesDoc: OpenSourceDoc;
};

export function MethodologieQuotaSection({
  freePlanServices,
  githubStats,
  impactTotals,
  isFrench,
  quotaServicesDoc,
}: QuotaProps) {
  return (
    <section className="space-y-8 border-t border-rose-100 pt-10">
      <div className="space-y-4 text-center">
        <p className="cmm-text-caption font-black uppercase tracking-[0.4em] text-rose-700">Quota</p>
        <h2 className="text-4xl font-black tracking-tight text-slate-950">{isFrench ? "Plans et quotas" : "Plans and quotas"}</h2>
        <p className="cmm-text-body mx-auto max-w-3xl font-medium">
          {isFrench
            ? "La partie quota s’appuie sur la fiche d’architecture du site et reste centrée sur le risque de dépassement des limites de plan."
            : "The quota section relies on the site architecture sheet and stays focused on the risk of exceeding plan limits."}
        </p>
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ReferenceDocCard doc={quotaServicesDoc} schemaLabel={{ fr: "Schéma: onglet 1", en: "Schema: tab 1" }} schemaHref="#quota-services" isFrench={isFrench} />
        <FreePlanServicesMethodologyVisual
          services={freePlanServices}
          impactTotals={impactTotals}
          githubStats={githubStats}
          isFrench={isFrench}
          displayMode="quota"
          sectionId="quota-services"
        />
      </div>
    </section>
  );
}
