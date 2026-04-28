"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";

export function MapControls({
  center,
  variant = "default",
}: {
  center: LatLngTuple;
  variant?: "default" | "immersive";
}) {
  const map = useMap();
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;

    setIsSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search,
        )}&limit=1`,
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 15);
      }
    } catch (err) {
      console.error("Geocoding error", err);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div
      className={[
        "absolute left-3 z-[1000] flex flex-col gap-2",
        variant === "immersive" ? "top-3 md:top-4" : "top-20",
      ].join(" ")}
    >
      <form
        onSubmit={handleSearch}
        className="flex overflow-hidden rounded-2xl border cmm-border-color bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 dark:hover:bg-slate-900/95"
      >
        <input
          type="text"
          placeholder="Rechercher une adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 px-4 py-2 cmm-text-small outline-none bg-transparent cmm-text-primary placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="bg-emerald-500 px-4 py-2 cmm-text-small font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {isSearching ? "..." : "🔍"}
        </button>
      </form>

      <button
        onClick={() => map.flyTo(center, 12)}
        className="flex w-fit items-center gap-2 rounded-2xl border cmm-border-color bg-white/80 px-4 py-2 cmm-text-small font-bold cmm-text-secondary shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 hover:cmm-text-primary dark:bg-slate-900/80 dark:hover:bg-slate-900/95"
      >
        <span>📍</span> Reset Vue
      </button>

      <a
        href="/methodologie"
        className="flex w-fit items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 cmm-text-small font-bold text-emerald-700 dark:text-emerald-400 shadow-xl shadow-emerald-950/10 backdrop-blur-xl transition hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60"
      >
        <span>🔬</span> Méthodologie
      </a>
    </div>
  );
}
