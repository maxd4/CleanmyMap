"use client";

import type { ChapterAudience } from "@/lib/reports/report-model/types";
import { reportPdfColors } from "@/lib/pdf-export/report-pdf-theme";

export function ReportPage(props: {
 id: string;
 kicker: string;
 title: string;
 subtitle: string;
 audience: ChapterAudience;
 children: React.ReactNode;
}) {
 const audienceBadge =
 props.audience ==="terrain"
 ?"Usage terrain"
 : props.audience ==="strategie"
 ?"Usage décideur"
 :"Usage terrain + décideur";

 return (
 <section
 id={props.id}
 className="scroll-mt-28 break-after-page rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)] last:break-after-auto"
 >
 <div
 className="border-b border-slate-200 p-[1cm] text-white"
 style={{
 background: `linear-gradient(135deg, ${reportPdfColors.teal}, ${reportPdfColors.navy})`,
 }}
 >
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-slate-200">
 {props.kicker}
 </p>
 <div className="mt-2 flex flex-wrap items-center gap-3">
 <h2 className="text-2xl font-semibold leading-tight">{props.title}</h2>
 <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-slate-100">
 {audienceBadge}
 </span>
 </div>
 <p className="mt-2 max-w-3xl cmm-text-small text-slate-100/90">{props.subtitle}</p>
 </div>
 <div className="space-y-5 p-[1cm]">{props.children}</div>
 </section>
 );
}
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
