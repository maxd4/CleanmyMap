"use client";

import { useMap } from "react-leaflet";
import { type LatLngTuple } from "leaflet";

export function MapControls({
  center,
  variant = "default",
  tone = "sky",
}: {
  center: LatLngTuple;
  variant?: "default" | "immersive";
  tone?: "sky" | "emerald";
}) {
  const map = useMap();
  const isEmerald = tone === "emerald";

  return (
    <div
      className={[
        "absolute left-3 z-[1000] flex flex-col gap-2",
        variant === "immersive" ? "top-3 sm:top-4" : "top-3 sm:top-20",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => map.flyTo(center, 12)}
        aria-label="Recentrer la carte"
        className={[
          "flex w-fit items-center gap-2 rounded-full border px-3 py-2.5 text-sm font-black text-slate-950 backdrop-blur-xl transition max-sm:px-4",
          isEmerald
            ? "shadow-[0_24px_56px_-32px_rgba(34,197,94,0.18)]"
            : "shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]",
          isEmerald
            ? "border-emerald-200/80 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200 focus-visible:border-emerald-300 focus-visible:bg-emerald-200"
            : "border-sky-200/80 bg-sky-100 hover:border-sky-300 hover:bg-sky-200 focus-visible:border-sky-300 focus-visible:bg-sky-200",
        ].join(" ")}
      >
        <span aria-hidden="true">📍</span>
        <span className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.16em]">
          Recentrer
        </span>
      </button>
    </div>
  );
}
