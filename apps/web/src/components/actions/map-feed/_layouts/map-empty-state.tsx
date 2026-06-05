import { AlertCircle, RefreshCw, Waypoints } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

type MapEmptyStateProps = {
  mode: "filtered" | "empty";
  freshnessLabel: string | null;
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  onResetFilters: () => void;
  onReload: () => void;
  isValidating: boolean;
  zoneQuery?: string;
  tone?: "sky" | "emerald";
};

export function MapEmptyState({
  mode,
  freshnessLabel,
  hasPartialSource,
  partialSourcesLabel,
  onResetFilters,
  onReload,
  isValidating,
  zoneQuery = "",
  tone = "sky",
}: MapEmptyStateProps) {
  const isEmerald = tone === "emerald";
  const hasZoneQuery = zoneQuery.trim().length > 0;
  const title =
    mode === "filtered"
      ? hasZoneQuery
        ? "Aucune action dans cette zone"
        : "Aucun point visible avec ces filtres"
      : "Aucune action remontée sur ce périmètre";
  const description =
    mode === "filtered"
      ? hasZoneQuery
        ? `La zone "${zoneQuery}" ne renvoie aucun point. Essaie un quartier, un arrondissement ou un libellé plus large.`
        : "Les filtres actuels masquent toutes les actions. Réinitialise la vue ou relâche un critère pour faire réapparaître les points."
      : "La requête actuelle ne renvoie aucun point. Vérifie la période, le statut, les catégories visibles ou la source de données.";

  return (
    <div
      className={cn(
        "relative flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[1.75rem] px-6 py-10 text-center text-slate-950",
        isEmerald
          ? "border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(244,250,242,0.98),rgba(252,254,250,0.98))]"
          : "border border-sky-200/80 bg-sky-50",
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cn(
          "absolute inset-0 opacity-70",
          isEmerald
            ? "bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.35),transparent_24%),radial-gradient(circle_at_top_right,rgba(134,239,172,0.18),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.28))]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.28))]",
        )}
      />

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {[
          { label: "Nouveau", tone: isEmerald ? "emerald" : "sky" },
          { label: "Validé", tone: "emerald" },
          { label: "En cours", tone: "amber" },
          { label: "Résolu", tone: "slate" },
        ].map((pill) => (
          <span
            key={pill.label}
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur",
              pill.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : pill.tone === "sky"
                  ? "border-sky-200 bg-sky-50 text-slate-700"
                  : pill.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white/80 text-slate-600",
            )}
          >
            {pill.label}
          </span>
        ))}
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        {["+", "−"].map((symbol) => (
          <button
            key={symbol}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-lg font-black text-slate-700 shadow-sm backdrop-blur"
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/80 bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm">
          Carte vide
        </span>
        {hasPartialSource ? (
          <span className="rounded-full border border-amber-300/40 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
            Sources partielles: {partialSourcesLabel}
          </span>
        ) : null}
        {freshnessLabel ? (
          <span className={cn(
            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
            isEmerald
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-sky-200/80 bg-sky-50 text-slate-700",
          )}>
            {freshnessLabel}
          </span>
        ) : null}
      </div>

      <div className={cn(
        "relative z-10 max-w-xl rounded-[2rem] px-6 py-7 text-center backdrop-blur",
        isEmerald
          ? "border border-emerald-200/80 bg-white/92 shadow-[0_18px_42px_-30px_rgba(34,197,94,0.22)]"
          : "border border-sky-200/80 bg-white/90 shadow-[0_18px_42px_-30px_rgba(14,165,233,0.26)]",
      )}>
        <div className={cn(
          "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border",
          isEmerald
            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
            : "border-sky-200 bg-sky-100 text-sky-700",
        )}>
          {mode === "filtered" ? <Waypoints size={18} /> : <AlertCircle size={18} />}
        </div>

        <div className="mt-3 space-y-2">
          <p className={cn(
            "cmm-text-caption font-semibold tracking-[0.14em]",
            isEmerald ? "text-emerald-700" : "text-sky-700",
          )}>
            Carte vide
          </p>
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
            {title}
          </h3>
          <p className="text-sm font-medium leading-relaxed text-slate-700">
            {description}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <CmmButton
            type="button"
            onClick={onResetFilters}
            tone="primary"
            variant="pill"
            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] gap-2"
          >
            Réinitialiser
            <RefreshCw size={13} />
          </CmmButton>
          <CmmButton
            type="button"
            onClick={onReload}
            tone="secondary"
            variant="pill"
            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] gap-2"
          >
            {isValidating ? "Actualisation..." : "Rafraîchir"}
          </CmmButton>
          <CmmButton
            href="/methodologie"
            tone="tertiary"
            variant="pill"
            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em]"
          >
            Méthodologie
          </CmmButton>
        </div>
      </div>
    </div>
  );
}
