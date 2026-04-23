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
const createCustomIcon = (
  kind: EntityKind,
  trustState: "trusted" | "pending" | "incomplete",
  highlighted = false,
) => {
  let color = "#10b981"; // emerald default (association)
  if (kind === "commerce" || kind === "entreprise") color = "#f59e0b"; // amber
  if (kind === "evenement") color = "#3b82f6"; // blue
  if (kind === "groupe_parole") color = "#8b5cf6"; // violet
  const outline =
    trustState === "incomplete"
      ? "#fb7185"
      : trustState === "pending"
        ? "#f59e0b"
        : highlighted
          ? "#1d4ed8"
          : "transparent";

  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div style="background-color: ${color}; width: ${highlighted ? "18px" : "14px"}; height: ${highlighted ? "18px" : "14px"}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); outline: ${outline === "transparent" ? "none" : `3px solid ${outline}`}; opacity: ${trustState === "trusted" ? 1 : 0.82};"></div>`,
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

        {items.map((entry) => {
          const trustState = getEntryTrustState(entry);
          return (
            <Marker
              key={entry.id}
              position={[entry.lat, entry.lng]}
              icon={createCustomIcon(
                entry.kind,
                trustState,
                highlightedItemId === entry.id,
              )}
            >
              <Popup className="rounded-xl">
                <div className="w-64 space-y-2 p-1">
                  <h4 className="font-semibold leading-tight text-slate-900">{entry.name}</h4>
                  <div className="flex flex-wrap gap-1">
                    {entry.types.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {entry.description}
                  </p>
                  {trustState !== "trusted" ? (
                    <p
                      className={`text-[11px] font-semibold ${
                        trustState === "incomplete"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}
                    >
                      {trustState === "incomplete"
                        ? "Fiche à compléter"
                        : "Fiche non confirmée"}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-slate-500">
                    Zone couverte:{" "}
                    {entry.coveredArrondissements.length > 0
                      ? `Paris ${entry.coveredArrondissements.join(", ")}`
                      : entry.location}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Statut:{" "}
                    {entry.verificationStatus === "verifie"
                      ? "vérifiée"
                      : entry.verificationStatus === "en_cours"
                        ? "en cours"
                        : "à revalider"}{" "}
                    | MAJ: {entry.lastUpdatedAt}
                  </p>
                  {trustState === "trusted" ? (
                    <p className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900">
                      {getPartnerWhyThisStructureMatters(entry)}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                    {entry.primaryChannel ? (
                      <a
                        href={entry.primaryChannel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-700"
                      >
                        Contacter <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                        Canal public à confirmer
                      </span>
                    )}
                    {entry.websiteUrl ? (
                      <a
                        href={entry.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Site officiel <Globe size={10} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
