"use client";

import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import {
  computeBusinessAlerts,
  computeCampaignGoalsByZone,
  computeNeighborhoodCampaignPlan,
  type AlertSeverity,
  type BusinessAlert,
} from "@/lib/pilotage/business-alerts";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { cn } from "@/lib/utils";

function severityClasses(severity: AlertSeverity): string {
  if (severity === "high") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  if (severity === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-white/5 bg-white/5 text-slate-400";
}

export function BusinessAlertsPanel() {
  const actions = useSWR(
    ["business-alerts-actions"],
    () => fetchActions({ status: "approved", days: 120, limit: 500, types: "all" }),
    swrRecentViewOptions,
  );
  const map = useSWR(
    ["business-alerts-map"],
    () =>
      fetchMapActions({
        status: "approved",
        days: 120,
        limit: 500,
        types: "all",
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

  return (
    <AdminPanelShell
      title="Alerting métier"
      subtitle="Supervision automatique des priorités terrain."
      headerAction={
        <Link
          href="/admin"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Vue à traiter
        </Link>
      }
    >
      <div className="space-y-6">
        {isLoading && (
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Analyse des alertes en cours...
          </p>
        )}
        
        {hasError && (
          <p className="text-sm font-bold text-rose-400">
            Alertes indisponibles temporairement.
          </p>
        )}

        {!isLoading && !hasError && alerts.length === 0 && (
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-400/80 leading-relaxed">
              Tout est sous contrôle. Aucune alerte prioritaire ne ressort sur cette période.
            </p>
          </div>
        )}

        {!isLoading && !hasError && alerts.length > 0 && (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "group/item rounded-2xl border p-4 transition-all hover:scale-[1.02]",
                  severityClasses(alert.severity)
                )}
              >
                <p className="text-sm font-black tracking-tight">{alert.title}</p>
                <p className="mt-1 text-[10px] font-medium opacity-60 uppercase tracking-widest">
                  {alert.ageLabel} | Impact: {alert.impactLabel}
                </p>
                <Link
                  href={alert.actionHref}
                  className="mt-3 inline-flex text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4 opacity-80 hover:opacity-100"
                >
                  {alert.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !hasError && (
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Objectifs de campagne par zone (30j)
                </h3>
                <Link
                  href="/sections/climate"
                  className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 hover:text-emerald-500 transition-colors"
                >
                  Voir DD
                </Link>
              </div>
              
              <ul className="grid gap-3">
                {campaignGoals.map((goal) => (
                  <li
                    key={goal.area}
                    className="rounded-2xl border border-white/5 bg-white/5 p-4"
                  >
                    <p className="text-sm font-black text-white">
                      {goal.area} <span className="ml-2 text-[9px] text-amber-400/60 font-black uppercase">{goal.priority}</span>
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400 leading-relaxed">
                      Cible: {goal.targetActions30d} actions | {goal.targetKg30d.toFixed(1)} kg
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
