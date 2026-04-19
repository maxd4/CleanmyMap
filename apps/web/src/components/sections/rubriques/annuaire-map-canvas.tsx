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
  zone: string;
  engagementLevel: "initie" | "actif" | "referent";
  contributionTypes: Array<
    "materiel" | "logistique" | "accueil" | "financement" | "communication"
  >;
  availability: "ponctuelle" | "mensuelle" | "evenementielle";
  verificationLevel: "non_verifie" | "auto_declare" | "verifie";
  preferredChannel: string;
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
  primaryChannel: {
    platform: "site web" | "instagram" | "facebook";
    label: string;
    url: string;
  };
  verificationStatus: VerificationStatus;
  qualificationStatus: QualificationStatus;
  lastUpdatedAt: string;
  recentActivityAt: string;
  internalAdminContact?: {
    referentName: string;
    email: string;
    phone: string;
  };
};

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

// Custom icons based on entity kind
const createCustomIcon = (kind: EntityKind, highlighted = false) => {
  let color = "#10b981"; // emerald default (association)
  if (kind === "commerce" || kind === "entreprise") color = "#f59e0b"; // amber
  if (kind === "evenement") color = "#3b82f6"; // blue
  if (kind === "groupe_parole") color = "#8b5cf6"; // violet

  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div style="background-color: ${color}; width: ${highlighted ? "18px" : "14px"}; height: ${highlighted ? "18px" : "14px"}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); outline: ${highlighted ? "3px solid #1d4ed8" : "none"};"></div>`,
    iconSize: [highlighted ? 18 : 14, highlighted ? 18 : 14],
    iconAnchor: [highlighted ? 9 : 7, highlighted ? 9 : 7],
  });
};

export function AnnuaireMapCanvas({
  items,
  highlightedItemId,
}: {
  items: AnnuaireEntry[];
  highlightedItemId?: string | null;
}) {
  const center = useMemo<[number, number]>(() => {
    return PARIS_CENTER;
  }, []);

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full bg-slate-50 relative z-0"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mode Clair">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mode Sombre">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {items.map((entry) => (
          <Marker
            key={entry.id}
            position={[entry.lat, entry.lng]}
            icon={createCustomIcon(entry.kind, highlightedItemId === entry.id)}
          >
            <Popup className="rounded-xl">
              <div className="w-64 space-y-2 p-1">
                <h4 className="font-semibold text-slate-900 leading-tight">{entry.name}</h4>
                <div className="flex flex-wrap gap-1">
                  {entry.types.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] uppercase font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mt-1">{entry.description}</p>
                <p className="text-[11px] text-slate-500">
                  Zone couverte: {entry.coveredArrondissements.length > 0 ? `Paris ${entry.coveredArrondissements.join(", ")}` : entry.location}
                </p>
                <p className="text-[11px] text-slate-500">
                  Statut: {entry.verificationStatus === "verifie" ? "verifie" : entry.verificationStatus === "en_cours" ? "en cours" : "a revalider"} | MAJ: {entry.lastUpdatedAt}
                </p>
                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <div className="flex gap-2">
                    {entry.websiteUrl && (
                      <a href={entry.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-600">
                        <Globe size={14} />
                      </a>
                    )}
                    {entry.instagramUrl && (
                      <a href={entry.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-rose-600">
                        <Instagram size={14} />
                      </a>
                    )}
                  </div>
                  <a
                    href={entry.primaryChannel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Contacter ({entry.primaryChannel.platform}) <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
