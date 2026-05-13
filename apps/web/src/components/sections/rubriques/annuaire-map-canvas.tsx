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
import { getEntryTrustState } from "./annuaire-helpers";
import { CmmButton } from "@/components/ui/cmm-button";

// Types needed for integration
type EngagementType = "environnemental" | "social" | "humanitaire";
type EntityKind = "association" | "groupe_parole" | "evenement" | "commerce" | "entreprise";
type ContributionType =
  | "materiel"
  | "logistique"
  | "accueil"
  | "financement"
  | "communication";
type VerificationStatus = "verifie" | "en_cours" | "a_revalider";
type QualificationStatus = "partenaire_actif" | "contact_non_qualifie";

export type AnnuaireEntry = {
  id: string;
  name: string;
  legalIdentity: string;
  kind: EntityKind;
  scope?: "local" | "national" | "france";
  types: EngagementType[];
  description: string;
  location: string;
  lat: number;
  lng: number;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  coveredArrondissements: number[];
  contributionTypes: ContributionType[];
  availability: string;
  primaryChannel?: {
    platform: "site web" | "instagram" | "facebook";
    label: string;
    url: string;
  };
  verificationStatus: VerificationStatus;
  qualificationStatus: QualificationStatus;
  isFeatured?: boolean;
  featuredReason?: string;
  tags?: string[];
  lastUpdatedAt: string;
  recentActivityAt: string;
  internalAdminContact?: {
    referentName: string;
    email: string;
    phone: string;
  };
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

// Custom icons based on engagement type and style
const createBubbleIcon = (
  entry: AnnuaireEntry,
  highlighted = false,
) => {
  const primaryType = entry.types[0];
  let color = "#8b5cf6"; // violet default
  if (primaryType === "environnemental") color = "#6366f1"; // indigo/violet mix
  if (primaryType === "social") color = "#4f46e5"; // indigo
  if (primaryType === "humanitaire") color = "#7c3aed"; // violet deeper

  const initials = entry.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return L.divIcon({
    className: "custom-bubble-icon",
    html: `
      <div class="group relative flex items-center gap-2 transition-all duration-300 ${highlighted ? 'scale-110 z-[1000]' : 'hover:scale-105'}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg shadow-black/10 transition-transform overflow-hidden" 
             style="background-color: ${color}; color: white; font-weight: bold; font-size: 12px;">
          ${initials}
        </div>
        <div class="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap rounded-xl border border-violet-300/16 bg-[rgba(24,17,54,0.98)] px-3 py-1.5 shadow-xl backdrop-blur-sm">
          <p class="text-[11px] font-bold text-white">${entry.name}</p>
        </div>
      </div>
    `,
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Voyager">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {items.map((entry) => {
          const trustState = getEntryTrustState(entry);
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
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-violet-100/66">
                      {entry.description}
                    </p>
                    {trustState !== "trusted" ? (
                      <p className={`text-xs font-semibold ${trustState === "incomplete" ? "text-rose-300" : "text-amber-300"}`}>
                        {trustState === "incomplete" ? "Fiche à compléter" : "Fiche non confirmée"}
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
