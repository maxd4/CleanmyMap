import type {
  EnvironmentalImpactElectricityEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
  EnvironmentalImpactWaterEstimate,
} from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { FreePlanServicesMethodologyVisual } from "./free-plan-services-methodology-visual";
import { MonthlyImpactHistoryChart } from "./monthly-impact-history-chart";
import { ReferenceDocCard, type OpenSourceDoc } from "./action-map-methodology-section";

type Props = {
  electricity: EnvironmentalImpactElectricityEstimate;
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  githubStats: GitHubRepositoryStats | null;
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  impactSnapshots: EnvironmentalImpactSnapshotRecord[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  impactDoc: OpenSourceDoc;
  isFrench: boolean;
  water: EnvironmentalImpactWaterEstimate;
};

export function MethodologieTechnicalImpactSection({
  electricity,
  freePlanServices,
  githubStats,
  impactDoc,
  impactGeneratedAt,
  impactLaunchedAt,
  impactSnapshots,
  impactTotals,
  isFrench,
  water,
}: Props) {
  return (
    <section className="space-y-8 border-t border-rose-100 pt-10">
      <div className="space-y-4 text-center">
        <p className="cmm-text-caption font-black uppercase tracking-[0.4em] text-rose-700">{isFrench ? "Rapport d'impact" : "Impact report"}</p>
        <h2 className="text-4xl font-black tracking-tight text-slate-950">{isFrench ? "Empreinte technique des services suivis" : "Technical footprint of tracked services"}</h2>
        <p className="cmm-text-body mx-auto max-w-3xl font-medium">{isFrench ? "Ce bloc mesure l'empreinte technique et infrastructurelle des services suivis. Il est séparé des KPI d'impact terrain calculés à partir des actions approuvées." : "This block measures the technical and infrastructure footprint of tracked services. It is separate from terrain impact KPIs calculated from approved actions."}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ReferenceDocCard doc={impactDoc} schemaLabel={{ fr: "Schéma: onglet 2", en: "Schema: tab 2" }} schemaHref="#impact-services" isFrench={isFrench} />
        <div className="space-y-8">
          <section className="rounded-2xl border border-rose-200 bg-rose-50/65 p-6">
            <p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-rose-700">Méthode électrique</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">CO₂e électrique : statut du calcul</h3>
            <p className="cmm-text-body mt-3">Facteur configuré : {electricity.factorKgCo2ePerKwh} kgCO₂e/kWh ({electricity.source === "input" ? "signal électrique branché" : "référence " + electricity.note}).</p>
            <p className="cmm-text-body mt-3">{electricity.calculation === "measured_kwh_to_co2e" ? "La valeur affichée provient d'un calcul kWh × facteur électrique; elle n'est pas ajoutée une seconde fois au proxy total." : electricity.calculation === "proxy_equivalent" ? "La valeur affichée est un équivalent électrique estimé à partir d’un proxy CO₂e. Elle ne représente pas une consommation mesurée." : "À compléter : aucun kWh réel ni proxy électrique exploitable n'est disponible."}</p>
            <p className="cmm-text-small cmm-text-secondary mt-3">Le facteur sera remplacé lorsqu’une localisation électrique réelle du fournisseur sera connue.</p>
          </section>
          <section className="rounded-2xl border border-rose-200 bg-rose-50/65 p-6">
            <p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-rose-700">Méthode eau</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Eau estimée : composantes et limites</h3>
            <p className="cmm-text-body mt-3">Eau directe consommée sur site : {water.directWaterConsumptionLiters === null ? "à compléter" : "signal fourni"}. Eau indirecte liée à l’électricité : {water.indirectElectricityWaterLiters === null ? "à compléter" : "kWh × facteur configuré"}. Le facteur actuel est {water.factorLitersPerKwh} L/kWh ({water.factorSourceLabel}) et reste un proxy remplaçable lorsqu’une localisation électrique réelle est connue.</p>
            <p className="cmm-text-body mt-3">L’eau reste dans le cycle hydrologique global, mais l’eau évaporée est consommée localement car elle n’est plus immédiatement disponible dans le même bassin. Retrait et consommation ne sont pas interchangeables : l’eau retournée dépend du lieu, du moment, de la température et de la qualité. La pression dépend aussi du stress hydrique et des conflits locaux, pas seulement des litres.</p>
            <p className="cmm-text-small cmm-text-secondary mt-3">{water.provenance.join(" ")}</p>
          </section>
          <FreePlanServicesMethodologyVisual services={freePlanServices} impactTotals={impactTotals} githubStats={githubStats} isFrench={isFrench} displayMode="impact" sectionId="impact-services" />
          <section className="space-y-8 rounded-2xl border border-rose-100 bg-white p-6">
            <div className="space-y-4 text-center">
              <h3 className="text-3xl font-black tracking-tight text-slate-950">{isFrench ? "Historique mensuel d'impact" : "Monthly impact history"}</h3>
              <p className="cmm-text-body mx-auto max-w-3xl font-medium">{isFrench ? "La courbe du bas suit l’historique persistant enregistré dans Supabase. Aucun impact IA n’est reconstruit par mois : l’usage exact ChatGPT hors Codex et les facteurs physiques non audités restent en NA." : "The bottom curve follows the persistent history stored in Supabase. No AI impact is reconstructed per month: exact ChatGPT usage and unaudited physical factors stay NA."}</p>
            </div>
            <MonthlyImpactHistoryChart snapshots={impactSnapshots} launchedAt={impactLaunchedAt} generatedAt={impactGeneratedAt} />
          </section>
        </div>
      </div>
    </section>
  );
}
