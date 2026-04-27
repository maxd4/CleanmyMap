import type { PilotageComparisonResult } from"@/lib/pilotage/metrics";
import { KpiComparisonGrid, type KpiCardKey } from"./kpi-comparison-grid";

type KpiWindowsPanelProps = {
 comparisonsByWindow:
 | Record<"30" |"90" |"365", PilotageComparisonResult>
 | null
 | undefined;
 title?: string;
 unavailableMessage?: string;
};

const REPORT_ORDER: KpiCardKey[] = [
"actions",
"volume",
"coverage",
"mobilization",
"quality",
"moderationDelay",
];

function reliabilityTone(level:"elevee" |"moyenne" |"faible"): string {
 if (level ==="elevee") {
 return"border-emerald-200 bg-emerald-50 text-emerald-800";
 }
 if (level ==="moyenne") {
 return"border-amber-200 bg-amber-50 text-amber-800";
 }
 return"border-rose-200 bg-rose-50 text-rose-800";
}

export function KpiWindowsPanel({
 comparisonsByWindow,
 title ="Comparatifs N vs N-1 par fenetre",
 unavailableMessage ="Donnees de comparaison temporairement indisponibles. Verifier la source pilotage.",
}: KpiWindowsPanelProps) {
 if (!comparisonsByWindow) {
 return (
 <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
 <p className="cmm-text-small text-amber-800">{unavailableMessage}</p>
 </section>
 );
 }

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
 <h2 className="text-base font-semibold cmm-text-primary">{title}</h2>
 <div className="mt-3 grid gap-3 lg:grid-cols-3">
 {(["30","90","365"] as const).map((windowKey) => {
 const windowResult = comparisonsByWindow[windowKey];
 return (
 <article
 key={windowKey}
 className="rounded-xl border border-slate-200 bg-slate-50 p-3"
 >
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 {windowKey ==="365" ?"12 mois" : `${windowKey} jours`}
 </p>
 <span
 className={`rounded-full border px-2 py-0.5 cmm-text-caption font-semibold uppercase ${reliabilityTone(windowResult.current.reliability.level)}`}
 >
 Fiabilite {windowResult.current.reliability.level}
 </span>
 </div>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {windowResult.current.reliability.reason} | completude{""}
 {windowResult.current.reliability.completeness.toFixed(1)},
 geoloc {windowResult.current.reliability.geoloc.toFixed(1)},
 fraicheur {windowResult.current.reliability.freshness.toFixed(1)}
 .
 </p>
 <KpiComparisonGrid
 comparison={windowResult}
 className="mt-2 grid gap-2"
 order={REPORT_ORDER}
 labels={{
 actions:"Actions",
 volume:"Volume",
 coverage:"Couverture",
 }}
 />
 </article>
 );
 })}
 </div>
 </section>
 );
}
