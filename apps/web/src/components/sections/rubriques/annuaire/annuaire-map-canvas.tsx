"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  LayersControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { cn } from "@/lib/utils";
import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";
import { CmmButton } from "@/components/ui/cmm-button";
import { PARIS_RELATION_TYPE_META } from "@/lib/partners/paris-cleanwalk-network";
import {
  PARIS_INTRAMUROS_BOUNDS,
  type GeoNetworkEntity,
  type GeoNetworkIncidentRelation,
} from "./annuaire-geo-network.model";
import { hasPreciseAnnuaireCoordinates } from "./annuaire-helpers";
import { buildClusterMarkerIconHtml, buildNamedMarkerIconHtml } from "./annuaire-map-icon";

type MarkerCluster = {
  key: string;
  lat: number;
  lng: number;
  members: GeoNetworkEntity[];
};

function clusterEntitiesByZoom(entities: GeoNetworkEntity[], zoom: number): MarkerCluster[] {
  const plottable = entities.filter((e) => e.coords !== null);
  if (zoom >= 14) {
    return plottable.map((entity) => ({
      key: entity.id,
      lat: entity.coords!.lat,
      lng: entity.coords!.lng,
      members: [entity],
    }));
  }
  const threshold = zoom <= 10 ? 0.03 : zoom <= 12 ? 0.008 : 0.003;
  const clusters: MarkerCluster[] = [];
  for (const entity of plottable) {
    const { lat, lng } = entity.coords!;
    const existing = clusters.find(
      (c) => Math.abs(c.lat - lat) < threshold && Math.abs(c.lng - lng) < threshold,
    );
    if (existing) {
      existing.members.push(entity);
    } else {
      clusters.push({ key: entity.id, lat, lng, members: [entity] });
    }
  }
  return clusters;
}

function MapController({
  entities,
  highlightedItemId,
  onZoomChange,
  cameraCommand,
}: {
  entities: GeoNetworkEntity[];
  highlightedItemId?: string | null;
  onZoomChange: (zoom: number) => void;
  cameraCommand: { type: "paris" | "all" | null; seq: number };
}) {
  const map = useMap();
  const initializedRef = useRef(false);
  const lastSeqRef = useRef(0);

  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  // Cadrage initial sur Paris intramuros uniquement (jamais réinitialisé au survol ou filtre)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    map.fitBounds(PARIS_INTRAMUROS_BOUNDS, { padding: [24, 24] });
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  // Déplacement explicite sur sélection (sans changer le zoom local)
  useEffect(() => {
    if (!highlightedItemId) return;
    const target = entities.find((e) => e.id === highlightedItemId);
    if (!target?.coords) return;
    map.panTo([target.coords.lat, target.coords.lng], { animate: true, duration: 0.4 });
  }, [highlightedItemId, entities, map]);

  // Actions explicites de cadrage (Recentrer Paris / Voir tout le réseau)
  useEffect(() => {
    if (cameraCommand.seq === lastSeqRef.current || !cameraCommand.type) return;
    lastSeqRef.current = cameraCommand.seq;
    if (cameraCommand.type === "paris") {
      map.fitBounds(PARIS_INTRAMUROS_BOUNDS, { padding: [24, 24] });
    } else {
      const pts = entities
        .filter((e) => e.coords !== null)
        .map((e) => [e.coords!.lat, e.coords!.lng] as [number, number]);
      if (pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 13 });
      }
    }
  }, [cameraCommand, entities, map]);

  return null;
}

export interface AnnuaireMapCanvasProps {
  items?: AnnuaireEntry[];
  entities?: GeoNetworkEntity[];
  incidentRelations?: GeoNetworkIncidentRelation[];
  showRelationsLayer?: boolean;
  highlightedItemId?: string | null;
  onItemClick?: (id: string) => void;
  variant?: "standard" | "exploration";
  fr?: boolean;
}

export function AnnuaireMapCanvas({
  items = [],
  entities: externalEntities,
  incidentRelations = [],
  showRelationsLayer = true,
  highlightedItemId,
  onItemClick,
  variant = "standard",
  fr = true,
}: AnnuaireMapCanvasProps) {
  const [zoom, setZoom] = useState(12);
  const [cameraCommand, setCameraCommand] = useState<{ type: "paris" | "all" | null; seq: number }>({
    type: null,
    seq: 0,
  });

  const entities = useMemo<GeoNetworkEntity[]>(() => {
    if (externalEntities) return externalEntities;
    return items
      .filter(hasPreciseAnnuaireCoordinates)
      .map((entry) => ({
        id: entry.id,
        annuaireEntryId: entry.id,
        networkActorId: null,
        name: entry.name,
        shortName: entry.name.slice(0, 18),
        entry: { ...entry, distanceKm: null },
        networkActor: null,
        coords: { lat: entry.lat!, lng: entry.lng! },
        locationGroup: "in_paris",
        communeLabel: entry.location,
        siteNature: null,
        sourceUrl: entry.websiteUrl ?? null,
        primaryFamily: entry.types[0] ?? "environnemental",
      }));
  }, [externalEntities, items]);

  const clusters = useMemo(() => clusterEntitiesByZoom(entities, zoom), [entities, zoom]);
  const plottableRelations = useMemo(
    () => (showRelationsLayer ? incidentRelations.filter((r) => r.hasPlottableLine) : []),
    [incidentRelations, showRelationsLayer],
  );
  const hasOutsideCity = entities.some((e) => e.locationGroup === "outside_paris");
  const isExploration = variant === "exploration";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)]",
        isExploration ? "h-[62vh] min-h-[420px] rounded-2xl" : "h-[500px] rounded-xl",
      )}
    >
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap gap-2">
        <CmmButton
          type="button"
          size="sm"
          tone="secondary"
          variant="pill"
          onClick={() => setCameraCommand((c) => ({ type: "paris", seq: c.seq + 1 }))}
        >
          {fr ? "Recentrer sur Paris" : "Recenter Paris"}
        </CmmButton>
        {hasOutsideCity ? (
          <CmmButton
            type="button"
            size="sm"
            tone="secondary"
            variant="pill"
            onClick={() => setCameraCommand((c) => ({ type: "all", seq: c.seq + 1 }))}
          >
            {fr ? "Voir tout le réseau" : "View full network"}
          </CmmButton>
        ) : null}
      </div>

      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={12}
        scrollWheelZoom
        className="relative z-0 h-full w-full"
      >
        <MapController
          entities={entities}
          highlightedItemId={highlightedItemId}
          onZoomChange={setZoom}
          cameraCommand={cameraCommand}
        />
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

        {plottableRelations.map(({ relation, fromEntity, toEntity }) => {
          const isScheduled = relation.relationType === "collaboration_programmee";
          const isUncertain = relation.source.certainty === "partiel_ou_incertain";
          const color = isScheduled
            ? "#0284c7"
            : isUncertain
              ? "#d97706"
              : "#6d28d9";
          const dashArray = isScheduled
            ? "4 6"
            : isUncertain || !relation.frequencyKnown
              ? "8 6"
              : undefined;
          return (
            <Polyline
              key={relation.id}
              positions={[
                [fromEntity.coords!.lat, fromEntity.coords!.lng],
                [toEntity.coords!.lat, toEntity.coords!.lng],
              ]}
              pathOptions={{
                color,
                weight: relation.frequencyKnown ? 3.5 : 2.5,
                opacity: 0.85,
                dashArray,
              }}
            >
              <Tooltip sticky>
                <span className="text-xs font-semibold">
                  {fromEntity.name} → {toEntity.name} ·{" "}
                  {PARIS_RELATION_TYPE_META[relation.relationType].label}
                </span>
              </Tooltip>
            </Polyline>
          );
        })}

        {clusters.map((cluster) => {
          if (cluster.members.length === 1) {
            const entity = cluster.members[0];
            const isHighlighted = highlightedItemId === entity.id;
            const icon = L.divIcon({
              className: "cmm-named-marker",
              html: buildNamedMarkerIconHtml({
                name: entity.name,
                shortName: entity.shortName,
                family: entity.primaryFamily,
                highlighted: isHighlighted,
                outsideCity: entity.locationGroup === "outside_paris",
              }),
              iconSize: undefined,
              iconAnchor: [16, 16],
            });
            return (
              <Marker
                key={entity.id}
                position={[cluster.lat, cluster.lng]}
                icon={icon}
                title={entity.name}
                eventHandlers={{
                  click: () => onItemClick?.(entity.id),
                }}
              />
            );
          }

          const hasHighlighted = cluster.members.some((m) => m.id === highlightedItemId);
          const clusterIcon = L.divIcon({
            className: "cmm-cluster-marker",
            html: buildClusterMarkerIconHtml(cluster.members.length, hasHighlighted),
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          return (
            <Marker
              key={`cluster-${cluster.key}`}
              position={[cluster.lat, cluster.lng]}
              icon={clusterIcon}
              title={`${cluster.members.length} structures`}
            >
              <Popup>
                <div className="min-w-[12rem] space-y-2 p-1">
                  <p className="text-xs font-bold">
                    {cluster.members.length} {fr ? "structures à proximité" : "nearby structures"}
                  </p>
                  <ul className="m-0 list-none space-y-1 p-0">
                    {cluster.members.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => onItemClick?.(member.id)}
                          className="w-full rounded px-2 py-1 text-left text-xs font-semibold hover:bg-violet-500/10"
                        >
                          {member.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
