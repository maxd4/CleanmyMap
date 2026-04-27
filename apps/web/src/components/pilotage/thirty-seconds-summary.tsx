import Link from"next/link";

type SummaryKpi = {
 label: string;
 value: string;
 previousValue: string;
 deltaAbsolute?: string;
 deltaPercent?: string;
 interpretation?:"positive" |"negative" |"neutral";
};

type ThirtySecondsSummaryProps = {
 kpis: readonly [SummaryKpi, SummaryKpi, SummaryKpi];
 alert?: {
 severity:"critical" |"high" |"medium" |"low";
 title: string;
 detail: string;
 };
 recommendedAction: { href: string; label: string };
 recommendedReason?: string;
};

function interpretationTone(value: SummaryKpi["interpretation"]): string {
 if (value ==="positive") {
 return"border-emerald-200 bg-emerald-50 text-emerald-800";
 }
 if (value ==="negative") {
 return"border-rose-200 bg-rose-50 text-rose-800";
 }
 return"border-amber-200 bg-amber-50 text-amber-800";
}

function alertTone(
 value: NonNullable<ThirtySecondsSummaryProps["alert"]>["severity"],
): string {
 if (value ==="critical") {
 return"border-rose-200 bg-rose-50 text-rose-800";
 }
 if (value ==="high") {
 return"border-amber-200 bg-amber-50 text-amber-800";
 }
 if (value ==="medium") {
 return"border-slate-300 bg-slate-50 cmm-text-primary";
 }
 return"border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function ThirtySecondsSummary({
 kpis,
 alert,
 recommendedAction,
 recommendedReason,
}: ThirtySecondsSummaryProps) {
 return (
 <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm [data-display-mode='sobre']_&:bg-white [data-display-mode='sobre']_&:border-slate-300 [data-display-mode='sobre']_&:p-4">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-800 [data-display-mode='sobre']_&:cmm-text-muted">
 Résumé décisionnel
 </p>
 <div className="mt-3 grid gap-3 md:grid-cols-3">
 {kpis.map((kpi) => (
 <article
 key={kpi.label}
 className="rounded-xl border border-emerald-200 bg-white px-4 py-3 [data-display-mode='sobre']_&:border-slate-200 [data-display-mode='sobre']_&:p-3"
 >
 <div className="flex items-center justify-between">
 <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
 {kpi.label}
 </p>
 <Link 
 href="/methodologie" 
 className="cmm-text-caption font-bold text-emerald-600 hover:text-emerald-700 exhaustive-only"
 title="Consulter la méthodologie scientifique"
 >
 ⓘ INFO
 </Link>
 </div>
 <p className="mt-1 text-2xl font-bold cmm-text-primary tracking-tight">
 {kpi.value}
 </p>
 <p className="mt-0.5 cmm-text-caption font-bold cmm-text-muted uppercase">
 N-1: {kpi.previousValue}
 </p>
 <div
 className={`mt-2 rounded-lg border-l-4 px-3 py-1.5 cmm-text-caption font-bold exhaustive-only ${interpretationTone(kpi.interpretation)} [data-display-mode='sobre']_&:bg-transparent [data-display-mode='sobre']_&:border-l-slate-400 [data-display-mode='sobre']_&:px-2`}
 >
 <div className="flex justify-between">
 <span>Delta abs:</span> 
 <span className="cmm-text-primary">{kpi.deltaAbsolute ??"n/a"}</span>
 </div>
 <div className="flex justify-between">
 <span>Delta %:</span>
 <span className="cmm-text-primary">{kpi.deltaPercent ??"n/a"}</span>
 </div>
 </div>
 </article>
 ))}
 </div>
 {alert ? (
 <div
 className={`mt-4 rounded-xl border-l-[6px] px-5 py-4 ${alertTone(alert.severity)} [data-display-mode='sobre']_&:bg-slate-50 [data-display-mode='sobre']_&:border-l-slate-800`}
 >
 <p className="cmm-text-caption font-bold uppercase tracking-widest opacity-80">
 Alerte prioritaire
 </p>
 <p className="mt-1 cmm-text-small font-bold">{alert.title}</p>
 <p className="mt-1 cmm-text-caption exhaustive-only opacity-90 leading-relaxed">{alert.detail}</p>
 </div>
 ) : null}
 <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-white px-5 py-4 [data-display-mode='sobre']_&:border-slate-200 [data-display-mode='sobre']_&:p-3">
 <div className="flex items-center gap-3">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <div>
 <p className="cmm-text-caption font-bold cmm-text-primary uppercase tracking-wide">Action recommandée</p>
 {recommendedReason ? (
 <p className="cmm-text-caption cmm-text-muted exhaustive-only font-medium">{recommendedReason}</p>
 ) : null}
 </div>
 </div>
 <Link
 href={recommendedAction.href}
 className="rounded-lg bg-emerald-600 px-4 py-2 cmm-text-caption font-bold text-white hover:bg-emerald-700 transition shadow-sm [data-display-mode='sobre']_&:bg-slate-900 [data-display-mode='sobre']_&:shadow-none"
 >
 {recommendedAction.label.toUpperCase()}
 </Link>
 </div>
 </section>

 );
}
