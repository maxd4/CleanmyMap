import type { ReactNode } from"react";

type KpiComparisonCardProps = {
 label: ReactNode;
 value: string;
 previousValue?: string;
 deltaAbsolute?: string;
 deltaPercent?: string;
 interpretation?:"positive" |"negative" |"neutral";
 hint?: string;
};

function toneClass(
 interpretation: KpiComparisonCardProps["interpretation"],
): string {
 if (interpretation ==="positive") {
 return"text-emerald-700";
 }
 if (interpretation ==="negative") {
 return"text-rose-700";
 }
 return"cmm-text-secondary";
}

export function KpiComparisonCard({
 label,
 value,
 previousValue,
 deltaAbsolute,
 deltaPercent,
 interpretation ="neutral",
 hint,
}: KpiComparisonCardProps) {
 return (
 <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">{label}</p>
 <p className="mt-1 text-xl font-semibold cmm-text-primary">{value}</p>
 {previousValue ? (
 <p className="mt-1 cmm-text-caption cmm-text-muted">N-1: {previousValue}</p>
 ) : null}
 {deltaAbsolute || deltaPercent ? (
 <p
 className={`mt-1 cmm-text-caption font-semibold ${toneClass(interpretation)}`}
 >
 {deltaAbsolute ? `${deltaAbsolute}` :""}
 {deltaAbsolute && deltaPercent ?" |" :""}
 {deltaPercent ? `${deltaPercent}` :""}
 </p>
 ) : null}
 {hint ? <p className="mt-1 cmm-text-caption cmm-text-muted">{hint}</p> : null}
 </article>
 );
}
