"use client";

import type { ReactNode } from "react";
import {
  Beaker,
  BookOpen,
  Brain,
  Info,
  MapPin,
  Heart,
  Scaling,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { buildActionImpactMethodology } from "@/lib/actions/impact-calculators";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { DISPLAY_MODE_DESCRIPTIONS } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PageHeader } from "@/components/ui/page-header";
import type {
  EnvironmentalImpactElectricityEstimate,
  EnvironmentalImpactWaterEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import { buildWaterEstimate } from "@/lib/environmental-impact-estimator/services/water";
import { buildElectricityEstimate } from "@/lib/environmental-impact-estimator/services/electricity";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { FreePlanServicesMethodologyVisual } from "./free-plan-services-methodology-visual";
import { MonthlyImpactHistoryChart } from "./monthly-impact-history-chart";
import {
  ActionMapMethodologySection as ActionMapMethodologySectionImpl,
  ReferenceDocCard,
  type OpenSourceDoc,
} from "./action-map-methodology-section";

type MethodologyColor = "red" | "slate";

type MethodologyCardProps = {
  title: string;
  formula: string;
  description: string;
  source: string;
  color: MethodologyColor;
  icon: ReactNode;
};

type MethodologiePageClientProps = {
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  impactSnapshots: EnvironmentalImpactSnapshotRecord[];
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  githubStats: GitHubRepositoryStats | null;
  impactElectricity?: EnvironmentalImpactElectricityEstimate | null;
  impactWater?: EnvironmentalImpactWaterEstimate | null;
};

function MethodologyCard({
  title,
  formula,
  description,
  source,
  color,
  icon,
}: MethodologyCardProps) {
  const colorClasses: Record<
    MethodologyColor,
    { text: string; border: string; surface: string; dot: string }
  > = {
    red: {
      text: "text-red-400",
      border: "border-red-400/20",
      surface: "bg-red-400/5",
      dot: "bg-red-400",
    },
    slate: {
      text: "text-slate-400",
      border: "border-slate-400/20",
      surface: "bg-slate-400/5",
      dot: "bg-slate-400",
    },
  };

  const tone = colorClasses[color];

  return (
    <div className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 space-y-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.07]">
      <div className={cn("relative z-10 flex items-center gap-5", tone.text)}>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-110",
            tone.surface,
          )}
        >
          {icon}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div
        className={cn(
          "relative z-10 rounded-[2rem] border-l-4 bg-black/20 p-8 font-mono text-sm shadow-inner",
          tone.border,
        )}
      >
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
          Formule du proxy
        </div>
        <div className="text-red-100/80 leading-relaxed">{formula}</div>
      </div>

      <p className="relative z-10 leading-relaxed text-red-100/40 font-medium">
        {description}
      </p>

      <div className="relative z-10 flex items-center gap-3 pt-6">
        <div className={cn("h-2 w-2 rounded-full", tone.dot)} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
          Source : {source}
        </span>
      </div>
    </div>
  );
}

const IMPACT_DOC: OpenSourceDoc = {
  id: "impact",
  title: {
    fr: "Calcul des indicateurs d’impact",
    en: "Impact indicator calculations",
  },
  desc: {
    fr: "Formules runtime, distinction entre valeurs déclarées et estimées, sources configurées et limites des proxys utilisés.",
    en: "Runtime formulas, the distinction between declared and estimated values, configured sources, and the limits of the proxies used.",
  },
  href: "/docs/plans/rapport_impact/impact_IA.md",
  icon: <Scaling className="h-6 w-6" />,
  isPdf: false,
};

const QUOTA_SERVICES_DOC: OpenSourceDoc = {
  id: "quota-free-services",
  title: {
    fr: "Impact numérique des services suivis",
    en: "Digital impact of tracked services",
  },
  desc: {
    fr: "Services d’infrastructure suivis, limites de plan et estimation d’impact associée.",
    en: "Tracked infrastructure services, plan limits, and the associated impact estimate.",
  },
  href: "/docs/plans/journal_impact_DU.md",
  icon: <Sparkles className="h-6 w-6" />,
  isPdf: false,
  secondaryAction: {
    href: "#impact-services",
    label: {
      fr: "Voir le bloc",
      en: "View block",
    },
  },
};

const ACTION_MAP_DOC: OpenSourceDoc = {
  id: "action-map-methodology",
  title: {
    fr: "Méthodologie de la carte d'actions",
    en: "Action map methodology",
  },
  desc: {
    fr: "Distinction entre mémoire des actions, pollution constatée, pollution projetée et signalements Trash Spotter observés.",
    en: "Distinction between action history, observed pollution, projected pollution, and observed Trash Spotter reports.",
  },
  href: "/docs/product/methodologie-carte-actions.md",
  icon: <MapPin className="h-6 w-6" />,
  isPdf: false,
  secondaryAction: {
    href: "#methodologie-carte-actions",
    label: {
      fr: "Voir la section sur cette page",
      en: "View this page section",
    },
  },
};

export function ActionMapMethodologySection({ isFrench }: { isFrench: boolean }) {
  return (
    <ActionMapMethodologySectionImpl
      isFrench={isFrench}
      actionMapDoc={ACTION_MAP_DOC}
    />
  );
}

export function MethodologiePageClient({
  freePlanServices,
  impactTotals,
  impactSnapshots,
  impactGeneratedAt,
  impactLaunchedAt,
  githubStats,
  impactElectricity,
  impactWater,
}: MethodologiePageClientProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const methodology = buildActionImpactMethodology();
  const { sources, version } = methodology;
  const { t } = useTranslation("methodologie");
  const classes = getBlockClasses("impact");
  const electricity =
    impactElectricity ?? buildElectricityEstimate({ monthlyElectricityKwh: null }, null);
  const water =
    impactWater ??
    buildWaterEstimate({
      monthlyElectricityKwh: null,
      monthlyDirectWaterConsumptionLiters: null,
      monthlyEvaporatedWaterLiters: null,
    });

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 isolate overflow-x-clip bg-[linear-gradient(180deg,rgba(255,244,246,0.98)_0%,rgba(255,251,252,0.92)_28%,rgba(15,23,42,1)_100%)] pb-20 pt-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.26)_0%,rgba(251,113,133,0.12)_24%,rgba(255,255,255,0.88)_52%,rgba(15,23,42,0.98)_100%)]"
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col space-y-16 px-4 sm:px-6 lg:px-8">
        <PageHeader
          align="center"
          tone="red"
          contrast="inverse"
          title={
            <span className="inline-flex items-center gap-3">
              <Beaker size={24} aria-hidden="true" />
              <span>{t("header_title")}</span>
            </span>
          }
          subtitle={t("header_desc")}
        />

        <ActionMapMethodologySection isFrench={isFrench} />

        <section
          id="modes-affichage"
          aria-labelledby="modes-affichage-title"
          className="scroll-mt-28 space-y-6 rounded-[2.5rem] border border-white/10 bg-slate-950/75 p-6 text-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.9)] sm:p-8 lg:p-10"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-300/25 bg-red-400/10 text-red-300">
              <Info className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/65">
                {isFrench ? "Présentation" : "Presentation"}
              </p>
              <h2 id="modes-affichage-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {isFrench ? "Modes d’affichage" : "Display modes"}
              </h2>
            </div>
          </div>

          <p className="max-w-4xl text-sm font-medium leading-relaxed text-red-100/75 sm:text-base">
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
              <article
                key={mode}
                className="rounded-2xl border border-white/12 bg-white/[0.04] p-5"
              >
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {DISPLAY_MODE_DESCRIPTIONS[mode][locale]}
                </p>
              </article>
            ))}
          </div>

          <p className="rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm font-semibold leading-relaxed text-white">
            {isFrench
              ? "Le mode change la présentation, jamais les fonctionnalités, permissions ou données."
              : "The mode changes presentation, never features, permissions or data."}
          </p>
        </section>

        <div
          className={cn(
            "relative overflow-hidden rounded-[3rem] border p-10 transition-all duration-700 md:p-16",
            classes.surface,
            classes.shadow,
          )}
        >
          <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-5">
            <ShieldCheck size={400} className="text-red-400" />
          </div>

          <div className="relative z-10 grid items-center gap-16 md:grid-cols-2">
            <div className="space-y-8">
              <h2 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <Brain className="text-red-400" />
                <span>Méthode de calcul</span>
              </h2>
              <p className="max-w-md text-lg font-medium leading-relaxed text-red-100/40">
                Les KPI terrain utilisent le calcul runtime versionné. Les valeurs déclarées et estimées sont distinguées avant l’application des proxys à la masse ou aux mégots retenus. Périmètre : {methodology.scope}
              </p>
              <div className="flex gap-4">
                <div className="rounded-xl bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400/60">
                  Version {version}
                </div>
                <div className="rounded-xl bg-red-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/20">
                  Proxy versionné
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: isFrench ? "Version" : "Version", val: version, icon: <BookOpen size={16} /> },
                { label: isFrench ? "Sources" : "Sources", val: "Configuration runtime", icon: <Zap size={16} /> },
                { label: isFrench ? "Périmètre" : "Scope", val: isFrench ? "Approuvé + filtres" : "Approved + filters", icon: <Scaling size={16} /> },
                { label: isFrench ? "Nature" : "Nature", val: isFrench ? "Proxys, pas mesures" : "Proxies, not measurements", icon: <Sparkles size={16} /> },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-red-400/30"
                >
                  <div className="text-red-400 transition-transform group-hover:scale-110">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      {item.label}
                    </div>
                    <div className="text-sm font-bold text-red-100">{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { icon: <MapPin className="text-red-400" />, title: "Données terrain", desc: "Coordonnées et volumes issus des déclarations" },
            { icon: <Zap className="text-red-400" />, title: "Calcul des proxys", desc: "Application des formules versionnées" },
            { icon: <ShieldCheck className="text-red-400" />, title: isFrench ? "Résultats et limites" : "Results and limits", desc: isFrench ? "Lecture des KPI et de leurs limites" : "Reading KPIs and their limits" },
          ].map((step, index) => (
            <div
              key={index}
              className="group flex flex-col items-center space-y-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center transition-all duration-500 hover:border-white/10"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 shadow-inner transition-transform duration-700 group-hover:scale-110">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-red-100/30">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-8 pt-10 border-t border-white/10">
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              {isFrench ? "Quota" : "Quota"}
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white">
              {isFrench ? "Plans et quotas" : "Plans and quotas"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "La partie quota s’appuie sur la fiche d’architecture du site et reste centrée sur le risque de dépassement des limites de plan."
                : "The quota section relies on the site architecture sheet and stays focused on the risk of exceeding plan limits."}
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <ReferenceDocCard
              doc={QUOTA_SERVICES_DOC}
              schemaLabel={{ fr: "Schéma: onglet 1", en: "Schema: tab 1" }}
              schemaHref="#quota-services"
              isFrench={isFrench}
            />

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

        <section className="grid gap-10 xl:grid-cols-2">
          <MethodologyCard
            title={t("cards.waste.title")}
            formula={methodology.formulas.wasteKg}
            description={t("cards.waste.desc")}
            source={t("cards.waste.source")}
            color="red"
            icon={<Trash2 size={24} />}
          />

          <MethodologyCard
            title={t("cards.butts.title")}
            formula={methodology.formulas.butts}
            description={t("cards.butts.desc")}
            source={t("cards.butts.source")}
            color="red"
            icon={<BookOpen size={24} />}
          />

          <MethodologyCard
            title={t("cards.volunteers.title")}
            formula={methodology.formulas.volunteers}
            description={t("cards.volunteers.desc")}
            source={t("cards.volunteers.source")}
            color="slate"
            icon={<Heart size={24} />}
          />

          <MethodologyCard
            title={t("cards.water.title")}
            formula={methodology.formulas.water}
            description={t("cards.water.desc")}
            source={t("cards.water.source", { src: sources.water })}
            color="red"
            icon={<BookOpen size={24} />}
          />

          <MethodologyCard
            title={t("cards.co2.title")}
            formula={methodology.formulas.co2e}
            description={t("cards.co2.desc")}
            source={t("cards.co2.source", { src: sources.co2 })}
            color="red"
            icon={<Scaling size={24} />}
          />

          <MethodologyCard
            title={t("cards.surface.title")}
            formula={methodology.formulas.surface}
            description={t("cards.surface.desc")}
            source={t("cards.surface.source", { src: sources.surface })}
            color="slate"
            icon={<Info size={24} />}
          />

          <MethodologyCard
            title={t("cards.map.title")}
            formula={isFrench ? "Indice cartographique = calibration terrain (hors KPI impact canonique)" : "Map index = field calibration (outside canonical impact KPIs)"}
            description={t("cards.map.desc")}
            source={t("cards.map.source")}
            color="red"
            icon={<Scaling size={24} />}
          />

          <MethodologyCard
            title={t("cards.roi.title")}
            formula={methodology.formulas.euro}
            description={t("cards.roi.desc")}
            source={t("cards.roi.source", { src: sources.roi })}
            color="slate"
            icon={<Zap size={24} />}
          />
        </section>

        {/* Limites de la déclaration terrain */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 md:p-12 space-y-6">
          <div className="flex items-center gap-4 text-red-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/5 shadow-inner">
              <Scaling size={20} />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              {isFrench ? "Limites de la déclaration terrain" : "Limits of field declarations"}
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 text-red-100/50 leading-relaxed font-medium text-sm">
            <p>
              {isFrench
                ? "Les déclarations terrain ne requièrent pas la pesée ni la caractérisation exhaustive de chaque déchet. Les valeurs disponibles dépendent donc des informations saisies dans le contrat de déclaration."
                : "Field declarations do not require weighing or exhaustively categorizing every item. Available values therefore depend on the information entered in the declaration contract."}
            </p>
            <p>
              {isFrench
                ? "Les indicateurs concernés restent des proxys versionnés : ils donnent un ordre de grandeur reproductible, mais ne constituent ni une mesure instrumentale ni une certification scientifique."
                : "The affected indicators remain versioned proxies: they provide a reproducible order of magnitude, but are neither instrument measurements nor scientific certification."}
            </p>
          </div>
        </div>

        <section className="space-y-8 pt-10 border-t border-white/10">
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              {isFrench ? "Rapport d'impact" : "Impact report"}
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white">
              {isFrench ? "Empreinte technique des services suivis" : "Technical footprint of tracked services"}
            </h2>
            <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
              {isFrench
                ? "Ce bloc mesure l'empreinte technique et infrastructurelle des services suivis. Il est séparé des KPI d'impact terrain calculés à partir des actions approuvées."
                : "This block measures the technical and infrastructure footprint of tracked services. It is separate from terrain impact KPIs calculated from approved actions."}
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <ReferenceDocCard
              doc={IMPACT_DOC}
              schemaLabel={{ fr: "Schéma: onglet 2", en: "Schema: tab 2" }}
              schemaHref="#impact-services"
              isFrench={isFrench}
            />

            <div className="space-y-8">
              <section className="rounded-[2.5rem] border border-red-400/20 bg-red-400/5 p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/60">
                  Méthode électrique
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                  CO₂e électrique : statut du calcul
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-red-100/65">
                  Facteur configuré : {electricity.factorKgCo2ePerKwh} kgCO₂e/kWh
                  ({electricity.source === "input" ? "signal électrique branché" : "référence " + electricity.note}).
                </p>
                <p className="mt-3 text-sm leading-relaxed text-red-100/55">
                  {electricity.calculation === "measured_kwh_to_co2e"
                    ? "La valeur affichée provient d'un calcul kWh × facteur électrique; elle n'est pas ajoutée une seconde fois au proxy total."
                    : electricity.calculation === "proxy_equivalent"
                      ? "La valeur affichée est un équivalent électrique estimé à partir d’un proxy CO₂e. Elle ne représente pas une consommation mesurée."
                      : "À compléter : aucun kWh réel ni proxy électrique exploitable n'est disponible."}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  Le facteur sera remplacé lorsqu’une localisation électrique réelle du fournisseur sera connue.
                </p>
              </section>
              <section className="rounded-[2.5rem] border border-red-400/20 bg-red-400/5 p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/60">
                  Méthode eau
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                  Eau estimée : composantes et limites
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-red-100/65">
                  Eau directe consommée sur site : {water.directWaterConsumptionLiters === null ? "à compléter" : "signal fourni"}. Eau indirecte liée à l’électricité : {water.indirectElectricityWaterLiters === null ? "à compléter" : "kWh × facteur configuré"}. Le facteur actuel est {water.factorLitersPerKwh} L/kWh ({water.factorSourceLabel}) et reste un proxy remplaçable lorsqu’une localisation électrique réelle est connue.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-red-100/55">
                  L’eau reste dans le cycle hydrologique global, mais l’eau évaporée est consommée localement car elle n’est plus immédiatement disponible dans le même bassin. Retrait et consommation ne sont pas interchangeables : l’eau retournée dépend du lieu, du moment, de la température et de la qualité. La pression dépend aussi du stress hydrique et des conflits locaux, pas seulement des litres.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  {water.provenance.join(" ")}
                </p>
              </section>
              <FreePlanServicesMethodologyVisual
                services={freePlanServices}
                impactTotals={impactTotals}
                githubStats={githubStats}
                isFrench={isFrench}
                displayMode="impact"
                sectionId="impact-services"
              />

              <section className="space-y-8 rounded-[2.5rem] border border-white/5 bg-white/5 p-8">
                <div className="space-y-4 text-center">
                  <h3 className="text-3xl font-black tracking-tight text-white">
                    {isFrench ? "Historique mensuel d'impact" : "Monthly impact history"}
                  </h3>
                  <p className="mx-auto max-w-3xl text-base font-medium leading-relaxed text-red-100/50">
                    {isFrench
                      ? "La courbe du bas suit l’historique persistant enregistré dans Supabase, tandis que la ligne pointillée estime l’impact du développement par IA depuis le lancement du projet. Aucun chiffre n’est inventé: les données absentes restent en NA."
                      : "The bottom curve follows the persistent history stored in Supabase, while the dashed line estimates the impact of AI development since project launch. No number is invented: missing data stays NA."}
                  </p>
                </div>

                <MonthlyImpactHistoryChart
                  snapshots={impactSnapshots}
                  launchedAt={impactLaunchedAt}
                  generatedAt={impactGeneratedAt}
                />
              </section>
            </div>
          </div>
        </section>

        <footer className="cmm-ribbon-surface flex flex-col items-center justify-between gap-10 pt-20 sm:flex-row">
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
              CleanMyMap Engine v{version}
            </p>
            <p className="max-w-md text-xs font-bold leading-relaxed text-red-100/70">
              Les formules, sources et limites sont documentées dans les références associées à cette page.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
