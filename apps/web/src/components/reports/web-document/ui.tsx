"use client";


export function MetricCard(props: {
 label: string;
 value: string;
 hint?: string;
 tone?:"base" |"accent" |"danger";
}) {
 const toneClass =
 props.tone ==="accent"
 ?"border-[#3f7f95] bg-[#edf7fa]"
 : props.tone ==="danger"
 ?"border-red-200 bg-red-50"
 :"border-slate-200 bg-[#f8fafc]";

 return (
 <article className={`print-break-inside-avoid rounded-2xl border p-4 ${toneClass}`}>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 {props.label}
 </p>
 <p className="mt-2 text-2xl font-semibold cmm-text-primary">{props.value}</p>
 {props.hint ? <p className="mt-1 cmm-text-caption cmm-text-secondary">{props.hint}</p> : null}
 </article>
 );
}
