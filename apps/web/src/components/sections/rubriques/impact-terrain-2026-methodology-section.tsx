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
    <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
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
      className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.9)] sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-300/25 bg-red-400/10 text-red-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-red-200/65">
            {isFrench ? "KPI Impact terrain 2026" : "Impact terrain 2026 KPI"}
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            {localize(method.label, isFrench)}
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            {isFrench ? "Donnée terrain mesurée ou déclarée" : "Measured or declared field data"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {localize(method.semantics.terrainData, isFrench)}
          </p>
        </div>

        {method.key === "volunteers" && (
          <div className="space-y-4 rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Participants et répartition des actions" : "Participants and action distribution"}
            </h4>
            {results ? (
              <p className="text-sm text-slate-200">
                <span className="mr-2 text-slate-400">{isFrench ? "participants déclarés" : "reported participants"}</span>
                <strong>{results.participantsTotal.toLocaleString("fr-FR")}</strong>
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-slate-400">
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
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Résultat public chargé" : "Loaded public result"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">kg</span>
                  <strong>{terrainResults.wasteKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong>
                </p>
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "équivalence" : "equivalent"}</span>
                  <strong>{terrainResults.wasteBagsEquivalent.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {isFrench ? "sacs de 50 L" : "50 L bags"}</strong>
                </p>
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "équivalence" : "equivalent"}</span>
                  <strong>{terrainResults.wasteMechanicalBicyclesEquivalent.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {isFrench ? "Vélib' mécaniques" : "mechanical Vélib'"}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {isFrench
                  ? "Le résultat public n’est pas disponible dans cette génération de la page ; les formules restent documentées ci-dessous."
                  : "The public result is unavailable in this page generation; the formulas remain documented below."}
              </p>
            )}
          </div>
        )}

        {method.key === "butts" && (
          <div className="space-y-4 rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Résultats publics et qualification" : "Public results and qualification"}
            </h4>
            {terrainResults ? (
              <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "mégots déclarés" : "reported butts"}</span>
                  <strong>{terrainResults.buttsTotal.toLocaleString("fr-FR")}</strong>
                </p>
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "masse estimée" : "estimated mass"}</span>
                  <strong>
                    {terrainResults.estimatedButtsWeightKg === null
                      ? isFrench
                        ? "non calculable (état absent)"
                        : "not calculable (missing condition)"
                      : `${terrainResults.estimatedButtsWeightKg.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`}
                  </strong>
                </p>
                <p>
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "distance pédagogique" : "pedagogical distance"}</span>
                  <strong>{terrainResults.buttsDistanceMeters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m</strong>
                </p>
              </div>
            ) : null}
            <ImpactTerrain2026ButtsPieChart results={terrainResults} isFrench={isFrench} />
          </div>
        )}

        {method.key === "co2" && (
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Résultat proxy et conversions" : "Proxy result and conversions"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">CO₂e</span><strong>{terrainResults.co2eKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "km voiture" : "car km"}</span><strong>{terrainResults.co2CarKilometers.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "part Paris–Moscou voiture" : "Paris–Moscow car-trip share"}</span><strong>{terrainResults.co2ParisMoscowCarTrips.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "part de vol Paris–New York" : "Paris–New York flight share"}</span><strong>{terrainResults.co2ParisNewYorkFlightShares.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
              </div>
            ) : null}
          </div>
        )}

        {method.key === "water" && (
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Résultat proxy et conversions" : "Proxy result and conversions"}
            </h4>
            {terrainResults ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "litres potentiels" : "potential liters"}</span><strong>{terrainResults.waterLiters.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "piscines olympiques" : "Olympic pools"}</span><strong>{terrainResults.waterOlympicPools.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "années de consommation" : "consumption years"}</span><strong>{terrainResults.waterFrenchPersonYears.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</strong></p>
              </div>
            ) : null}
          </div>
        )}

        {method.key === "euro" && (
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              {isFrench ? "Deux estimations et fourchette" : "Two estimates and range"}
            </h4>
            {results?.streetCleaningSavings ? (
              <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "estimation par la masse" : "waste-mass estimate"}</span><strong>{results.streetCleaningSavings.massEstimateEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
                <p><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "estimation par le temps" : "action-time estimate"}</span><strong>{results.streetCleaningSavings.timeEstimateEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
                <p className="sm:col-span-2"><span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400">{isFrench ? "fourchette" : "range"}</span><strong>{results.streetCleaningSavings.lowerBoundEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}–{results.streetCleaningSavings.upperBoundEuros.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</strong></p>
              </div>
            ) : null}
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            {isFrench ? "Agrégat" : "Aggregate"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {localize(method.semantics.aggregation, isFrench)}
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            {isFrench ? "Résultat ou proxy calculé" : "Calculated result or proxy"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {localize(method.semantics.result, isFrench)}
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            {isFrench ? "Conversions pédagogiques" : "Pedagogical conversions"}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {localize(method.semantics.pedagogicalConversion, isFrench)}
          </p>
        </div>

        <div className="rounded-2xl border border-red-300/20 bg-black/20 p-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            {isFrench ? "Formule runtime" : "Runtime formula"}
          </h4>
          <code className="mt-2 block whitespace-pre-wrap text-xs leading-relaxed text-red-100/85">
            {localize(method.formula, isFrench)}
          </code>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
              {isFrench ? "Hypothèses / références" : "Assumptions / references"}
            </h4>
            <div className="mt-2 space-y-3">
              <MethodList values={method.assumptions} isFrench={isFrench} />
              <MethodList values={method.references} isFrench={isFrench} />
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
              {isFrench ? "Limites" : "Limits"}
            </h4>
            <div className="mt-2 rounded-2xl border border-amber-200/15 bg-amber-300/5 p-3">
              <MethodList values={method.limits} isFrench={isFrench} />
            </div>
          </div>
        </div>
      </div>
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
      className="scroll-mt-28 space-y-8 rounded-[2.5rem] border border-white/10 bg-slate-950/80 p-6 text-white shadow-[0_28px_70px_-44px_rgba(15,23,42,0.95)] sm:p-8 lg:p-10"
    >
      <div className="max-w-4xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-300/25 bg-red-400/10 text-red-200">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200/65">
              {isFrench ? "Socle canonique" : "Canonical foundation"}
            </p>
            <h2 id="indicateurs-impact-terrain-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {isFrench ? "Les 6 KPI Impact terrain 2026" : "The 6 Impact terrain 2026 KPIs"}
            </h2>
          </div>
        </div>

        <p className="text-sm font-medium leading-relaxed text-red-100/75 sm:text-base">
          {isFrench
            ? "Cette section décrit le contrat commun des six indicateurs affichés sur les surfaces Impact terrain. Elle sépare explicitement la donnée terrain, son agrégation, le proxy éventuel, les conversions pédagogiques et les limites. Les valeurs dynamiques restent produites par le runtime ; cette page n’est pas une source de calcul."
            : "This section describes the shared contract of the six indicators shown on Impact terrain surfaces. It explicitly separates field data, aggregation, any proxy, pedagogical conversions, and limits. Dynamic values remain runtime-produced; this page is not a calculation source."}
        </p>

        <div className="flex flex-wrap gap-2" aria-label={isFrench ? "Couches sémantiques" : "Semantic layers"}>
          {methodology.semanticLayers.map((layer) => (
            <span
              key={localize(layer, isFrench)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-100/75"
            >
              {localize(layer, isFrench)}
            </span>
          ))}
        </div>

        <p className="text-xs font-medium text-slate-400">
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
