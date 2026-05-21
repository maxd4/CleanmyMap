"use client";

import { useState } from "react";
import { Database, RefreshCcw, TriangleAlert } from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { EnvironmentalImpactProjectSignalsPanel } from "@/components/admin/environmental-impact-project-signals-panel";
import {
  buildServiceRiskRows,
  formatServiceRiskBandLabel,
} from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator";

type EnvironmentalImpactCaptureResponse = {
  status: "ok" | "error";
  triggeredBy?: string;
  version?: string;
  error?: string;
  details?: string;
  model?: {
    generatedAt: string;
    infrastructure: {
      totalKgCo2eProxy: number | null;
      monthlyKgCo2eProxy: number | null;
      annualKgCo2eProxy: number | null;
      confidencePercent: number;
      uncertaintyPercent: number;
      services: EnvironmentalImpactInfrastructureServiceEstimate[];
    };
  };
  signals?: EnvironmentalImpactProjectSignals;
  snapshots?: Array<{
    snapshotDate: string;
    generatedAt: string;
    totalKgCo2eProxy: number | null;
    confidencePercent: number;
  }>;
};

function formatKg(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} kg CO2e proxy`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}%`;
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

export function EnvironmentalImpactCapturePanel() {
  const [result, setResult] = useState<EnvironmentalImpactCaptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const triggerCapture = () => {
    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin/environmental-impact?historyLimit=12", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | EnvironmentalImpactCaptureResponse
          | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? `Erreur API (${response.status})`);
        }

        setResult(payload);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Capture impossible.");
      } finally {
        setIsPending(false);
      }
    })();
  };

  const latestSnapshot = result?.snapshots?.[0] ?? null;
  const services = result?.model?.infrastructure.services ?? [];
  const serviceByKey = new Map(services.map((service) => [service.key, service] as const));
  const serviceRiskRows = services.length ? buildServiceRiskRows(services) : [];

  return (
    <AdminPanelShell
      title="Capture d'impact environnemental"
      subtitle="Déclenche une capture manuelle pour remplir l'historique Supabase sans attendre le cron."
      headerAction={
        <button
          type="button"
          onClick={triggerCapture}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <RefreshCcw size={12} className={cn(isPending && "animate-spin")} />
          {isPending ? "Capture..." : "Capturer maintenant"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Déclenchement
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Lance une capture serveur et enregistre un snapshot daté dans Supabase.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Protection
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Route réservée aux comptes admin et max via `requireAdminAccess`.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Historique
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Alimente l&apos;historique utilisé par la courbe hebdomadaire.
            </p>
          </article>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
            <TriangleAlert className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-black">Capture impossible</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-100/80">{error}</p>
            </div>
          </div>
        ) : null}

        {result ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
              <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">
                      Dernière capture
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {formatDate(result.model?.generatedAt ?? null)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Mensuel
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {formatKg(result.model?.infrastructure.monthlyKgCo2eProxy ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Cumul
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {formatKg(result.model?.infrastructure.totalKgCo2eProxy ?? null)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Confiance
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {new Intl.NumberFormat("fr-FR", {
                        maximumFractionDigits: 0,
                      }).format(result.model?.infrastructure.confidencePercent ?? 0)}
                      %
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-white/50">
                  Déclenché par {result.triggeredBy ?? "admin-manual"} avec la version {result.version}.
                </p>
              </article>

              <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Snapshot enregistré
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {result.snapshots?.length ?? 0}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Dernière date d&apos;historique: {formatDate(latestSnapshot?.generatedAt ?? null)}.
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                    Dernier point
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatKg(latestSnapshot?.totalKgCo2eProxy ?? null)}
                  </p>
                </div>
              </article>
            </div>
            <EnvironmentalImpactProjectSignalsPanel
              signals={result.signals?.signalBreakdown}
            />

            {result.model?.infrastructure.services?.length ? (
              <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                      Score de décision par service
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      Le score combine la part du quota, la croissance mensuelle, la confiance, la criticité métier et la proximité du seuil gratuit.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                    {serviceRiskRows.length} service
                    {serviceRiskRows.length > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {serviceRiskRows.map((serviceRisk) => {
                    const service = serviceByKey.get(serviceRisk.key);
                    if (!service) {
                      return null;
                    }

                    return (
                      <article
                        key={serviceRisk.key}
                        className={cn("rounded-3xl border p-4", getRiskTone(serviceRisk.score))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
                              {serviceRisk.key}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-white">
                              {serviceRisk.label}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed opacity-80">
                              {service.description}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-3xl font-black text-white">{serviceRisk.score}</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                              score / 100
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                              {formatServiceRiskBandLabel(serviceRisk.band)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                              Charge
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
                                service.monthlyKgCo2eProxy ?? 0,
                              )} kg CO2e proxy
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                              Part quota
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {formatPercent(serviceRisk.quotaConsumedPercent)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                              Croissance
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              +{formatPercent(serviceRisk.growthPercent)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                              Seuil gratuit
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {formatPercent(serviceRisk.thresholdProximityPercent)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                            critique métier {formatPercent(serviceRisk.criticalityPercent)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                            confiance {formatPercent(service.confidencePercent)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                            delta sans base
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
            Aucune capture manuelle n&apos;a encore été lancée. Le bouton ci-dessus
            déclenche la même logique que le cron et remplit l&apos;historique.
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
