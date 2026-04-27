"use client";

import { useMemo, useState } from"react";
import useSWR from"swr";

type FunnelResponse = {
 status:"ok";
 periodDays: number;
 metrics: {
 byMode: Array<{
 mode:"quick" |"complete";
 counts: { views: number; starts: number; submits: number };
 sessions: { views: number; starts: number; submits: number };
 conversion: { viewToSubmit: number; startToSubmit: number };
 medianCompletionSeconds: number | null;
 completionUnder60Rate: number | null;
 }>;
 totals: { views: number; starts: number; submits: number };
 conversion: { viewToSubmit: number; startToSubmit: number };
 };
 baseline: {
 periodDays: number;
 comparison: {
 viewToSubmitDelta: number;
 startToSubmitDelta: number;
 submitsDeltaAbs: number;
 submitsDeltaPct: number;
 };
 };
};

export function FunnelConversionPanel() {
 const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
 const { data, error, isLoading } = useSWR(
 ["dashboard-funnel", String(periodDays)],
 async () => {
 const response = await fetch(
 `/api/analytics/funnel?periodDays=${periodDays}`,
 { cache:"no-store" },
 );
 if (!response.ok) {
 throw new Error("funnel_unavailable");
 }
 return (await response.json()) as FunnelResponse;
 },
 );

 const quick = useMemo(
 () => data?.metrics.byMode.find((item) => item.mode ==="quick"),
 [data?.metrics.byMode],
 );
 const complete = useMemo(
 () => data?.metrics.byMode.find((item) => item.mode ==="complete"),
 [data?.metrics.byMode],
 );

 return (
 <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Adoption
 </p>
 <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
 Funnel rapide vs complet
 </h2>
 </div>
 <div className="flex flex-wrap gap-2">
 {[30, 90, 365].map((value) => (
 <button
 key={value}
 onClick={() => setPeriodDays(value as 30 | 90 | 365)}
 className={`rounded-lg border px-2 py-1 cmm-text-caption font-semibold ${
 periodDays === value
 ?"border-emerald-300 bg-emerald-50 text-emerald-900"
 :"border-slate-300 bg-white cmm-text-secondary"
 }`}
 >
 {value === 365 ?"12m" : `${value}j`}
 </button>
 ))}
 </div>
 </div>

 {isLoading ? (
 <p className="cmm-text-small cmm-text-muted">Chargement du funnel...</p>
 ) : null}
 {error ? (
 <p className="cmm-text-small text-rose-700">Funnel indisponible.</p>
 ) : null}
 {data ? (
 <>
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 View -&gt; Submit global
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {data.metrics.conversion.viewToSubmit.toFixed(1)}%
 </p>
 </article>
 <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Start -&gt; Submit global
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {data.metrics.conversion.startToSubmit.toFixed(1)}%
 </p>
 </article>
 <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Submits
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {data.metrics.totals.submits}
 </p>
 <p className="mt-1 cmm-text-caption font-semibold cmm-text-secondary">
 Delta vs N-1:{""}
 {data.baseline.comparison.submitsDeltaAbs >= 0 ?"+" :""}
 {data.baseline.comparison.submitsDeltaAbs} (
 {data.baseline.comparison.submitsDeltaPct.toFixed(1)}%)
 </p>
 </article>
 </div>

 <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Comparatif N vs N-1 ({data.baseline.periodDays}j)
 </p>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 View-&gt;Submit:{""}
 {data.baseline.comparison.viewToSubmitDelta >= 0 ?"+" :""}
 {data.baseline.comparison.viewToSubmitDelta.toFixed(1)} pts |
 Start-&gt;Submit:{""}
 {data.baseline.comparison.startToSubmitDelta >= 0 ?"+" :""}
 {data.baseline.comparison.startToSubmitDelta.toFixed(1)} pts
 </p>
 </article>

 <div className="grid gap-3 md:grid-cols-2">
 {[quick, complete].map((row) =>
 row ? (
 <article
 key={row.mode}
 className="rounded-lg border border-slate-200 bg-slate-50 p-3"
 >
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 {row.mode ==="quick" ?"Mode rapide" :"Mode complet"}
 </p>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 views {row.counts.views} | starts {row.counts.starts} |
 submits {row.counts.submits}
 </p>
 <p className="mt-1 cmm-text-caption font-semibold cmm-text-secondary">
 view-&gt;submit {row.conversion.viewToSubmit.toFixed(1)}% |
 start-&gt;submit {row.conversion.startToSubmit.toFixed(1)}%
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 mediane completion:{""}
 {row.medianCompletionSeconds === null
 ?"n/a"
 : `${row.medianCompletionSeconds.toFixed(1)}s`}
 {row.mode ==="quick"
 ? ` | <=60s: ${row.completionUnder60Rate === null ?"n/a" : `${row.completionUnder60Rate.toFixed(1)}%`}`
 :""}
 </p>
 </article>
 ) : null,
 )}
 </div>
 </>
 ) : null}
 </section>
 );
}
