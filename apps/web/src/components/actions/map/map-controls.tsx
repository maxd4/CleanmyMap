"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";
import { type LatLngTuple } from "leaflet";
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
        className="flex overflow-hidden rounded-2xl border border-sky-300/16 bg-[rgba(16,40,64,0.92)] shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl transition hover:bg-[rgba(18,47,74,0.96)]"
      >
        <input
          type="text"
          placeholder="Rechercher à Paris et proche banlieue..."
          aria-label="Rechercher une adresse ou un lieu à Paris et proche banlieue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 bg-transparent px-4 py-2 text-sm font-medium text-white outline-none placeholder:text-sky-100/36"
        />
        <button
          type="submit"
          disabled={isSearching}
          aria-label={isSearching ? "Recherche en cours" : "Lancer la recherche"}
          className="bg-sky-500 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {isSearching ? "..." : "🔍"}
        </button>
      </form>

      {searchError ? (
        <p className="max-w-72 rounded-2xl border border-amber-300/20 bg-[rgba(63,40,8,0.88)] px-4 py-2 text-[11px] font-semibold leading-snug text-amber-100 shadow-[0_24px_56px_-32px_rgba(245,158,11,0.22)] backdrop-blur-xl">
          {searchError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => map.fitBounds(greaterParisBounds, { padding: [32, 32] })}
        aria-label="Recentrer sur le périmètre Paris et proche banlieue"
        className="flex w-fit items-center gap-2 rounded-2xl border border-sky-300/16 bg-[rgba(16,40,64,0.92)] px-4 py-2 text-sm font-black text-sky-100/82 shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl transition hover:border-sky-300/30 hover:bg-[rgba(18,47,74,0.96)]"
      >
        <span>🗺️</span> Périmètre
      </button>

      <button
        type="button"
        onClick={() => map.flyTo(center, 12)}
        aria-label="Recentrer la carte"
        className="flex w-fit items-center gap-2 rounded-2xl border border-sky-300/16 bg-[rgba(16,40,64,0.92)] px-4 py-2 text-sm font-black text-sky-100/82 shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl transition hover:border-sky-300/30 hover:bg-[rgba(18,47,74,0.96)]"
      >
        <span>📍</span> Reset vue
      </button>

      <a
        href="/methodologie"
        aria-label="Ouvrir la méthodologie"
        className="flex w-fit items-center gap-2 rounded-2xl border border-sky-300/16 bg-[rgba(16,40,64,0.92)] px-4 py-2 text-sm font-black text-sky-100/82 shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl transition hover:border-sky-300/30 hover:bg-[rgba(18,47,74,0.96)]"
      >
        <span>🔬</span> Méthodologie
      </a>
    </div>
  );
}
