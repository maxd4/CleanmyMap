import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

type MapLoadingStateProps = {
  fullViewport?: boolean;
  compact?: boolean;
  tone?: "sky" | "emerald";
};

export function MapLoadingState({
  fullViewport = false,
  compact = false,
  tone = "sky",
}: MapLoadingStateProps) {
  const isEmerald = tone === "emerald";
  return (
    <div
      className={[
        "relative flex h-full min-h-[28rem] items-stretch overflow-hidden rounded-[2rem] px-4 py-4 sm:px-6 sm:py-6",
        isEmerald
          ? "border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(244,250,242,0.98),rgba(252,254,250,0.98))]"
          : "border border-sky-200/80 bg-sky-50",
        fullViewport ? "min-h-[36rem]" : null,
        compact ? "min-h-[18rem] rounded-none border-0 px-0 py-0 bg-transparent" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy="true"
      aria-live="polite"
      aria-label="Chargement de la carte des actions"
    >
      <div
        className={
          isEmerald
            ? "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(134,239,172,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(187,247,208,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.64),rgba(255,255,255,0.24))]"
            : "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.25),transparent_24%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))]"
        }
      />

      <div className="relative z-10 flex w-full flex-col gap-4">
        {!compact ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <CmmSkeleton variant="title" className="w-44" />
              <CmmSkeleton variant="text" className="w-72" />
            </div>
            <CmmSkeleton variant="rectangular" className="h-11 w-28 rounded-2xl" />
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div
            className={[
              "relative overflow-hidden rounded-[2.25rem]",
              isEmerald
                ? "border border-emerald-200/80 bg-white/90 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]"
                : "border border-sky-200/80 bg-white/85 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]",
            ].join(" ")}
          >
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <CmmSkeleton variant="rectangular" className="h-8 w-20 rounded-full" />
              <CmmSkeleton variant="rectangular" className="h-8 w-20 rounded-full" />
              <CmmSkeleton variant="rectangular" className="h-8 w-20 rounded-full" />
            </div>

            <div
              className={
                isEmerald
                  ? "absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-100/80 to-transparent"
                  : "absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-100/80 to-transparent"
              }
            />

            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 px-6 py-10 sm:min-h-[24rem]">
              <div
                className={[
                  "flex h-14 w-14 items-center justify-center rounded-2xl border",
                  isEmerald ? "border-emerald-200 bg-emerald-100" : "border-sky-200 bg-sky-100",
                ].join(" ")}
              >
                <div
                  className={[
                    "h-5 w-5 animate-spin rounded-full border-2",
                    isEmerald
                      ? "border-emerald-300 border-t-emerald-700"
                      : "border-sky-300 border-t-sky-700",
                  ].join(" ")}
                />
              </div>
              <div className="max-w-sm space-y-2 text-center">
                <p
                  className={[
                    "cmm-text-caption font-semibold tracking-[0.14em]",
                    isEmerald ? "text-emerald-700" : "text-sky-700",
                  ].join(" ")}
                >
                  Préparation de la carte
                </p>
                <p className="text-sm font-medium leading-relaxed text-slate-700">
                  Chargement des données, des couches et des contrôles.
                </p>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              <CmmSkeleton variant="rectangular" className="h-9 w-24 rounded-2xl" />
              <CmmSkeleton variant="rectangular" className="h-9 w-24 rounded-2xl" />
              <CmmSkeleton variant="rectangular" className="h-9 w-24 rounded-2xl" />
              <CmmSkeleton variant="rectangular" className="ml-auto h-9 w-24 rounded-2xl" />
            </div>
          </div>

          {!compact ? (
            <div className="hidden space-y-3 xl:block">
              <CmmSkeleton variant="card" className="h-28" />
              <CmmSkeleton variant="card" className="h-28" />
              <CmmSkeleton variant="card" className="h-28" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
