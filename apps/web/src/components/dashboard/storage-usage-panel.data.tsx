"use client";

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
  TriangleAlert,
} from "lucide-react";
import { StorageBusinessContributionPanel } from "@/components/dashboard/storage-business-contribution-panel";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import {
  buildStorageUsageViewModel,
  formatStorageUsageDelta as formatDelta,
  formatStorageUsagePercent as formatPercent,
  type StorageUsageResponse,
} from "@/lib/dashboard/storage-usage-view-model";
import { cn } from "@/lib/utils";
import { BreakdownTable } from "./storage-usage-panel.async";

export function StorageUsageDataView({
  data,
  current,
  cron,
  warnings,
  statusTone,
  currentStateLabel,
  chartData,
  comparisonData,
}: {
  data: StorageUsageResponse | undefined;
  current: NonNullable<StorageUsageResponse["current"]>;
  cron: StorageUsageResponse["cron"] | null;
  warnings: NonNullable<StorageUsageResponse["warnings"]>;
  statusTone: string;
  currentStateLabel: string;
  chartData: ReturnType<typeof buildStorageUsageViewModel>["chartData"];
  comparisonData: ReturnType<typeof buildStorageUsageViewModel>["comparisonData"];
}) {
  return (
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

          {data?.businessContributions ? (
            <StorageBusinessContributionPanel
              report={data.businessContributions}
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
                  {data?.history?.length ?? 0} mois suivis
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

            <div className="cmm-data-table-wrap mt-4">
              <table className="cmm-data-table" data-density="compact">
                <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                  <tr className="border-b border-white/5">
                    <th scope="col">Fichier</th>
                    <th scope="col">Bucket</th>
                    <th scope="col">Type</th>
                    <th scope="col">Poids</th>
                  </tr>
                </thead>
                <tbody>
                  {current.largestFiles.slice(0, 8).map((file) => (
                    <tr key={`${file.bucketId}-${file.name}`} className="text-white">
                      <td className="max-w-[280px]">
                        <p className="truncate font-semibold text-white">
                          {file.name}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                          {file.businessLabel}
                        </p>
                      </td>
                      <td className="text-white/50">{file.bucketLabel}</td>
                      <td className="text-white/50">{file.fileTypeLabel}</td>
                      <td className="font-black text-white">{file.sizeLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
  );
}
