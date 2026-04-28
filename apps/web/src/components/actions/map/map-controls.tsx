"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import {
  buildNominatimSearchUrl,
  parseNominatimCoordinates,
} from "./map-controls.utils";
import {
  buildGreaterParisLeafletBounds,
  isWithinGreaterParisBounds,
} from "@/lib/geo/greater-paris";

export function MapControls({
  center,
  variant = "default",
}: {
  center: LatLngTuple;
  variant?: "default" | "immersive";
}) {
  const map = useMap();
  const greaterParisBounds = buildGreaterParisLeafletBounds();
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const normalizedSearch = search.trim();
    if (!normalizedSearch) {
      setSearchError("Saisis une adresse ou un lieu.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const url = buildNominatimSearchUrl(normalizedSearch);
      if (!url) {
        setSearchError("Recherche invalide.");
        return;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (Array.isArray(data) && data.length > 0) {
        const coordinates = parseNominatimCoordinates(data[0]);
        if (coordinates) {
          if (!isWithinGreaterParisBounds(coordinates.latitude, coordinates.longitude)) {
            setSearchError("Résultat hors du périmètre Paris + proche banlieue.");
            return;
          }
          map.flyTo([coordinates.latitude, coordinates.longitude], 15);
        } else {
          setSearchError("Résultat de recherche inexploitable.");
        }
      } else {
        setSearchError("Aucun résultat dans le périmètre Paris + proche banlieue.");
      }
    } catch (err) {
      console.error("Geocoding error", err);
      setSearchError("Impossible de contacter le service de recherche.");
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
          placeholder="Rechercher à Paris et proche banlieue..."
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
      {searchError ? (
        <p className="max-w-72 rounded-2xl border border-amber-300/50 bg-amber-50/90 px-4 py-2 text-[11px] font-semibold leading-snug text-amber-900 shadow-xl shadow-amber-950/5 backdrop-blur-xl dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
          {searchError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => map.fitBounds(greaterParisBounds, { padding: [32, 32] })}
        className="flex w-fit items-center gap-2 rounded-2xl border border-teal-500/20 bg-teal-50/80 px-4 py-2 cmm-text-small font-bold text-teal-700 shadow-xl shadow-teal-950/10 backdrop-blur-xl transition hover:bg-teal-100/90 dark:border-teal-400/20 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60"
      >
        <span>🗺️</span> Périmètre
      </button>

      <button
        type="button"
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
