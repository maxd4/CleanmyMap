import { AlertCircle, RefreshCw, Waypoints } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type MapEmptyStateProps = {
  mode: "filtered" | "empty";
  freshnessLabel: string | null;
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  onResetFilters: () => void;
  onReload: () => void;
  isValidating: boolean;
  zoneQuery?: string;
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
}: MapEmptyStateProps) {
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
      className="flex min-h-[28rem] items-center justify-center rounded-[1.75rem] border border-sky-200/80 bg-sky-50 px-6 py-10 text-center text-slate-950"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-xl space-y-5 rounded-[2rem] border border-sky-200/80 bg-white/90 px-6 py-7 shadow-[0_18px_42px_-30px_rgba(14,165,233,0.26)] backdrop-blur">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-700">
          {mode === "filtered" ? <Waypoints size={18} /> : <AlertCircle size={18} />}
        </div>

        <div className="space-y-2">
          <p className="cmm-text-caption font-semibold tracking-[0.14em] text-sky-700">
            Carte vide
          </p>
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
            {title}
          </h3>
          <p className="text-sm font-medium leading-relaxed text-slate-700">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {hasPartialSource ? (
            <span className="rounded-full border border-amber-300/40 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          {freshnessLabel ? (
            <span className="rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
              {freshnessLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
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
