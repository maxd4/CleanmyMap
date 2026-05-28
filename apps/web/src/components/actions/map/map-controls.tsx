"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";
import { type LatLngTuple } from "leaflet";
import {
  buildNominatimSearchUrl,
  parseNominatimCoordinates,
} from "./map-controls.utils";
import { isWithinGreaterParisBounds } from "@/lib/geo/greater-paris";

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
        variant === "immersive" ? "top-4 md:top-5 max-w-[min(19rem,calc(100vw-1.5rem))]" : "top-20",
      ].join(" ")}
    >
      <form
        onSubmit={handleSearch}
        className="flex overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)] backdrop-blur-xl transition hover:bg-sky-50"
      >
        <input
          type="text"
          placeholder="Rechercher à Paris et proche banlieue..."
          aria-label="Rechercher une adresse ou un lieu à Paris et proche banlieue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 bg-transparent px-4 py-2 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSearching}
          aria-label={isSearching ? "Recherche en cours" : "Lancer la recherche"}
          className="flex w-11 items-center justify-center overflow-hidden bg-sky-200 px-3 py-2 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-sky-300 disabled:opacity-50"
        >
          <span aria-hidden="true">{isSearching ? "..." : "🔍"}</span>
        </button>
      </form>

      {searchError ? (
        <p className="max-w-72 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-2 text-[11px] font-semibold leading-snug text-slate-700 shadow-[0_24px_56px_-32px_rgba(245,158,11,0.18)] backdrop-blur-xl">
          {searchError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => map.flyTo(center, 12)}
        aria-label="Recentrer la carte"
        className="group/reset flex w-fit items-center gap-2 overflow-hidden rounded-2xl border border-sky-200/80 bg-sky-100 px-3 py-2 text-sm font-black text-slate-950 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)] backdrop-blur-xl transition-[width,background-color,border-color] duration-200 hover:w-32 hover:border-sky-300 hover:bg-sky-200 focus-visible:w-32 focus-visible:border-sky-300 focus-visible:bg-sky-200"
      >
        <span aria-hidden="true">📍</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-black uppercase tracking-[0.16em] opacity-0 transition-all duration-200 group-hover/reset:max-w-20 group-hover/reset:opacity-100 group-focus-visible/reset:max-w-20 group-focus-visible/reset:opacity-100">
          Reset vue
        </span>
      </button>
    </div>
  );
}
