"use client";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type {
  RouteRecommendationOrigin,
  RouteResponseOrigin,
  RouteMultiRouteDisplayMode,
} from "../route-types";
import type { RouteGuidedCoordinate, RouteTerritorialGuidedGroup } from "@/lib/route/route-planning-mode";
import { getRouteGroupVisualStyle } from "../route-types";
import type { MeetingPointProjection, RouteGroupRoute } from "@/lib/route/route-response-contract";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";

const EMPTY_CENTER: [number, number] = [48.8566, 2.3522];

export function buildRouteMapCoordinates(
  stops: RouteStop[],
  routeGeometry: RouteGeometry,
  origin?: RouteResponseOrigin | null,
): [number, number][] {
  const originCoordinates = origin
    ? ([[origin.latitude, origin.longitude]] as [number, number][])
    : [];
  const stopCoordinates = stops.map(
    (stop) => [stop.latitude, stop.longitude] as [number, number],
  );
  return [...originCoordinates, ...routeGeometry.coordinates, ...stopCoordinates];
}

function RouteMapViewport({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const uniqueCoordinates = coordinates.filter(
      (coordinate, index) =>
        coordinates.findIndex(
          (candidate) =>
            candidate[0] === coordinate[0] && candidate[1] === coordinate[1],
        ) === index,
    );
    if (uniqueCoordinates.length >= 2) {
      map.fitBounds(uniqueCoordinates, {
        padding: [32, 32],
        maxZoom: 16,
        animate: false,
      });
    }
  }, [coordinates, map]);

  return null;
}

function buildStopIcon(index: number, selected: boolean) {
  return divIcon({
    className: "cmm-route-stop-icon",
    html: `<span class="cmm-route-stop-icon__body${selected ? " cmm-route-stop-icon__body--selected" : ""}">${index + 1}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function buildOriginIcon() {
  return divIcon({
    className: "cmm-route-origin-icon",
    html: '<span class="cmm-route-origin-icon__body">Départ</span>',
    iconSize: [76, 28],
    iconAnchor: [38, 14],
  });
}

function buildGuidedWaypointIcon(groupIndex: number, order: number) {
  const visualStyle = getRouteGroupVisualStyle(groupIndex, "colors");
  return divIcon({
    className: "cmm-route-guided-waypoint-icon",
    html: `<span class="cmm-route-guided-waypoint-icon__body" style="background:${visualStyle.color}">${order}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function RouteOriginPicker({
  onSelectOrigin,
}: {
  onSelectOrigin: (origin: RouteRecommendationOrigin) => void;
}) {
  useMapEvents({
    click: ({ latlng }) => {
      onSelectOrigin({
        latitude: latlng.lat,
        longitude: latlng.lng,
        source: "map",
      });
    },
  });

  return null;
}

function RouteGuidedPointPicker({
  onSelectGuidedPoint,
}: {
  onSelectGuidedPoint: (coordinate: RouteGuidedCoordinate) => void;
}) {
  useMapEvents({
    click: ({ latlng }) => onSelectGuidedPoint({ latitude: latlng.lat, longitude: latlng.lng }),
  });
  return null;
}

type RouteMapProps = {
  stops: RouteStop[];
  routeGeometry: RouteGeometry;
  meetingPoint?: MeetingPointProjection | null;
  groupRoutes?: RouteGroupRoute[];
  representationMode?: RouteMultiRouteDisplayMode;
  selectedGroupIndex?: number | null;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  origin?: RouteResponseOrigin | null;
  onSelectOrigin?: (origin: RouteRecommendationOrigin) => void;
  onClearOrigin?: () => void;
  guidedGroups?: RouteTerritorialGuidedGroup[];
  guidedActiveGroupIndex?: number | null;
  onSelectGuidedPoint?: (coordinate: RouteGuidedCoordinate) => void;
  fr: boolean;
};

type RouteMapRenderProps = Omit<RouteMapProps, "groupRoutes" | "representationMode" | "selectedGroupIndex" | "selectedStopId" | "onSelectStop"> & {
  groupRoutes: RouteGroupRoute[];
  representationMode: RouteMultiRouteDisplayMode;
  selectedGroupIndex: number | null;
  selectedStopId: string | null;
  onSelectStop?: (stopId: string) => void;
};

function RouteMapAnchors({ groupRoutes, visibleGroupRoutes, stops, selectedStopId }: Pick<RouteMapRenderProps, "groupRoutes" | "stops" | "selectedStopId"> & { visibleGroupRoutes: RouteGroupRoute[] }) {
  return <>{(groupRoutes.length > 1 ? visibleGroupRoutes.flatMap((group) => group.stops.map((stop) => ({ group, stop }))) : stops.map((stop) => ({ group: null, stop }))).map(({ group, stop }) => <CircleMarker key={`anchor-${group?.groupIndex ?? "route"}-${stop.id}`} center={[stop.latitude, stop.longitude]} radius={selectedStopId === stop.id ? 13 : 9} pathOptions={{ color: "#064e3b", fillColor: "#6ee7b7", fillOpacity: selectedStopId === stop.id ? 0.25 : 0.12, weight: 2 }} interactive={false} />)}</>;
}

function RouteMapOrigin({ origin, fr, onClearOrigin }: Pick<RouteMapRenderProps, "origin" | "fr" | "onClearOrigin">) {
  if (!origin) return null;
  const label = origin.source === "map"
    ? (fr ? "Point choisi sur la carte" : "Point chosen on the map")
    : (fr ? "Point de départ utilisé" : "Starting point used");
  return <Marker position={[origin.latitude, origin.longitude]} icon={buildOriginIcon()}>
    <Tooltip direction="top" offset={[0, -12]}>{label}</Tooltip>
    <Popup>
      {label}
      {onClearOrigin ? <button type="button" onClick={onClearOrigin}>{fr ? "Réinitialiser" : "Reset"}</button> : null}
    </Popup>
  </Marker>;
}

function RouteMapLayers({
  stops,
  routeGeometry,
  meetingPoint,
  groupRoutes,
  representationMode,
  selectedGroupIndex,
  selectedStopId,
  onSelectStop,
  origin,
  onSelectOrigin,
  onClearOrigin,
  guidedGroups = [],
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
  visibleGroupRoutes,
  mapCoordinates,
  routeCoordinates,
}: RouteMapRenderProps & {
  visibleGroupRoutes: RouteGroupRoute[];
  mapCoordinates: [number, number][];
  routeCoordinates: [number, number][];
}) {
  return (
    <>
      <RouteMapViewport coordinates={mapCoordinates} />
      {onSelectOrigin ? <RouteOriginPicker onSelectOrigin={onSelectOrigin} /> : null}
      {onSelectGuidedPoint ? <RouteGuidedPointPicker onSelectGuidedPoint={onSelectGuidedPoint} /> : null}
      <RouteMapOrigin origin={origin} fr={fr} onClearOrigin={onClearOrigin} />
      {guidedGroups.map((group, index) => {
        const groupIndex = index + 1;
        const active = guidedActiveGroupIndex === null || guidedActiveGroupIndex === undefined || guidedActiveGroupIndex === groupIndex;
        return (
          <Circle
            key={`guided-sector-${groupIndex}`}
            center={[group.sector.center.latitude, group.sector.center.longitude]}
            radius={group.sector.radiusKm * 1000}
            pathOptions={{ color: getRouteGroupVisualStyle(groupIndex, "colors").color, fillOpacity: active ? 0.1 : 0.04, opacity: active ? 0.85 : 0.25, weight: active ? 2 : 1, dashArray: "6 6" }}
          />
        );
      })}
      {guidedGroups.flatMap((group, index) => group.waypoints.map((waypoint, waypointIndex) => ({ group, groupIndex: index + 1, waypoint, waypointIndex }))).map(({ group, groupIndex, waypoint, waypointIndex }) => {
        const active = guidedActiveGroupIndex === null || guidedActiveGroupIndex === undefined || guidedActiveGroupIndex === groupIndex;
        return (
          <Marker
            key={`guided-waypoint-${waypoint.id}`}
            position={[waypoint.latitude, waypoint.longitude]}
            icon={buildGuidedWaypointIcon(groupIndex, waypointIndex + 1)}
            opacity={active ? 1 : 0.35}
          >
            <Tooltip direction="top" offset={[0, -10]}>{`G${groupIndex} · ${waypointIndex + 1}. ${waypoint.label}`}</Tooltip>
            <Popup>
              <strong>{group.label ?? `${fr ? "Groupe" : "Group"} ${groupIndex}`} · {waypointIndex + 1}. {waypoint.label}</strong>
              <br />
              {fr ? "Passage planifié · aucune observation" : "Planned waypoint · not an observation"}
            </Popup>
          </Marker>
        );
      })}
      {(groupRoutes.length > 1
        ? visibleGroupRoutes.flatMap((group) => group.meetingPoint ? [{ groupIndex: group.groupIndex, meetingPoint: group.meetingPoint }] : [])
        : meetingPoint ? [{ groupIndex: null, meetingPoint }] : []
      ).map(({ groupIndex, meetingPoint: point }) => (
        <CircleMarker
          key={`meeting-point-${groupIndex ?? "route"}`}
          center={point.coordinates}
          radius={8}
          pathOptions={{ color: "#78350f", fillColor: "#fbbf24", fillOpacity: 0.95, weight: 3 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {fr ? "Rendez-vous intermédiaire" : "Intermediate meeting point"}
          </Tooltip>
          <Popup>
            <strong>{fr ? "Rendez-vous intermédiaire" : "Intermediate meeting point"}</strong>
            <br />
            {point.cumulativeDistanceKm === null ? (fr ? "Distance relative indisponible" : "Relative distance unavailable") : `${point.cumulativeDistanceKm.toFixed(2)} km ${fr ? "depuis le départ" : "from start"}`}
            <br />
            {point.estimatedDurationMinutes === null ? (fr ? "Temps relatif indisponible" : "Relative time unavailable") : `${Math.round(point.estimatedDurationMinutes)} min ${fr ? "depuis le départ" : "from start"}`}
          </Popup>
        </CircleMarker>
      ))}
      {groupRoutes.length > 1
        ? visibleGroupRoutes.map((group) => {
            const visualStyle = getRouteGroupVisualStyle(group.groupIndex, representationMode);
            return group.routeGeometry.coordinates.length >= 2 ? (
              <Polyline
                key={`group-route-${group.groupIndex}`}
                positions={group.routeGeometry.coordinates}
                pathOptions={{
                  ...visualStyle,
                  weight: selectedGroupIndex === group.groupIndex ? 7 : 5,
                  opacity: selectedGroupIndex === null ? 0.82 : selectedGroupIndex === group.groupIndex ? 0.95 : 0.2,
                  dashArray: group.routeGeometry.mode === "fallback"
                    ? visualStyle.dashArray ?? "10 10"
                    : visualStyle.dashArray,
                }}
              >
                <Tooltip sticky>
                  {fr ? `Groupe ${group.groupIndex} · ${group.travelDistanceKm.toFixed(2)} km · ${group.travelMinutes} min` : `Group ${group.groupIndex} · ${group.travelDistanceKm.toFixed(2)} km · ${group.travelMinutes} min`}
                </Tooltip>
              </Polyline>
            ) : null;
          })
        : routeCoordinates.length >= 2 ? (
        <Polyline
          positions={routeCoordinates}
          pathOptions={
            routeGeometry.mode === "network"
              ? { color: "#34d399", weight: 5, opacity: 0.9 }
              : {
                  color: "#fbbf24",
                  weight: 5,
                  opacity: 0.95,
                  dashArray: "10 10",
                }
          }
        >
          <Tooltip sticky>
            {routeGeometry.mode === "network"
              ? fr
                ? "Tracé suivant le réseau routable"
                : "Network route"
              : fr
                ? "Tracé estimé entre les arrêts"
                : "Estimated line between stops"}
          </Tooltip>
        </Polyline>
      ) : null}
      {(groupRoutes.length > 1
        ? visibleGroupRoutes.flatMap((group) => group.stops.map((stop, index) => ({ group, stop, index })))
        : stops.map((stop, index) => ({ group: null, stop, index }))).map(({ group, stop, index }) => {
        const selected = selectedStopId === stop.id;
        return (
          <Marker
            key={`${group?.groupIndex ?? "route"}-${stop.id}`}
            position={[stop.latitude, stop.longitude]}
            icon={buildStopIcon(index, selected)}
            eventHandlers={{
              click: () => onSelectStop?.(stop.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              {`${group ? `G${group.groupIndex} · ` : ""}${index + 1}. ${stop.label}`}
            </Tooltip>
            <Popup>
              <strong>{index + 1}. {stop.label}</strong>
              <br />
              {stop.segmentKm.toFixed(2)} km · {stop.estimatedMinutes} min
            </Popup>
          </Marker>
        );
      })}
        <RouteMapAnchors groupRoutes={groupRoutes} visibleGroupRoutes={visibleGroupRoutes} stops={stops} selectedStopId={selectedStopId} />
    </>
  );
}


function RouteMapModeLabel({ groupRoutes, visibleGroupRoutes, routeGeometry, fr }: { groupRoutes: RouteGroupRoute[]; visibleGroupRoutes: RouteGroupRoute[]; routeGeometry: RouteGeometry; fr: boolean }) {
  return <div className="absolute left-4 top-4 z-[1000] rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-white backdrop-blur-xl">
    {groupRoutes.length > 1 ? `${fr ? "Boucles coordonnées" : "Coordinated loops"} · ${visibleGroupRoutes.every(({ routeGeometry: geometry }) => geometry.mode === "network") ? (fr ? "réseau" : "network") : visibleGroupRoutes.some(({ routeGeometry: geometry }) => geometry.mode === "network") ? (fr ? "réseau + estimation" : "network + estimated") : (fr ? "estimées" : "estimated")}` : routeGeometry.mode === "network" ? `${fr ? "Réseau" : "Network"} · ${routeGeometry.provider.toUpperCase()} · ${fr ? "profil configuré" : "configured profile"}: ${routeGeometry.profile ?? "n/a"}` : fr ? "Itinéraire estimé · réseau indisponible" : "Estimated route · network unavailable"}
  </div>;
}

function RouteMapProviderNotice({ routeGeometry }: { routeGeometry: RouteGeometry }) {
  if (routeGeometry.mode !== "network" || routeGeometry.provider !== "fossgis-osrm") return null;
  return <p className="border-t border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-200">Routage piéton FOSSGIS / <a className="underline decoration-emerald-300 underline-offset-2" href="https://www.openstreetmap.org" rel="noreferrer" target="_blank">OpenStreetMap</a> · <a className="underline decoration-emerald-300 underline-offset-2" href="https://www.openstreetmap.org/fixthemap" rel="noreferrer" target="_blank">Corriger la carte</a></p>;
}

function RouteMapCanvas({
  stops,
  routeGeometry,
  meetingPoint,
  groupRoutes,
  representationMode,
  selectedGroupIndex,
  selectedStopId,
  onSelectStop,
  origin,
  onSelectOrigin,
  onClearOrigin,
  guidedGroups,
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
  visibleGroupRoutes,
  mapCoordinates,
  routeCoordinates,
  center,
}: RouteMapRenderProps & {
  visibleGroupRoutes: RouteGroupRoute[];
  mapCoordinates: [number, number][];
  routeCoordinates: [number, number][];
  center: [number, number];
}) {  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/18 bg-[rgba(10,31,50,0.98)] shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <RouteMapModeLabel groupRoutes={groupRoutes} visibleGroupRoutes={visibleGroupRoutes} routeGeometry={routeGeometry} fr={fr} />
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className="h-[430px] w-full"
      >
        <TileLayer
          attribution={CARTO_BASEMAPS.light.attribution}
          url={CARTO_BASEMAPS.light.url}
          crossOrigin="anonymous"
        />
        <RouteMapLayers
          stops={stops}
          routeGeometry={routeGeometry}
          meetingPoint={meetingPoint}
          groupRoutes={groupRoutes}
          representationMode={representationMode}
          selectedGroupIndex={selectedGroupIndex}
          selectedStopId={selectedStopId}
          onSelectStop={onSelectStop}
          origin={origin}
          onSelectOrigin={onSelectOrigin}
          onClearOrigin={onClearOrigin}
          guidedGroups={guidedGroups}
          guidedActiveGroupIndex={guidedActiveGroupIndex}
          onSelectGuidedPoint={onSelectGuidedPoint}
          fr={fr}
          visibleGroupRoutes={visibleGroupRoutes}
          mapCoordinates={mapCoordinates}
          routeCoordinates={routeCoordinates}
        />
      </MapContainer>
      <RouteMapProviderNotice routeGeometry={routeGeometry} />
    </section>
  );
}
export function RouteMap({
  stops,
  routeGeometry,
  meetingPoint = null,
  groupRoutes = [],
  representationMode = "colors",
  selectedGroupIndex = null,
  selectedStopId = null,
  onSelectStop,
  origin = null,
  onSelectOrigin,
  onClearOrigin,
  guidedGroups = [],
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
}: RouteMapProps) {
  const visibleGroupRoutes = selectedGroupIndex === null
    ? groupRoutes
    : groupRoutes.filter(({ groupIndex }) => groupIndex === selectedGroupIndex);
  const renderedGuidedGroups = guidedGroups.length > 0
    ? groupRoutes.length > 1 && selectedGroupIndex !== null
      ? guidedGroups.filter((_, index) => index + 1 === selectedGroupIndex)
      : guidedGroups
    : visibleGroupRoutes
      .filter(({ plannedSector, plannedWaypoints }) => plannedSector && plannedWaypoints && plannedWaypoints.length > 0)
      .map((group) => ({
        label: group.label,
        sector: group.plannedSector!,
        waypoints: group.plannedWaypoints!.map(({ id, label, latitude, longitude }) => ({ id, label, latitude, longitude })),
      }));
  const mapCoordinates = useMemo(() => {
    if (groupRoutes.length === 0) {
      return buildRouteMapCoordinates(stops, routeGeometry, origin);
    }
    return [
      ...(origin ? [[origin.latitude, origin.longitude] as [number, number]] : []),
      ...renderedGuidedGroups.flatMap((group) => [
        [group.sector.center.latitude, group.sector.center.longitude] as [number, number],
        ...group.waypoints.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
      ]),
      ...visibleGroupRoutes.flatMap(({ routeGeometry: geometry, stops: groupStops }) => [
        ...geometry.coordinates,
        ...groupStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
      ]),
    ];
  }, [groupRoutes, origin, renderedGuidedGroups, routeGeometry, stops, visibleGroupRoutes]);
  const routeCoordinates =
    routeGeometry.isLoop && routeGeometry.coordinates.length >= 2
      ? routeGeometry.coordinates
      : origin && stops.length > 0
        ? [
            [origin.latitude, origin.longitude] as [number, number],
            ...stops.map(
              (stop) => [stop.latitude, stop.longitude] as [number, number],
            ),
            [origin.latitude, origin.longitude] as [number, number],
          ]
        : [];
  const center = origin
    ? [origin.latitude, origin.longitude] as [number, number]
    : routeCoordinates[0] ?? EMPTY_CENTER;

  return <RouteMapCanvas
    stops={stops}
    routeGeometry={routeGeometry}
    meetingPoint={meetingPoint}
    groupRoutes={groupRoutes}
    representationMode={representationMode}
    selectedGroupIndex={selectedGroupIndex}
    selectedStopId={selectedStopId}
    onSelectStop={onSelectStop}
    origin={origin}
    onSelectOrigin={onSelectOrigin}
    onClearOrigin={onClearOrigin}
    guidedGroups={renderedGuidedGroups}
    guidedActiveGroupIndex={guidedActiveGroupIndex}
    onSelectGuidedPoint={onSelectGuidedPoint}
    fr={fr}
    visibleGroupRoutes={visibleGroupRoutes}
    mapCoordinates={mapCoordinates}
    routeCoordinates={routeCoordinates}
    center={center}
  />;
}
