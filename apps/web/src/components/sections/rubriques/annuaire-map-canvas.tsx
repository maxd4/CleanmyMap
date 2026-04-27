"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import { ExternalLink, Instagram, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEntryTrustState, getPartnerWhyThisStructureMatters } from "./annuaire-helpers";

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
  if (primaryType === "environnemental") color = "#10b981"; // emerald
  if (primaryType === "social") color = "#3b82f6"; // blue
  if (primaryType === "humanitaire") color = "#f43f5e"; // rose

  const initials = entry.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return L.divIcon({
    className: "custom-bubble-icon",
    html: `
      <div class="group relative flex items-center gap-2 transition-all duration-300 ${highlighted ? 'scale-110 z-[1000]' : 'hover:scale-105'}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg shadow-black/10 transition-transform overflow-hidden" 
             style="background-color: ${color}; color: white; font-weight: bold; font-size: 12px;">
          ${initials}
        </div>
        <div class="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          <p class="text-[11px] font-bold text-slate-900">${entry.name}</p>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export function AnnuaireMapCanvas({
  items,
  highlightedItemId,
  onItemClick,
  variant = "standard",
}: {
  items: AnnuaireEntry[];
  highlightedItemId?: string | null;
  onItemClick?: (id: string) => void;
  variant?: "standard" | "exploration";
}) {
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
      "w-full overflow-hidden border border-slate-200 bg-slate-50 transition-all duration-500",
      isExploration ? "h-[750px] rounded-[2.5rem] shadow-2xl border-white/50" : "h-[500px] rounded-xl"
    )}>
      <MapContainer
        center={center}
        zoom={isExploration ? 13 : 12}
        scrollWheelZoom
        className="h-full w-full bg-slate-50 relative z-0"
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
          const initials = entry.name.split(" ").map(n => n[0]).join("").slice(0, 2);
          const color = entry.types.includes("environnemental") ? "emerald" : 
                        entry.types.includes("social") ? "blue" : 
                        entry.types.includes("humanitaire") ? "rose" : "violet";
          
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
                <Popup className="rounded-xl">
                  <div className="w-64 space-y-2 p-1">
                    <h4 className="font-semibold leading-tight cmm-text-primary">{entry.name}</h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.types.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase cmm-text-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 line-clamp-3 cmm-text-caption leading-relaxed cmm-text-secondary">
                      {entry.description}
                    </p>
                    {trustState !== "trusted" ? (
                      <p className={`cmm-text-caption font-semibold ${trustState === "incomplete" ? "text-rose-700" : "text-amber-700"}`}>
                        {trustState === "incomplete" ? "Fiche à compléter" : "Fiche non confirmée"}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                      <CmmButton size="sm" tone="violet" onClick={() => onItemClick?.(entry.id)}>
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
