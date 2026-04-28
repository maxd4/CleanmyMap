"use client";

import Link from"next/link";
import { useMemo } from"react";
import useSWR from"swr";
import { fetchActions, fetchMapActions } from"@/lib/actions/http";
import {
 computeBusinessAlerts,
 computeCampaignGoalsByZone,
 computeNeighborhoodCampaignPlan,
 type AlertSeverity,
 type BusinessAlert,
} from"@/lib/pilotage/business-alerts";
import { swrRecentViewOptions } from"@/lib/swr-config";

function severityClasses(severity: AlertSeverity): string {
 if (severity ==="high") {
 return"border-rose-200 bg-rose-50 text-rose-800";
 }
 if (severity ==="medium") {
 return"border-amber-200 bg-amber-50 text-amber-800";
 }
 return"border-slate-200 bg-slate-50 cmm-text-secondary";
}

export function BusinessAlertsPanel() {
 const actions = useSWR(
 ["business-alerts-actions"],
 () => fetchActions({ status:"all", days: 120, limit: 500, types:"all" }),
 swrRecentViewOptions,
 );
 const map = useSWR(
 ["business-alerts-map"],
 () =>
 fetchMapActions({
 status:"approved",
 days: 120,
 limit: 500,
 types:"all",
 }),
 swrRecentViewOptions,
 );

 const isLoading = actions.isLoading || map.isLoading;
 const hasError = Boolean(actions.error || map.error);

 const alerts = useMemo<BusinessAlert[]>(() => {
 return computeBusinessAlerts({
 actions: actions.data?.items ?? [],
 mapItems: map.data?.items ?? [],
 });
 }, [actions.data?.items, map.data?.items]);

 const campaignGoals = useMemo(() => {
 return computeCampaignGoalsByZone({
 actions: actions.data?.items ?? [],
 });
 }, [actions.data?.items]);

 const neighborhoodPlan = useMemo(() => {
 return computeNeighborhoodCampaignPlan({
 actions: actions.data?.items ?? [],
 });
 }, [actions.data?.items]);

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex items-center justify-between gap-3">
 <h2 className="text-base font-semibold cmm-text-primary">
 Alerting metier
 </h2>
 <Link
 href="/admin"
 className="cmm-text-caption font-semibold text-emerald-700 hover:text-emerald-800"
 >
 Vue a traiter
 </Link>
 </div>

 {isLoading ? (
 <p className="mt-3 cmm-text-small cmm-text-muted">
 Analyse des alertes en cours...
 </p>
 ) : null}
 {hasError ? (
 <p className="mt-3 cmm-text-small text-rose-700">
 Alertes indisponibles temporairement.
 </p>
 ) : null}

 {!isLoading && !hasError && alerts.length === 0 ? (
 <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-small text-emerald-700">
 Tout est sous contrôle. Aucune alerte prioritaire n'est détectée sur cette période.
 </p>
 ) : null}

 {!isLoading && !hasError && alerts.length > 0 ? (
 <ul className="mt-3 space-y-2">
 {alerts.map((alert) => (
 <li
 key={alert.id}
 className={`rounded-lg border px-3 py-2 ${severityClasses(alert.severity)}`}
 >
 <p className="cmm-text-small font-semibold">{alert.title}</p>
 <p className="cmm-text-caption">
 {alert.ageLabel} | Impact: {alert.impactLabel}
 </p>
 <Link
 href={alert.actionHref}
 className="mt-1 inline-flex cmm-text-caption font-semibold underline"
 >
 {alert.actionLabel}
 </Link>
 </li>
 ))}
 </ul>
 ) : null}

 {!isLoading && !hasError ? (
 <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
 <div className="flex items-center justify-between gap-2">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 Objectifs de campagne par zone (30 jours)
 </h3>
 <Link
 href="/sections/climate"
 className="cmm-text-caption font-semibold text-emerald-700 hover:text-emerald-800"
 >
 Voir developpement durable
 </Link>
 </div>
 <ul className="mt-2 space-y-2 cmm-text-small cmm-text-secondary">
 {campaignGoals.map((goal) => (
 <li
 key={goal.area}
 className="rounded-lg border border-slate-200 bg-white px-3 py-2"
 >
 <p className="font-semibold">
 {goal.area} - priorite {goal.priority.toUpperCase()}
 </p>
 <p className="cmm-text-caption cmm-text-secondary">
 Objectif: {goal.targetActions30d} actions,{""}
 {goal.targetKg30d.toFixed(1)} kg, {goal.targetVolunteers30d}{""}
 benevoles mobilises.
 </p>
 <p className="cmm-text-caption cmm-text-muted">
 Baseline 90j: {goal.baselineActions90d} actions /{""}
 {goal.baselineKg90d.toFixed(1)} kg. {goal.justification}
 </p>
 </li>
 ))}
 {campaignGoals.length === 0 ? (
 <li className="rounded-lg border border-slate-200 bg-white px-3 py-2 cmm-text-secondary">
 Données insuffisantes pour projeter des objectifs. Continuez à déclarer vos actions pour affiner les prévisions.
 </li>
 ) : null}
 </ul>
 </div>
 ) : null}

 {!isLoading && !hasError ? (
 <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
 <div className="flex items-center justify-between gap-2">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 Plan de campagne quartier (30 jours)
 </h3>
 <Link
 href="/sections/actors"
 className="cmm-text-caption font-semibold text-emerald-700 hover:text-emerald-800"
 >
 Ouvrir partenaires
 </Link>
 </div>
 <ul className="mt-2 space-y-2 cmm-text-small cmm-text-secondary">
 {neighborhoodPlan.map((plan) => (
 <li
 key={`plan-${plan.area}`}
 className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
 >
 <p className="font-semibold">
 {plan.area} - priorite {plan.priority.toUpperCase()}
 </p>
 <p className="cmm-text-caption cmm-text-secondary">
 Cadence: {plan.weeklyCadence} sortie(s)/semaine | staffing:{""}
 {plan.staffingPerAction} benevole(s)/sortie | objectif
 qualite: {plan.qualityTargetScore}/100 | SLA moderation:{""}
 {plan.moderationSlaDays} j max.
 </p>
 <p className="cmm-text-caption cmm-text-muted">
 Checkpoints: J+7 ({plan.checkpoint7d}), J+21 (
 {plan.checkpoint21d}). {plan.rationale}
 </p>
 </li>
 ))}
 {neighborhoodPlan.length === 0 ? (
 <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cmm-text-secondary">
 Pas assez de données historiques pour bâtir un plan de quartier. Les objectifs s'affineront avec vos prochaines sorties.
 </li>
 ) : null}
 </ul>
 </div>
 ) : null}
 </section>
 );
}
