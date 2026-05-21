"use client";

import useSWR from "swr";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  HardDrive,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { StorageBusinessContributionPanel } from "@/components/dashboard/storage-business-contribution-panel";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  formatStorageBytes,
  type StorageUsageBreakdownItem,
  type StorageUsageHistoryPoint,
  type StorageUsageMonthComparison,
  type StorageUsageSnapshot,
} from "@/lib/supabase/storage-usage";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";
import type { StorageUsageCronStatus } from "@/lib/supabase/storage-usage-cron";
import { cn } from "@/lib/utils";

type StorageUsageResponse = {
  status: "ok" | "degraded";
  current: StorageUsageSnapshot;
  businessContributions: StorageBusinessContributionReport;
  history: Array<
    StorageUsageHistoryPoint & {
      bucketBreakdown: StorageUsageBreakdownItem[];
      extensionBreakdown: StorageUsageBreakdownItem[];
      businessBreakdown: StorageUsageBreakdownItem[];
    }
  >;
  comparison: StorageUsageMonthComparison;
  cron: StorageUsageCronStatus;
  warnings: string[];
  timestamp: string;
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

function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatStorageBytes(Math.abs(value))}`;
}

function BreakdownTable({
  title,
  rows,
  tone = "slate",
}: {
  title: string;
  rows: StorageUsageBreakdownItem[];
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-white/5 bg-white/5";

  return (
    <article className={cn("rounded-3xl border p-4", toneClasses)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
          {title}
        </h3>
        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/20">
          {rows.length} entrée{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/30">Aucune donnée à afficher.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row) => (
            <li
              key={row.key}
              className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {row.label}
                  </p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">
                    {row.count} fichier{row.count > 1 ? "s" : ""} · moyenne{" "}
                    {formatStorageBytes(row.averageBytes)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">
                    {formatStorageBytes(row.bytes)}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                    {formatPercent(row.sharePercent)}%
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function StorageUsagePanel() {
  const usage = useSWR<StorageUsageResponse>(
    ["/api/admin/storage-usage"],
    () => fetcher<StorageUsageResponse>("/api/admin/storage-usage"),
    swrRecentViewOptions,
  );

  const isLoading = usage.isLoading;
  const isRefreshing = usage.isValidating;
  const hasError = Boolean(usage.error);

  const chartData = (usage.data?.history ?? [])
    .slice()
    .reverse()
    .map((point) => ({
      monthLabel: point.monthLabel,
      usedGb: point.totalBytes / (1024 * 1024 * 1024),
      quotaGb:
        (usage.data?.current.quotaBytes ?? 1024 * 1024 * 1024) /
        (1024 * 1024 * 1024),
      usagePercent: point.usagePercent,
    }));

  const current = usage.data?.current ?? null;
  const comparison = usage.data?.comparison ?? null;
  const cron = usage.data?.cron ?? null;
  const warnings = usage.data?.warnings ?? [];
  const comparisonData: StorageUsageMonthComparison = comparison ?? {
    previousSnapshotMonth: null,
    deltaBytes: 0,
    deltaPercent: null,
    bucketGrowth: [],
    extensionGrowth: [],
  };

  const statusTone =
    current && current.usagePercent >= 100
      ? "text-rose-400"
      : current && current.usagePercent >= 80
        ? "text-amber-300"
        : "text-emerald-300";

  const currentStateLabel =
    current && current.usagePercent >= 100
      ? "Dépassé"
      : current && current.usagePercent >= 80
        ? "Vigilance"
        : "Stable";

  return (
    <AdminPanelShell
      title="Stockage Supabase"
      subtitle="Vue quota, consommation, historique mensuel et contribution métier du stockage."
      headerAction={
        <button
          type="button"
          onClick={() => {
            void usage.mutate();
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
          Impossible de charger le suivi du stockage Supabase. Vérifiez la
          connexion au projet et le rôle service.
        </div>
      ) : null}

      {!isLoading && !hasError && current ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Stockage utilisé
              </p>
              <p className={cn("mt-2 text-3xl font-black", statusTone)}>
                {current.totalLabel}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {current.objectCount} fichiers
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Stockage restant
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {current.remainingLabel}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                Sur {current.quotaLabel}
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Quota configuré
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {current.quotaLabel}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {current.source === "default_free"
                  ? "Valeur par défaut Free Plan"
                  : "Valeur surchargée par variable d'environnement"}
              </p>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Tension quota
              </p>
              <p className={cn("mt-2 text-3xl font-black", statusTone)}>
                {formatPercent(current.usagePercent)}%
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {currentStateLabel}
              </p>
            </article>
          </div>

          {usage.data?.businessContributions ? (
            <StorageBusinessContributionPanel
              report={usage.data.businessContributions}
            />
          ) : null}

          {cron ? (
            <article
              className={cn(
                "rounded-3xl border p-4",
                cron.configured
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-amber-500/20 bg-amber-500/10",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CalendarClock
                    size={16}
                    className={cron.configured ? "text-emerald-300" : "text-amber-300"}
                  />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                      Capture automatique mensuelle
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Le snapshot est exécuté par Vercel le{" "}
                      {cron.scheduleLabel}.
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                    cron.configured
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-100",
                  )}
                >
                  {cron.statusLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                    Prochaine capture
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {cron.nextRunLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                    Planification
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {cron.schedule}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                    Fuseau
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {cron.timezone}
                  </p>
                </div>
              </div>

              {!cron.configured ? (
                <p className="mt-3 text-sm text-amber-100/80">
                  <code className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] font-semibold text-amber-50">
                    CRON_SECRET
                  </code>{" "}
                  est absent ou trop court. La route planifiée
                  restera inactive tant que la variable d&apos;environnement ne
                  sera pas définie.
                </p>
              ) : null}
            </article>
          ) : null}

          {warnings.length > 0 && (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 shrink-0 text-amber-300" size={16} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-100">
                    Alerte de capacité
                  </p>
                  <ul className="space-y-1 text-sm text-amber-50/80">
                    {warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                    Historique mensuel
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    Dernier snapshot capturé le{" "}
                    {new Date(current.generatedAt).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    .
                  </p>
                </div>
                <div className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  {usage.data?.history?.length ?? 0} mois suivis
                </div>
              </div>

              <div className="mt-4 h-72 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm text-white/30">
                    Aucun historique disponible pour le moment.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="monthLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 800 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 800 }}
                        tickFormatter={(value) => `${value.toFixed(1)} GB`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          borderRadius: "20px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: "#020617",
                          boxShadow: "0 24px 48px -16px rgba(0,0,0,0.6)",
                        }}
                        itemStyle={{ fontSize: "11px", fontWeight: 800 }}
                        labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="usedGb"
                        name="Stockage utilisé"
                        stroke="#34d399"
                        fill="rgba(52, 211, 153, 0.18)"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="quotaGb"
                        name="Quota"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                Mois précédent
              </p>
      {comparisonData.previousSnapshotMonth ? (
                <div className="mt-3 space-y-4">
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-sm font-bold text-white">
                      {comparisonData.previousSnapshotMonth}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                      Delta total
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-2xl font-black",
                        comparisonData.deltaBytes > 0
                          ? "text-rose-300"
                          : comparisonData.deltaBytes < 0
                            ? "text-emerald-300"
                            : "text-white",
                      )}
                    >
                      {formatDelta(comparisonData.deltaBytes)}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                      {comparisonData.deltaPercent === null
                        ? "Pas de base précédente"
                        : `${formatPercent(comparisonData.deltaPercent)}%`}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                        Buckets en croissance
                      </p>
                      <ul className="mt-2 space-y-2">
                        {comparisonData.bucketGrowth.slice(0, 4).map((item) => (
                          <li key={item.key} className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {item.label}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                                  {formatStorageBytes(item.previousBytes)} →{" "}
                                  {formatStorageBytes(item.currentBytes)}
                                </p>
                              </div>
                              <p
                                className={cn(
                                  "text-sm font-black",
                                  item.deltaBytes >= 0
                                    ? "text-rose-300"
                                    : "text-emerald-300",
                                )}
                              >
                                {formatDelta(item.deltaBytes)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                        Types en croissance
                      </p>
                      <ul className="mt-2 space-y-2">
                        {comparisonData.extensionGrowth.slice(0, 4).map((item) => (
                          <li key={item.key} className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {item.label}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                                  {formatStorageBytes(item.previousBytes)} →{" "}
                                  {formatStorageBytes(item.currentBytes)}
                                </p>
                              </div>
                              <p
                                className={cn(
                                  "text-sm font-black",
                                  item.deltaBytes >= 0
                                    ? "text-rose-300"
                                    : "text-emerald-300",
                                )}
                              >
                                {formatDelta(item.deltaBytes)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/35">
                  Aucune comparaison mensuelle encore disponible. Le prochain
                  snapshot servira de base.
                </div>
              )}
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownTable
              title="Buckets techniques"
              rows={current.bucketBreakdown}
              tone="slate"
            />
            <BreakdownTable
              title="Logique métier"
              rows={current.businessBreakdown}
              tone="emerald"
            />
            <BreakdownTable
              title="Types de fichiers"
              rows={current.extensionBreakdown}
              tone="amber"
            />
          </div>

          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Fichiers les plus lourds
                </p>
                <p className="mt-1 text-sm text-white/50">
                  Les fichiers qui pèsent le plus sur le quota du projet.
                </p>
              </div>
              <HardDrive size={16} className="text-white/20" />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2">Fichier</th>
                    <th className="px-3 py-2">Bucket</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Poids</th>
                  </tr>
                </thead>
                <tbody>
                  {current.largestFiles.slice(0, 8).map((file) => (
                    <tr key={`${file.bucketId}-${file.name}`} className="border-b border-white/5 text-white/75">
                      <td className="max-w-[280px] px-3 py-3">
                        <p className="truncate font-semibold text-white">
                          {file.name}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                          {file.businessLabel}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-white/50">{file.bucketLabel}</td>
                      <td className="px-3 py-3 text-white/50">{file.fileTypeLabel}</td>
                      <td className="px-3 py-3 font-black text-white">{file.sizeLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
