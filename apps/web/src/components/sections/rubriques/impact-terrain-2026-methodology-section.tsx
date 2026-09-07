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
}: {
  method: ImpactTerrain2026KpiMethod;
  isFrench: boolean;
}) {
  const Icon = KPI_ICONS[method.key];

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
}: {
  isFrench: boolean;
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
          <KpiMethodBlock key={method.key} method={method} isFrench={isFrench} />
        ))}
      </div>
    </section>
  );
}
