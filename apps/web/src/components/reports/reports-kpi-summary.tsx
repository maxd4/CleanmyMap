"use client";

import { useMemo } from"react";
import useSWR from"swr";
import { fetchActions, fetchMapActions } from"@/lib/actions/http";
import { swrRecentViewOptions } from"@/lib/swr-config";

export function ReportsKpiSummary() {
 const actions = useSWR(
 ["reports-kpi-actions"],
 () => fetchActions({ status:"approved", limit: 300 }),
 swrRecentViewOptions,
 );
 const map = useSWR(
 ["reports-kpi-map"],
 () => fetchMapActions({ status:"approved", days: 365, limit: 300 }),
 swrRecentViewOptions,
 );

 const isLoading = actions.isLoading || map.isLoading;
 const error = actions.error || map.error;

 const metrics = useMemo(() => {
 const items = actions.data?.items ?? [];
 const mapItems = map.data?.items ?? [];
 const totalKg = items.reduce(
 (acc, item) => acc + Number(item.waste_kg || 0),
 0,
 );
 const totalButts = items.reduce(
 (acc, item) => acc + Number(item.cigarette_butts || 0),
 0,
 );
 const totalMinutes = items.reduce(
 (acc, item) => acc + Number(item.duration_minutes || 0),
 0,
 );
 const totalVolunteers = items.reduce(
 (acc, item) => acc + Number(item.volunteers_count || 0),
 0,
 );
 const geolocated = mapItems.filter(
 (item) => item.latitude !== null && item.longitude !== null,
 ).length;
 const traced = mapItems.filter((item) =>
 (item.contract?.geometry.kind ?? item.geometry_kind ??"point") !=="point",
 ).length;
 return {
 totalKg,
 totalButts,
 totalMinutes,
 totalVolunteers,
 geolocated,
 traced,
 count: items.length,
 };
 }, [actions.data?.items, map.data?.items]);

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <h2 className="text-xl font-semibold cmm-text-primary">
 Synthese scientifique rapide
 </h2>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Indicateurs consolides sur les actions approuvees.{""}
 <a href="/methodologie" className="text-emerald-600 font-bold hover:underline">
 Consulter le protocole scientifique CMM-v1 →
 </a>
 </p>

 {isLoading ? (
 <p className="mt-3 cmm-text-small cmm-text-muted">Chargement des KPI...</p>
 ) : null}
 {error ? (
 <p className="mt-3 cmm-text-small text-rose-700">
 Impossible de charger la synthese KPI.
 </p>
 ) : null}

 {!isLoading && !error ? (
 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Actions approuvees
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {metrics.count}
 </p>
 </article>
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Dechets et megots
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {metrics.totalKg.toFixed(1)} kg / {metrics.totalButts} megots
 </p>
 </article>
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Mobilisation
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {metrics.totalVolunteers} participants /{""}
 {(metrics.totalMinutes / 60).toFixed(1)} h
 </p>
 </article>
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Points geolocalises
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {metrics.geolocated}
 </p>
 </article>
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Traces / Polygones
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {metrics.traced}
 </p>
 </article>
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Qualite donnees
 </p>
 <p className="mt-1 cmm-text-small font-semibold cmm-text-primary">
 {metrics.count > 0
 ? `${Math.round((metrics.geolocated / metrics.count) * 100)}% geo-couverture`
 :"n/a"}
 </p>
 </article>
 </div>
 ) : null}
 </section>
 );
}
