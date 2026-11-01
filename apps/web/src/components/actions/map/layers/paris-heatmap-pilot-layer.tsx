"use client";

import { useMemo, useState } from "react";
import { CircleMarker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  buildParisHeatmapPilot,
  groupParisHeatmapPilotMicroPlaces,
  type ParisHeatmapPilotLayer,
  type ParisHeatmapPilotMode,
  type ParisHeatmapPilotSegment,
} from "@/lib/geo/paris-heatmap-pilot";

const MICRO_PLACE_COLORS: Record<string, string> = {
  hospitality_and_smoking: "#be185d",
  food_takeaway_and_market: "#c2410c",
  transport_waiting: "#0369a1",
  education_and_work: "#7e22ce",
  tourism_and_culture: "#4338ca",
};

function scoreForMode(segment: ParisHeatmapPilotSegment, mode: ParisHeatmapPilotMode): number | null {
  return segment.scores[mode];
}

function colorForScore(score: number | null): string {
  if (score === null) return "#64748b";
  if (score >= 75) return "#b91c1c";
  if (score >= 50) return "#ea580c";
  if (score >= 25) return "#ca8a04";
  return "#15803d";
}

function HeatmapZoomListener({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: (event) => onZoom(event.target.getZoom()) });
  return null;
}

function SegmentPopup({ segment }: { segment: ParisHeatmapPilotSegment }) {
  return (
    <div className="min-w-52 space-y-1 text-sm">
      <p className="font-semibold text-slate-900">{segment.name}</p>
      <p className="text-xs text-slate-600">Tronçon OSM {segment.id} · {segment.lengthKm.toFixed(3)} km</p>
      <p>Mégots : {segment.scores.cigaretteButts === null ? "indisponible" : formatScorePercent(segment.scores.cigaretteButts, 1)}</p>
      <p>Déchets : {segment.scores.waste === null ? "indisponible" : formatScorePercent(segment.scores.waste, 1)}</p>
      <p>Mixte : {segment.scores.mixed === null ? "indisponible" : formatScorePercent(segment.scores.mixed, 1)}</p>
      <p className="text-xs text-slate-600">Facteurs dominants : {segment.dominantFactors.join(", ") || "non disponibles"}</p>
      <p className="text-xs text-slate-600">IRIS de référence : {segment.irisReferenceId ?? "inconnu"}</p>
      <p className="text-xs font-semibold text-slate-700">Statut : {segment.status === "predicted" ? "prédictif" : "indisponible"}</p>
      <p className="text-xs text-slate-500">OSM snapshot · référence IRIS invisible · coefficients polarisés non calibrés.</p>
    </div>
  );
}

function MicroPlacePopup({
  count,
  names,
  families,
}: {
  count: number;
  names: string[];
  families: string[];
}) {
  return (
    <div className="min-w-44 space-y-1 text-sm">
      <p className="font-semibold text-slate-900">Micro-lieux prédictifs</p>
      <p>{count} point{count > 1 ? "s" : ""} regroupé{count > 1 ? "s" : ""}</p>
      <p className="text-xs text-slate-600">Familles : {families.join(", ")}</p>
      <p className="text-xs text-slate-600">{names.join(", ")}</p>
      <p className="text-xs text-slate-500">Source : snapshot OSM versionné. Présence géographique, pas mesure de pollution.</p>
    </div>
  );
}

export function ParisHeatmapPilotLayer({
  visible,
  mode = "mixed",
  layer = buildParisHeatmapPilot({ mode }),
}: {
  visible: boolean;
  mode?: ParisHeatmapPilotMode;
  layer?: ParisHeatmapPilotLayer;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const groupedMicroPlaces = useMemo(
    () => groupParisHeatmapPilotMicroPlaces(layer.microPlaces, zoom),
    [layer.microPlaces, zoom],
  );

  if (!visible || layer.status === "unavailable") return null;

  return (
    <>
      <HeatmapZoomListener onZoom={setZoom} />
      {layer.segments.map((segment) => {
        const score = scoreForMode(segment, mode);
        return (
          <Polyline
            key={`heatmap-segment-${segment.id}`}
            positions={segment.geometry}
            pathOptions={{ color: colorForScore(score), opacity: 0.88, weight: 5 }}
          >
            <Popup><SegmentPopup segment={segment} /></Popup>
          </Polyline>
        );
      })}
      {groupedMicroPlaces.map((group) => {
        const color = MICRO_PLACE_COLORS[group.families[0] ?? ""] ?? "#475569";
        return (
          <CircleMarker
            key={`heatmap-micro-${group.id}`}
            center={group.coordinate}
            radius={group.count > 1 ? Math.min(13, 7 + group.count) : 6}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.78, weight: 2 }}
          >
            <Popup><MicroPlacePopup count={group.count} names={group.names} families={group.families} /></Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
