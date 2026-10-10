import { cn } from "@/lib/utils";
import { MapTruncationNotice } from "./map-data-status";

type MapEmptyStateDecorationsProps = {
  freshnessLabel: string | null;
  hasPartialSource: boolean;
  isTruncated: boolean;
  partialSourcesLabel: string;
  tone: "sky" | "emerald";
};

export function MapEmptyStateDecorations({
  freshnessLabel,
  hasPartialSource,
  isTruncated,
  partialSourcesLabel,
  tone,
}: MapEmptyStateDecorationsProps) {
  const isEmerald = tone === "emerald";
  return (
    <>
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {["Nouveau", "Validé", "En cours", "Résolu"].map((label, index) => (
          <span
            key={label}
            className={cn(
              "rounded-full border px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.14em] backdrop-blur",
              index === 1
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : index === 2
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : index === 3
                    ? "border-slate-200 bg-white/80 text-slate-600"
                    : isEmerald
                      ? "border-emerald-200 bg-emerald-50 text-slate-700"
                      : "border-sky-200 bg-sky-50 text-slate-700",
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        {["+", "−"].map((symbol) => (
          <button
            key={symbol}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-lg font-black text-slate-900 shadow-sm backdrop-blur"
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/80 bg-white/92 px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-900 shadow-sm">
          Carte vide
        </span>
        {hasPartialSource ? (
          <span className="rounded-full border border-amber-300/40 bg-amber-100 px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-950">
            Sources partielles: {partialSourcesLabel}
          </span>
        ) : null}
        <MapTruncationNotice isTruncated={isTruncated} tone={tone} />
        {freshnessLabel ? (
          <span className={cn(
            "rounded-full px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.14em]",
            isEmerald
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-sky-200/80 bg-sky-50 text-slate-700",
          )}>
            {freshnessLabel}
          </span>
        ) : null}
      </div>
    </>
  );
}
