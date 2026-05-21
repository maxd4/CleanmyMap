"use client";

import useSWR from "swr";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { buildGovernanceMethodologyLinks } from "@/lib/governance/governance-links";
import {
  buildServiceRiskRows,
  buildServiceThresholdAlerts,
  formatServiceRiskBandLabel,
} from "@/lib/environmental-impact-estimator/service-risk";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { ServicesPayload, ServiceStatusInfo } from "@/lib/dashboard/status";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureMetricEstimate,
} from "@/lib/environmental-impact-estimator";
import { cn } from "@/lib/utils";

type FreePlanServicesResponse = {
  status: "ok" | "error";
  model: EnvironmentalImpactEstimateModel;
  signals: EnvironmentalImpactProjectSignals;
  snapshots: EnvironmentalImpactSnapshotRecord[];
  focus?: string;
  error?: string;
  details?: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${url}`);
  }
  return (await response.json()) as T;
};

function formatNumber(value: number | null, maximumFractionDigits?: number): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits:
      maximumFractionDigits ?? (Math.abs(value) < 10 ? 2 : 0),
  }).format(value);
}

function toReportMonth(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    const year = fallback.getUTCFullYear();
    const month = String(fallback.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function formatMetricValue(metric: EnvironmentalImpactInfrastructureMetricEstimate): string {
  if (metric.quantityPerMonth === null) {
    return "—";
  }

  const fractionDigits =
    metric.quantityPerMonth < 10 || metric.unitLabel.includes("GB") ? 2 : 0;
  return `${formatNumber(metric.quantityPerMonth, fractionDigits)} ${metric.unitLabel}`;
}

function getHealthTone(state: ServiceStatusInfo["state"]) {
  switch (state) {
    case "ready":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "external":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "defer":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "missing":
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }
}

function getHealthLabel(state: ServiceStatusInfo["state"]) {
  switch (state) {
    case "ready":
      return "Configuré";
    case "external":
      return "Externe";
    case "defer":
      return "Différé";
    case "missing":
    default:
      return "Manquant";
  }
}

function getEstimateTone(status: EnvironmentalImpactInfrastructureServiceEstimate["status"]) {
  switch (status) {
    case "ready":
      return "text-emerald-300";
    case "derived":
      return "text-sky-200";
    case "partial":
      return "text-amber-200";
    case "reference":
    default:
      return "text-rose-200";
  }
}

function getRiskTone(score: number) {
  if (score >= 80) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }

  if (score >= 60) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (score >= 30) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
}

function getAlertTone(severity: "warning" | "critical") {
  return severity === "critical"
    ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
    : "border-amber-500/20 bg-amber-500/10 text-amber-100";
}

function countMetricsBySource(
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  source: EnvironmentalImpactInfrastructureMetricEstimate["source"],
) {
  return services.reduce(
    (acc, service) =>
      acc +
      service.metricEstimates.filter((metric) => metric.source === source).length,
    0,
  );
}

function getSnapshotServiceCharge(
  snapshot: EnvironmentalImpactSnapshotRecord | null | undefined,
  serviceKey: string,
): number {
  if (!snapshot) {
    return 0;
  }

  const service = snapshot.model.infrastructure.services.find(
    (item) => item.key === serviceKey,
  );

  return service?.monthlyKgCo2eProxy ?? 0;
}

type ServicePressureRow = {
  key: string;
  label: string;
  currentKgCo2eProxy: number;
  previousKgCo2eProxy: number;
  deltaKgCo2eProxy: number;
  confidencePercent: number;
};

export function FreePlanServicesPanel() {
  const freePlan = useSWR<FreePlanServicesResponse>(
    ["/api/admin/free-plan-services"],
    () => fetcher<FreePlanServicesResponse>("/api/admin/free-plan-services?historyLimit=8"),
    swrRecentViewOptions,
  );
  const servicesHealth = useSWR<ServicesPayload>(
    ["/api/services"],
    () => fetcher<ServicesPayload>("/api/services"),
    swrRecentViewOptions,
  );

  const isLoading = freePlan.isLoading || servicesHealth.isLoading;
  const isRefreshing = freePlan.isValidating || servicesHealth.isValidating;
  const hasError = Boolean(freePlan.error || servicesHealth.error);

  const services = freePlan.data?.model.infrastructure.services ?? [];
  const snapshots = freePlan.data?.snapshots ?? [];
  const snapshotCount = freePlan.data?.snapshots.length ?? 0;
  const generatedAt = freePlan.data?.model.generatedAt ?? null;
  const serviceByKey = new Map(services.map((service) => [service.key, service] as const));
  const serviceHealth = servicesHealth.data?.services ?? {};
  const readyServices = Object.values(serviceHealth).filter(
    (service) => service.state === "ready",
  ).length;
  const trackedServices = Object.values(serviceHealth).filter(
    (service) => service.state !== "external",
  ).length;
  const monitoredMetrics = services.reduce(
    (acc, service) => acc + service.metricCount,
    0,
  );
  const inputMetrics = countMetricsBySource(services, "input");
  const derivedMetrics = countMetricsBySource(services, "derived");
  const referenceMetrics = countMetricsBySource(services, "reference");

  const sortedServices = services
    .slice()
    .sort((left, right) => {
      const byCharge =
        (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
      if (byCharge !== 0) {
        return byCharge;
      }

      return left.label.localeCompare(right.label);
    });
  const previousSnapshot = snapshots[1] ?? null;
  const servicePressureRows: ServicePressureRow[] = sortedServices.map((service) => {
    const previousKgCo2eProxy = getSnapshotServiceCharge(previousSnapshot, service.key);
    const currentKgCo2eProxy = service.monthlyKgCo2eProxy ?? 0;
    return {
      key: service.key,
      label: service.label,
      currentKgCo2eProxy,
      previousKgCo2eProxy,
      deltaKgCo2eProxy: currentKgCo2eProxy - previousKgCo2eProxy,
      confidencePercent: service.confidencePercent,
    };
  });
  const servicePressureGrowth = servicePressureRows
    .slice()
    .sort((left, right) => right.deltaKgCo2eProxy - left.deltaKgCo2eProxy);
  const servicePressureLeader = servicePressureRows[0] ?? null;
  const inputMetricsLabel =
    inputMetrics === 1 ? "métrique branchée" : "métriques branchées";
  const trackedServicesLabel =
    trackedServices === 1 ? "service actif" : "services actifs";
  const snapshotLabel =
    snapshotCount === 1 ? "snapshot conservé" : "snapshots conservés";
  const totalMonthlyPressure = sortedServices.reduce(
    (acc, service) => acc + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const reportMonth = toReportMonth(generatedAt);
  const methodologyLinks = buildGovernanceMethodologyLinks(reportMonth);
  const serviceRiskRows = buildServiceRiskRows(
    services,
    snapshots[1]?.model.infrastructure.services ?? [],
  );
  const serviceThresholdAlerts = buildServiceThresholdAlerts({
    currentGeneratedAt: generatedAt ?? new Date().toISOString(),
    currentServices: services,
    snapshots,
  });
  const serviceRiskLeader = serviceRiskRows[0] ?? null;
  const serviceRiskCounts = serviceRiskRows.reduce(
    (acc, row) => {
      acc[row.band] += 1;
      return acc;
    },
    { faible: 0, surveiller: 0, alerte: 0, critique: 0 },
  );

  return (
    <AdminPanelShell
      title="Plans gratuits surveillés"
      subtitle="Fiche de pilotage des coûts proxy, du quota gratuit et des dérives mensuelles pour Vercel, Supabase, Resend et les autres services externes."
      headerAction={
        <button
          type="button"
          onClick={() => {
            void freePlan.mutate();
            void servicesHealth.mutate();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10"
        >
          <RefreshCcw size={12} />
          {isRefreshing ? "Rafraîchissement" : "Rafraîchir"}
        </button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/5" />
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          Impossible de charger la fiche des plans gratuits. Vérifiez la
          lecture de l&apos;estimateur d&apos;impact et l&apos;API services.
        </div>
      ) : null}

      {!isLoading && !hasError ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Pression mensuelle totale
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {formatNumber(totalMonthlyPressure, 2)} kg
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                Coût proxy agrégé du mois courant
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Services configurés
              </p>
              <p className="mt-2 text-3xl font-black text-white">{readyServices}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                D&apos;après /api/services
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Métriques branchées
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {monitoredMetrics}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {inputMetrics} {inputMetricsLabel} · {derivedMetrics} estimées ·{" "}
                {referenceMetrics} de référence
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {trackedServices} {trackedServicesLabel} hors dépendances externes
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Dernière lecture
              </p>
              <p className="mt-2 text-lg font-black text-white">
                {generatedAt
                  ? new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(generatedAt))
                  : "—"}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {snapshotCount} {snapshotLabel}
              </p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100/80">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-200/70">
                    Liens de pilotage
                  </p>
                  <p>
                    Le même mois est documenté dans le PDF de gouvernance, la
                    méthodologie et les vues admin. La fiche reste cohérente
                    avec la trace mensuelle archivée.
                  </p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/50">
                  {formatNumber(totalMonthlyPressure, 2)} kg / mois
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {methodologyLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target={item.href.startsWith("/api/") ? "_blank" : "_self"}
                    className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-50 transition hover:bg-sky-400/20"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Lecture admin
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Cette fiche ne lit pas les quotas officiels des fournisseurs.
                Elle suit la pression mensuelle, la fiabilité des métriques et
                le glissement des services pour piloter le quota gratuit sans
                masquer les données manquantes.
              </p>
            </article>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/80">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-amber-200" size={16} />
              <p>
                Cette fiche ne lit pas les quotas officiels des fournisseurs.
                Elle expose les proxys mensuels déjà calculés dans le projet
                pour suivre la pression des plans gratuits et repérer tôt les
                services qui grossissent.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                    Dérive mensuelle
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Les services triés par croissance d&apos;après le snapshot précédent.
                  </p>
                </div>
                {previousSnapshot ? (
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/20">
                    Base:{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(previousSnapshot.snapshotDate))}
                  </p>
                ) : null}
              </div>

              {previousSnapshot ? (
                <div className="mt-4 space-y-2">
                  {servicePressureGrowth.slice(0, 3).map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.label}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                            {formatNumber(item.previousKgCo2eProxy, 2)} kg →{" "}
                            {formatNumber(item.currentKgCo2eProxy, 2)} kg CO2e proxy
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-black",
                            item.deltaKgCo2eProxy > 0
                              ? "text-rose-300"
                              : item.deltaKgCo2eProxy < 0
                                ? "text-emerald-300"
                                : "text-white",
                          )}
                        >
                          {item.deltaKgCo2eProxy > 0 ? "+" : ""}
                          {formatNumber(item.deltaKgCo2eProxy, 2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/35">
                  Le prochain snapshot servira de base pour mesurer la dérive par
                  service.
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Service le plus exposé
              </p>
              {servicePressureLeader ? (
                <>
                  <p className="mt-2 text-3xl font-black text-white">
                    {servicePressureLeader.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/75">
                    {formatNumber(servicePressureLeader.currentKgCo2eProxy, 2)} kg CO2e proxy / mois
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    Confiance {formatNumber(servicePressureLeader.confidencePercent, 0)}%
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/35">
                  Aucun service disponible pour le moment.
                </p>
              )}
            </article>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Lecture de décision
                </p>
                <p className="mt-1 text-sm text-white/50">
                  Répartition du risque global par service, avec le service le plus exposé en tête.
                </p>
              </div>
              {serviceRiskLeader ? (
                <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                  Max {serviceRiskLeader.label} · {serviceRiskLeader.score}/100 ·{" "}
                  {formatServiceRiskBandLabel(serviceRiskLeader.band)}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                Faible {serviceRiskCounts.faible}
              </span>
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                Surveiller {serviceRiskCounts.surveiller}
              </span>
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                Alerte {serviceRiskCounts.alerte}
              </span>
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                Critique {serviceRiskCounts.critique}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Franchissement de seuil
                </p>
                <p className="mt-1 text-sm text-white/50">
                  Déclenchement sur croissance mensuelle, quota alloué à la catégorie ou pente sur 2 mois.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                {serviceThresholdAlerts.length} alerte
                {serviceThresholdAlerts.length > 1 ? "s" : ""}
              </div>
            </div>

            {serviceThresholdAlerts.length ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {serviceThresholdAlerts.map((alert) => (
                  <article
                    key={alert.id}
                    className={cn("rounded-3xl border p-4", getAlertTone(alert.severity))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
                          {alert.serviceKey}
                        </p>
                        <p className="mt-1 text-sm font-black text-white">
                          {alert.serviceLabel}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed opacity-80">
                          {alert.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                          {alert.severity}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                          {alert.signal}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                          Seuil
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/90">
                          {alert.thresholdLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                          De combien
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/90">
                          {alert.details}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                          Depuis quand
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/90">
                          Depuis {alert.sinceLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                          Action recommandée
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/90">
                          {alert.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-white/35">
                Aucun seuil n&apos;est franchi pour le moment.
              </p>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {serviceRiskRows.map((row) => {
              const service = serviceByKey.get(row.key);

              if (!service) {
                return null;
              }

              const health = serviceHealth[service.key];
              const metrics = service.metricEstimates.slice(0, 3);
              const extraMetrics = Math.max(0, service.metricEstimates.length - metrics.length);
              const deltaLabel =
                previousSnapshot === null
                  ? "sans base"
                  : `${row.deltaKgCo2eProxy > 0 ? "+" : ""}${formatNumber(row.deltaKgCo2eProxy, 2)} kg`;

              return (
                <article
                  key={row.key}
                  className={cn("rounded-3xl border p-4", getRiskTone(row.score))}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
                        {row.key}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">{row.label}</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-80">
                        {service.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white">{row.score}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                        score / 100
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                        {formatServiceRiskBandLabel(row.band)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                        Charge
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {formatNumber(service.monthlyKgCo2eProxy, 2)} kg CO2e proxy
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                        Part quota
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {formatNumber(row.quotaConsumedPercent, 0)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                        Croissance
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        +{formatNumber(row.growthPercent, 0)}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                        Seuil gratuit
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {formatNumber(row.thresholdProximityPercent, 0)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                      Dérive vs mois précédent
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-black",
                        previousSnapshot === null
                          ? "text-white/55"
                          : row.deltaKgCo2eProxy > 0
                            ? "text-rose-300"
                            : row.deltaKgCo2eProxy < 0
                              ? "text-emerald-300"
                              : "text-white",
                      )}
                    >
                      {deltaLabel}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                      critique métier {formatNumber(row.criticalityPercent, 0)}%
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                      confiance {formatNumber(service.confidencePercent, 0)}%
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                      delta {formatNumber(row.deltaKgCo2eProxy, 2)} kg
                    </span>
                    {health ? (
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                          getHealthTone(health.state),
                        )}
                      >
                        {getHealthLabel(health.state)}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                        getEstimateTone(service.status),
                      )}
                    >
                      {service.status === "ready"
                        ? "branché"
                        : service.status === "derived"
                          ? "estimé"
                          : service.status === "partial"
                            ? "mixte"
                            : "référence"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {metrics.map((metric) => (
                      <div
                        key={metric.key}
                        className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {metric.label}
                            </p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                              {metric.source === "input"
                                ? "mesure branchée"
                                : metric.source === "derived"
                                  ? "estimée depuis les signaux"
                                  : "référence interne"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-white">
                              {formatMetricValue(metric)}
                            </p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                              ref {formatNumber(metric.referenceMonthlyQuantity, 0)}{" "}
                              {metric.unitLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {extraMetrics > 0 ? (
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                        +{extraMetrics} métrique{extraMetrics > 1 ? "s" : ""}
                        supplémentaire{extraMetrics > 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-white/45">
                    {service.sourceNote}
                  </p>
                </article>
              );
            })}
          </div>

          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Lecture utile
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Le plan gratuit se surveille ici par trois signaux: l&apos;état de
              configuration, la charge mensuelle estimée et la dérive d&apos;un
              mois sur l&apos;autre. Quand un service passe de
              &quot;estimé&quot; à &quot;branché&quot;, la fiche devient plus
              fiable sans perdre l&apos;historique mensuel.
            </p>
          </article>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
