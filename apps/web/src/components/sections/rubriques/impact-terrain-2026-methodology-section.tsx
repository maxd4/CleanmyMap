import {
  Cloud,
  Droplets,
  Euro,
  Leaf,
  type LucideIcon,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  buildImpactTerrain2026Methodology,
  type ImpactTerrain2026KpiMethod,
  type ImpactTerrain2026LocalizedText,
} from "@/lib/impact/impact-terrain-2026";
import type { PublicLandingActionAggregation } from "@/lib/accueil/action-participant-aggregation";
import { ImpactTerrain2026ButtsPieChart } from "./impact-terrain-2026-butts-pie-chart";
import { ImpactTerrain2026ParticipantsPieChart } from "./impact-terrain-2026-participants-pie-chart";

const KPI_ICONS: Record<ImpactTerrain2026KpiMethod["key"], LucideIcon> = {
  wasteKg: Trash2,
  butts: Leaf,
  volunteers: UsersRound,
  co2: Cloud,
  water: Droplets,
  euro: Euro,
};

function localize(value: ImpactTerrain2026LocalizedText, isFrench: boolean) {
  return isFrench ? value.fr : value.en;
}

function MethodList({
  values,
  isFrench,
}: {
  values: readonly ImpactTerrain2026LocalizedText[];
  isFrench: boolean;
}) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed cmm-text-body">
      {values.map((value) => (
        <li key={localize(value, isFrench)} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
          <span>{localize(value, isFrench)}</span>
        </li>
      ))}
    </ul>
  );
}

function KpiMethodBlock({
  method,
  isFrench,
  results,
}: {
  method: ImpactTerrain2026KpiMethod;
  isFrench: boolean;
  results: PublicLandingActionAggregation | null;
}) {
  const Icon = KPI_ICONS[method.key];
  const terrainResults = results?.impactTerrain ?? null;

  return (
    <article
      id={`indicateur-impact-${method.key}`}
      className="rounded-2xl border border-rose-100 bg-white p-5 shadow-[0_16px_38px_-30px_rgba(190,24,93,0.22)] sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-rose-700">
            {isFrench ? "KPI Impact terrain 2026" : "Impact terrain 2026 KPI"}
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {localize(method.label, isFrench)}
          </h3>
        </div>
      </div>

      <details open={method.key === "wasteKg"} className="group mt-5">
        <summary className="cursor-pointer list-inside rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-rose-800 transition hover:bg-rose-100">
          {isFrench ? "Afficher la formule, les hypothèses et les limites" : "Show formula, assumptions and limits"}
        </summary>
        <div className="mt-5 space-y-5">
        <div>
          <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
            {isFrench ? "Donnée terrain mesurée ou déclarée" : "Measured or declared field data"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed cmm-text-body">
            {localize(method.semantics.terrainData, isFrench)}
          </p>
        </div>

        {method.key === "volunteers" && (
          <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Participants et répartition des actions" : "Participants and action distribution"}
            </h4>
            {results ? (
              <p className="text-sm text-slate-800">
                <span className="mr-2 cmm-text-small">{isFrench ? "participants déclarés" : "reported participants"}</span>
                <strong>{results.participantsTotal.toLocaleString("fr-FR")}</strong>
              </p>
            ) : (
              <p className="text-xs leading-relaxed cmm-text-small">
                {isFrench ? "Le résultat public n’est pas disponible dans cette génération de la page." : "The public result is unavailable in this page generation."}
              </p>
            )}
            <ImpactTerrain2026ParticipantsPieChart
              distribution={results?.actionDistribution ?? []}
              participantsTotal={results?.participantsTotal ?? 0}
              isFrench={isFrench}
            />
          </div>
        )}

        {method.key === "wasteKg" && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Résultat public chargé" : "Loaded public result"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-800 sm:grid-cols-3">
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">kg</span>
                  <strong>{terrainResults.wasteKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong>
                </p>
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "équivalence" : "equivalent"}</span>
                  <strong>{terrainResults.wasteBagsEquivalent.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {isFrench ? "sacs de 50 L" : "50 L bags"}</strong>
                </p>
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "équivalence" : "equivalent"}</span>
                  <strong>{terrainResults.wasteMechanicalBicyclesEquivalent.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {isFrench ? "Vélib' mécaniques" : "mechanical Vélib'"}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed cmm-text-small">
                {isFrench
                  ? "Le résultat public n’est pas disponible dans cette génération de la page ; les formules restent documentées ci-dessous."
                  : "The public result is unavailable in this page generation; the formulas remain documented below."}
              </p>
            )}
          </div>
        )}

        {method.key === "butts" && (
          <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Résultats publics et qualification" : "Public results and qualification"}
            </h4>
            {terrainResults ? (
              <div className="grid gap-3 text-sm text-slate-800 sm:grid-cols-3">
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "mégots déclarés" : "reported butts"}</span>
                  <strong>{terrainResults.buttsTotal.toLocaleString("fr-FR")}</strong>
                </p>
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "masse estimée" : "estimated mass"}</span>
                  <strong>
                    {terrainResults.estimatedButtsWeightKg === null
                      ? isFrench
                        ? "non calculable (état absent)"
                        : "not calculable (missing condition)"
                      : `${terrainResults.estimatedButtsWeightKg.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`}
                  </strong>
                </p>
                <p>
                  <span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "distance pédagogique" : "pedagogical distance"}</span>
                  <strong>{terrainResults.buttsDistanceMeters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m</strong>
                </p>
              </div>
            ) : null}
            <ImpactTerrain2026ButtsPieChart results={terrainResults} isFrench={isFrench} />
          </div>
        )}

        {method.key === "co2" && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Résultat proxy et conversions" : "Proxy result and conversions"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">CO₂e</span><strong>{terrainResults.co2eKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "km voiture" : "car km"}</span><strong>{terrainResults.co2CarKilometers.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "part Paris–Moscou voiture" : "Paris–Moscow car-trip share"}</span><strong>{terrainResults.co2ParisMoscowCarTrips.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "part de vol Paris–New York" : "Paris–New York flight share"}</span><strong>{terrainResults.co2ParisNewYorkFlightShares.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
              </div>
            ) : null}
          </div>
        )}

        {method.key === "water" && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Résultat proxy et conversions" : "Proxy result and conversions"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-800 sm:grid-cols-3">
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "litres potentiels" : "potential liters"}</span><strong>{terrainResults.waterLiters.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "piscines olympiques" : "Olympic pools"}</span><strong>{terrainResults.waterOlympicPools.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "années de consommation" : "consumption years"}</span><strong>{terrainResults.waterFrenchPersonYears.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
              </div>
            ) : null}
          </div>
        )}

        {method.key === "euro" && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/55 p-4">
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Deux estimations et fourchette" : "Two estimates and range"}
            </h4>
            {results?.streetCleaningSavings ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "estimation par la masse" : "waste-mass estimate"}</span><strong>{results.streetCleaningSavings.massEstimateEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
                <p><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "estimation par le temps" : "action-time estimate"}</span><strong>{results.streetCleaningSavings.timeEstimateEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
                <p className="sm:col-span-2"><span className="block cmm-text-caption uppercase tracking-[0.15em] cmm-text-small">{isFrench ? "fourchette" : "range"}</span><strong>{results.streetCleaningSavings.lowerBoundEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}–{results.streetCleaningSavings.upperBoundEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
              </div>
            ) : null}
          </div>
        )}

        <div>
          <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
            {isFrench ? "Agrégat" : "Aggregate"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed cmm-text-body">
            {localize(method.semantics.aggregation, isFrench)}
          </p>
        </div>

        <div>
          <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
            {isFrench ? "Résultat ou proxy calculé" : "Calculated result or proxy"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed cmm-text-body">
            {localize(method.semantics.result, isFrench)}
          </p>
        </div>

        <div>
          <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
            {isFrench ? "Conversions pédagogiques" : "Pedagogical conversions"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed cmm-text-body">
            {localize(method.semantics.pedagogicalConversion, isFrench)}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
            {isFrench ? "Formule runtime" : "Runtime formula"}
          </h4>
          <code className="mt-2 block whitespace-pre-wrap text-xs leading-relaxed text-rose-950">
            {localize(method.formula, isFrench)}
          </code>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Hypothèses / références" : "Assumptions / references"}
            </h4>
            <div className="mt-2 space-y-3">
              <MethodList values={method.assumptions} isFrench={isFrench} />
              <MethodList values={method.references} isFrench={isFrench} />
            </div>
          </div>
          <div>
            <h4 className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Limites" : "Limits"}
            </h4>
            <div className="mt-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
              <MethodList values={method.limits} isFrench={isFrench} />
            </div>
          </div>
        </div>
        </div>
      </details>
    </article>
  );
}

export function ImpactTerrain2026MethodologySection({
  isFrench,
  results = null,
}: {
  isFrench: boolean;
  results?: PublicLandingActionAggregation | null;
}) {
  const methodology = buildImpactTerrain2026Methodology();

  return (
    <section
      id="indicateurs-impact-terrain"
      aria-labelledby="indicateurs-impact-terrain-title"
      className="scroll-mt-28 space-y-8 rounded-[2rem] border border-rose-100 bg-rose-50/35 p-6 text-slate-950 shadow-[0_20px_52px_-38px_rgba(190,24,93,0.28)] sm:p-8 lg:p-10"
    >
      <div className="max-w-4xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-rose-700">
              {isFrench ? "Socle canonique" : "Canonical foundation"}
            </p>
            <h2 id="indicateurs-impact-terrain-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {isFrench ? "Les 6 KPI Impact terrain 2026" : "The 6 Impact terrain 2026 KPIs"}
            </h2>
          </div>
        </div>

        <p className="text-sm font-medium leading-relaxed cmm-text-body sm:text-base">
          {isFrench
            ? "Cette section décrit le contrat commun des six indicateurs affichés sur les surfaces Impact terrain. Elle sépare explicitement la donnée terrain, son agrégation, le proxy éventuel, les conversions pédagogiques et les limites. Les valeurs dynamiques restent produites par le runtime ; cette page n’est pas une source de calcul."
            : "This section describes the shared contract of the six indicators shown on Impact terrain surfaces. It explicitly separates field data, aggregation, any proxy, pedagogical conversions, and limits. Dynamic values remain runtime-produced; this page is not a calculation source."}
        </p>

        <div className="flex flex-wrap gap-2" aria-label={isFrench ? "Couches sémantiques" : "Semantic layers"}>
          {methodology.semanticLayers.map((layer) => (
            <span
              key={localize(layer, isFrench)}
              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.12em] text-rose-800"
            >
              {localize(layer, isFrench)}
            </span>
          ))}
        </div>

        <p className="text-xs font-medium cmm-text-small">
          {isFrench ? "Périmètre :" : "Scope:"} {localize(methodology.scope, isFrench)}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {methodology.kpis.map((method) => (
          <KpiMethodBlock
            key={method.key}
            method={method}
            isFrench={isFrench}
            results={results}
          />
        ))}
      </div>
    </section>
  );
}
