"use client";

import { RefreshCcw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { formatStorageUsagePercent as formatPercent } from "@/lib/dashboard/storage-usage-view-model";
import {
  formatStorageBytes,
  type StorageUsageBreakdownItem,
} from "@/lib/supabase/storage-usage";
import { cn } from "@/lib/utils";

export function StorageRefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <CmmButton
      type="button"
      tone="tertiary"
      size="sm"
      loading={isRefreshing}
      onClick={onRefresh}
      className="!border-white/10 !bg-white/5 !text-white hover:!bg-white/10"
    >
      <RefreshCcw
        size={12}
        aria-hidden="true"
        className={isRefreshing ? "motion-safe:animate-spin" : undefined}
      />
      {isRefreshing ? "Rafraîchissement" : "Rafraîchir"}
    </CmmButton>
  );
}

export function StorageLoadingState() {
  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement du suivi du stockage"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <CmmSkeleton
          key={index}
          variant="card"
          animation="pulse"
          className="h-28 rounded-3xl bg-white/5"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function StorageErrorState({
  isRefreshing,
  onRetry,
}: {
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <CmmFeedback
      tone="error"
      title="Suivi du stockage indisponible"
      action={
        <CmmButton
          type="button"
          tone="primary"
          size="sm"
          loading={isRefreshing}
          onClick={onRetry}
        >
          Réessayer
        </CmmButton>
      }
    >
      Impossible de charger le suivi du stockage Supabase. Vérifiez la
      connexion au projet et le rôle service.
    </CmmFeedback>
  );
}



export function BreakdownTable({
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
        <p className="cmm-text-body cmm-text-inverse mt-4">Aucune donnée à afficher.</p>
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
