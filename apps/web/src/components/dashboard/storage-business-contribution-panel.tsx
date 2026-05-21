"use client";

import { cn } from "@/lib/utils";
import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import { StorageBusinessContributionDonut } from "@/components/dashboard/storage-business-contribution-donut";
import type {
  StorageBusinessContributionAlert,
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionReport,
} from "@/lib/supabase/storage-business-contribution";

function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSignedBytes(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatStorageBytes(Math.abs(value))}`;
}

function formatSignedCount(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value)} fichier${Math.abs(value) > 1 ? "s" : ""}`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatPercent(Math.abs(value))}`;
}

function alertToneClasses(severity: StorageBusinessContributionAlert["severity"]) {
  if (severity === "critical") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }
  if (severity === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }
  return "border-sky-500/20 bg-sky-500/10 text-sky-100";
}

function formatTrendLine(point: StorageBusinessContributionHistoryPoint) {
  return `${point.monthLabel}: ${formatStorageBytes(point.currentBytes)} (${point.sharePercent.toFixed(1)}%)`;
}

function TopFileRow({
  name,
  sizeLabel,
  bucketLabel,
  extension,
}: {
  name: string;
  sizeLabel: string;
  bucketLabel: string;
  extension: string;
}) {
  return (
    <li className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {bucketLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-white">{sizeLabel}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {extension}
          </p>
        </div>
      </div>
    </li>
  );
}

function MimeSubtypeRow({
  label,
  sizeLabel,
  count,
  shareLabel,
}: {
  label: string;
  sizeLabel: string;
  count: number;
  shareLabel: string;
}) {
  return (
    <li className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {count} fichier{count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-white">{sizeLabel}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            {shareLabel}
          </p>
        </div>
      </div>
    </li>
  );
}

export function StorageBusinessContributionPanel({
  report,
}: {
  report: StorageBusinessContributionReport;
}) {
  const hasItems = report.items.length > 0;
  const hasAlerts = report.alerts.length > 0;

  return (
    <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            Contribution par catégorie
          </p>
          <p className="mt-1 text-sm text-white/50">
            Répartition métier du stockage ou de la pression, évolution mensuelle au survol ou au
            clic, fichiers les plus lourds et sous-types MIME par domaine.
          </p>
        </div>
        <div className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          {report.previousSnapshotMonth
            ? `Comparé à ${report.previousSnapshotMonth}`
            : "Pas de mois précédent"}
        </div>
      </div>

      <div className="mt-4">
        <StorageBusinessContributionDonut report={report} />
      </div>

      {hasAlerts ? (
        <div className="mt-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-100/60">
                Alertes de gouvernance
              </p>
              <p className="mt-1 text-sm text-rose-50/80">
                Les seuils de part, de croissance et d&apos;accélération
                remontent automatiquement avant saturation.
              </p>
            </div>
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-100">
              {report.alerts.length} alerte{report.alerts.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {report.alerts.slice(0, 6).map((alert) => (
              <article key={alert.id} className={cn("rounded-2xl border p-3", alertToneClasses(alert.severity))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                      {alert.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{alert.title}</p>
                    <p className="mt-1 text-xs opacity-80">{alert.message}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em]">
                    {alert.signal}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!hasItems ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-white/35">
          Aucune catégorie métier n&apos;est encore alimentée.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {report.items.map((item) => {
            const trendTone =
              item.deltaBytes > 0
                ? "text-rose-300"
                : item.deltaBytes < 0
                  ? "text-emerald-300"
                  : "text-white";
            const barWidth = Math.min(100, item.currentSharePercent);

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-white/5 bg-slate-950/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white">{item.label}</h3>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
                      {item.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black text-white">
                      {formatStorageBytes(item.currentBytes)}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                      {item.currentCount} fichier{item.currentCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                    {formatPercent(item.currentSharePercent)}% du total
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                      item.deltaBytes > 0
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
                        : item.deltaBytes < 0
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/70",
                    )}
                  >
                    {formatSignedBytes(item.deltaBytes)} sur le mois
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                      item.deltaCount > 0
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
                        : item.deltaCount < 0
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/70",
                    )}
                  >
                    {formatSignedCount(item.deltaCount)} sur le mois
                  </span>
                  <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]", trendTone === "text-rose-300" ? "border-rose-500/20 bg-rose-500/10 text-rose-100" : trendTone === "text-emerald-300" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/70")}>
                    {item.deltaPercent === null
                      ? "Base absente"
                      : `${formatSignedPercent(item.deltaPercent)}%`}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                    3 mois: {formatStorageBytes(item.cumulative3MonthBytes)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                    Accélération: {formatStorageBytes(item.accelerationBytes)}
                  </span>
                  {item.alerts[0] ? (
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                        alertToneClasses(item.alerts[0].severity),
                      )}
                    >
                      {item.alerts[0].title}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      item.deltaBytes > 0
                        ? "bg-rose-400"
                        : item.deltaBytes < 0
                          ? "bg-emerald-400"
                          : "bg-white/40",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="mt-4">
                  <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                        Historique 3 mois
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/20">
                        {item.history.length} mois
                      </p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {item.history.slice(0, 3).map((point) => (
                        <li
                          key={`${item.id}-${point.snapshotMonth}`}
                          className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-white/70"
                        >
                          {formatTrendLine(point)}
                          <span className="ml-2 text-white/30">
                            Δ {formatStorageBytes(point.deltaBytes)} · 3 mois{" "}
                            {formatStorageBytes(point.cumulative3MonthBytes)} · acc{" "}
                            {formatStorageBytes(point.accelerationBytes)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                          Top fichiers
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/20">
                          {item.topFiles.length} visible{item.topFiles.length > 1 ? "s" : ""}
                        </p>
                      </div>

                      {item.topFiles.length === 0 ? (
                        <p className="mt-3 text-sm text-white/35">
                          Aucun fichier disponible pour cette catégorie.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {item.topFiles.map((file) => (
                            <TopFileRow
                              key={`${item.id}-${file.bucketId}-${file.name}`}
                              name={file.name}
                              sizeLabel={file.sizeLabel}
                              bucketLabel={file.bucketLabel}
                              extension={file.extension}
                            />
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
                          Top sous-types MIME
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/20">
                          {item.mimeSubtypes.length} visible
                          {item.mimeSubtypes.length > 1 ? "s" : ""}
                        </p>
                      </div>

                      {item.mimeSubtypes.length === 0 ? (
                        <p className="mt-3 text-sm text-white/35">
                          Aucun sous-type MIME identifié pour cette catégorie.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {item.mimeSubtypes.map((mimeSubtype) => (
                            <MimeSubtypeRow
                              key={`${item.id}-${mimeSubtype.key}`}
                              label={mimeSubtype.label}
                              sizeLabel={formatStorageBytes(mimeSubtype.bytes)}
                              count={mimeSubtype.count}
                              shareLabel={`${formatPercent(mimeSubtype.sharePercent)}% du domaine`}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </article>
  );
}
