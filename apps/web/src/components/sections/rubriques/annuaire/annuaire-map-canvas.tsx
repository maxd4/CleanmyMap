"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { cn } from "@/lib/utils";
import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { getAssociationProfile, getAssociationStructureBadge, getEntryTrustState } from "./annuaire-helpers";
import { buildAnnuaireBubbleIconHtml } from "./annuaire-map-icon";
import { CmmButton } from "@/components/ui/cmm-button";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

// Custom icons based on engagement type and style
const createBubbleIcon = (
  entry: AnnuaireEntry,
  highlighted = false,
) => {
  return L.divIcon({
    className: "custom-bubble-icon",
    html: buildAnnuaireBubbleIconHtml(entry, highlighted),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export interface AnnuaireMapCanvasProps {
  items: AnnuaireEntry[];
  highlightedItemId?: string | null;
  onItemClick?: (id: string) => void;
  variant?: "standard" | "exploration";
}

export function AnnuaireMapCanvas({
  items,
  highlightedItemId,
  onItemClick,
  variant = "standard",
}: AnnuaireMapCanvasProps) {
  const center = useMemo<[number, number]>(() => {
    if (highlightedItemId) {
      const item = items.find(i => i.id === highlightedItemId);
      if (item) return [item.lat, item.lng];
    }
    return PARIS_CENTER;
  }, [highlightedItemId, items]);

  const isExploration = variant === "exploration";

  return (
    <div className={cn(
      "w-full overflow-hidden border border-violet-300/14 bg-[rgba(20,14,48,0.96)] transition-all duration-500",
      isExploration ? "h-[750px] rounded-[2.5rem] shadow-2xl" : "h-[500px] rounded-xl"
    )}>
      <MapContainer
        center={center}
        zoom={isExploration ? 13 : 12}
        scrollWheelZoom
        className="relative z-0 h-full w-full bg-[rgba(20,14,48,0.96)]"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mode Épuré">
            <TileLayer
              attribution={CARTO_BASEMAPS.light.attribution}
              url={CARTO_BASEMAPS.light.url}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Voyager">
            <TileLayer
              attribution={CARTO_BASEMAPS.voyager.attribution}
              url={CARTO_BASEMAPS.voyager.url}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {items.map((entry) => {
          const trustState = getEntryTrustState(entry);
          const associationProfile = getAssociationProfile(entry);
          const structureBadge = getAssociationStructureBadge(entry);
          const isHighlighted = highlightedItemId === entry.id;
          
          return (
            <Marker
              key={entry.id}
              position={[entry.lat, entry.lng]}
              icon={createBubbleIcon(entry, isHighlighted)}
              eventHandlers={{
                click: () => onItemClick?.(entry.id),
              }}
            >
              {!isExploration && (
                <Popup className="rounded-2xl">
                  <div className="w-64 space-y-2 rounded-2xl border border-violet-300/16 bg-[rgba(24,17,54,0.98)] p-3 text-white shadow-2xl">
                    <h4 className="font-semibold leading-tight text-white">{entry.name}</h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.types.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-violet-400/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-100/72"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    {associationProfile ? (
                      <div className="space-y-1 rounded-xl border border-violet-300/12 bg-white/5 p-2.5">
                        {structureBadge && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">
                            {structureBadge.label}
                          </p>
                        )}
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-violet-100/72">
                          {associationProfile.mission}
                        </p>
                      </div>
                    ) : null}
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-violet-100/66">
                      {entry.description}
                    </p>
                    {trustState !== "trusted" ? (
                      <p className={`text-xs font-semibold ${trustState === "incomplete" ? "text-rose-300" : "text-amber-300"}`}>
                        {trustState === "editorial"
                          ? "Ressource éditoriale"
                          : trustState === "incomplete"
                            ? "Fiche à compléter"
                            : "Fiche non confirmée"}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-violet-300/12 pt-2">
                      <CmmButton size="sm" tone="primary" onClick={() => onItemClick?.(entry.id)}>
                        {variant === "standard" ? "Détails" : "Ouvrir la fiche"}
                      </CmmButton>
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
