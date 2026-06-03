"use client";

import { useMap } from "react-leaflet";
import { type LatLngTuple } from "leaflet";

export function MapControls({
  center,
  variant = "default",
}: {
  center: LatLngTuple;
  variant?: "default" | "immersive";
}) {
  const map = useMap();

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
        className="flex w-fit items-center gap-2 rounded-full border border-sky-200/80 bg-sky-100 px-3 py-2.5 text-sm font-black text-slate-950 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)] backdrop-blur-xl transition hover:border-sky-300 hover:bg-sky-200 focus-visible:border-sky-300 focus-visible:bg-sky-200 max-sm:px-4"
      >
        <span aria-hidden="true">📍</span>
        <span className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.16em]">
          Recentrer
        </span>
      </button>
    </div>
  );
}
