import { Droplets, ExternalLink, Leaf, Ruler, ShieldCheck } from "lucide-react";
import { SectionLabel } from "./gamification-shell";
import {
  GamificationPanelSkeleton,
  GamificationPanelShell,
  type GamificationPanelProps,
} from "./gamification-panel-state";

function formatMetric(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

type Progression = NonNullable<GamificationPanelProps["progression"]>;

function ImpactMetricCards({
  impact,
  fr,
}: {
  impact: Progression["impact"];
  fr: boolean;
}) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <article className="rounded-[1.65rem] border border-[#cfe7e0] bg-[#f5fbf9] p-5">
        <Droplets className="text-[#287d73]" size={21} aria-hidden="true" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#287d73]">{fr ? "Eau préservée — proxy" : "Water preserved — proxy"}</p>
        <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#214d48]">{formatMetric(impact.waterSavedLiters, 0)} L</p>
      </article>
      <article className="rounded-[1.65rem] border border-[#ead8d2] bg-[#fff8f6] p-5">
        <Leaf className="text-[#c51f1f]" size={21} aria-hidden="true" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#b53a33]">{fr ? "CO₂e évité — proxy" : "CO₂e avoided — proxy"}</p>
        <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#6f2924]">{formatMetric(impact.co2AvoidedKg)} kg</p>
      </article>
      <article className="rounded-[1.65rem] border border-[#eadfd9] bg-white p-5">
        <Ruler className="text-[#8b5d3f]" size={21} aria-hidden="true" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#8b5d3f]">{fr ? "Surface estimée — proxy" : "Estimated surface — proxy"}</p>
        <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#4a3023]">{formatMetric(impact.surfaceCleanedM2)} m²</p>
      </article>
    </div>
  );
}

function ImpactCoverage({ impact, fr }: { impact: Progression["impact"]; fr: boolean }) {
  const hasCoverage = typeof impact.wasteCoverageRate === "number" && Number.isFinite(impact.wasteCoverageRate);

  return (
    <div className="rounded-[1.5rem] border border-[#f0e0dc] bg-[#fffaf9] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b7069]">{fr ? "Couverture des données de masse" : "Mass data coverage"}</p>
      {hasCoverage ? (
        <p className="mt-2 text-sm font-semibold text-[#5e4842]">
          {formatMetric(impact.wasteCoverageRate ?? 0)} % {fr ? "des actions ont une masse renseignée" : "of actions have a recorded mass"}
          {typeof impact.wasteKnownActions === "number" ? ` · ${impact.wasteKnownActions} ${fr ? "action(s)" : "action(s)"}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-[#8c716b]">NA — {fr ? "couverture indisponible" : "coverage unavailable"}</p>
      )}
    </div>
  );
}

function ImpactMethodologyNotice({ progression, fr }: { progression: Progression; fr: boolean }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-[#f0dfd9] bg-[#fffdfc] p-4 text-sm leading-6 text-[#6e5550]">
      <ShieldCheck className="mt-0.5 shrink-0 text-[#c51f1f]" size={18} aria-hidden="true" />
      <div>
        <p>{fr ? "Estimations calculées à partir des données terrain et des hypothèses documentées." : "Estimates calculated from field data and documented assumptions."}</p>
        <p className="mt-1 text-xs text-[#8c716b]">
          {progression.impactMethodology.proxyVersion} · {progression.impactMethodology.scope}
        </p>
      </div>
    </div>
  );
}

function ImpactContent({ progression, fr }: { progression: Progression; fr: boolean }) {
  const { impact } = progression;

  return (
    <GamificationPanelShell>
      <SectionLabel
        icon={Leaf}
        title={fr ? "Impact personnel" : "Personal impact"}
        subtitle={fr
          ? "Des repères individuels calculés à partir des données terrain disponibles ; ils ne constituent pas une jauge XP."
          : "Personal indicators calculated from available field data; they are not an XP gauge."}
      />
      <ImpactMetricCards impact={impact} fr={fr} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <ImpactCoverage impact={impact} fr={fr} />
        <a
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#efc7c1] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#b53a33] transition-colors hover:bg-[#fff3f0] focus:outline-none focus:ring-2 focus:ring-[#c51f1f] focus:ring-offset-2"
          href="/methodologie#indicateurs-impact-terrain"
        >
          {fr ? "Voir la méthodologie" : "View methodology"}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      <ImpactMethodologyNotice progression={progression} fr={fr} />
    </GamificationPanelShell>
  );
}

export function GamificationImpactPanel({
  progression,
  loading,
  error,
  locale,
}: GamificationPanelProps) {
  const fr = locale === "fr";

  if (loading) {
    return <GamificationPanelSkeleton ariaLabel={fr ? "Chargement de l'impact personnel" : "Loading personal impact"} blocks={3} />;
  }

  if (error || !progression) {
    return (
      <GamificationPanelShell>
        <SectionLabel
          icon={Leaf}
          title={fr ? "Impact personnel" : "Personal impact"}
          subtitle={fr ? "Les indicateurs personnels sont temporairement indisponibles." : "Personal indicators are temporarily unavailable."}
        />
      </GamificationPanelShell>
    );
  }

  return <ImpactContent progression={progression} fr={fr} />;
}
