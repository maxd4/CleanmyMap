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
  RouteStartZone,
} from "../route-types";
import type { RouteGuidedCoordinate, RouteTerritorialGuidedGroup } from "@/lib/route/route-planning-mode";
import { getRouteGroupVisualStyle } from "../route-types";
import type { MeetingPointProjection, RouteGroupRoute } from "@/lib/route/route-response-contract";
import type {
  RouteRiskHeatmap,
  RouteRiskHeatmapCategory,
} from "@/lib/route/route-risk-heatmap-contract";
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

function RouteZoneCenterPicker({
  onSelectZoneCenter,
}: {
  onSelectZoneCenter: (coordinate: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click: ({ latlng }) => onSelectZoneCenter({ latitude: latlng.lat, longitude: latlng.lng }),
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
  startZone?: RouteStartZone | null;
  onSelectZoneCenter?: (coordinate: { latitude: number; longitude: number }) => void;
  guidedGroups?: RouteTerritorialGuidedGroup[];
  guidedActiveGroupIndex?: number | null;
  onSelectGuidedPoint?: (coordinate: RouteGuidedCoordinate) => void;
  riskHeatmap?: RouteRiskHeatmap;
  riskHeatmapCategory?: RouteRiskHeatmapCategory;
  onRiskHeatmapCategoryChange?: (category: RouteRiskHeatmapCategory) => void;
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

function heatmapRiskValue(
  segment: RouteRiskHeatmap["segments"][number],
  category: RouteRiskHeatmapCategory,
): number | null {
  if (segment.riskStatus !== "predicted") return null;
  if (category === "waste") return segment.wasteRisk;
  if (category === "cigaretteButts") return segment.cigaretteButtRisk;
  return segment.mixedRisk;
}

function heatmapColor(value: number): string {
  if (value >= 75) return "#dc2626";
  if (value >= 50) return "#f59e0b";
  return "#16a34a";
}

function heatmapCategoryLabel(category: RouteRiskHeatmapCategory, fr: boolean): string {
  if (category === "waste") return fr ? "Déchets" : "Waste";
  if (category === "cigaretteButts") return fr ? "Mégots" : "Cigarette butts";
  return fr ? "Mixte" : "Mixed";
}

function RouteRiskHeatmapLayer({
  heatmap,
  category,
  fr,
}: {
  heatmap: RouteRiskHeatmap;
  category: RouteRiskHeatmapCategory;
  fr: boolean;
}) {
  return <>{heatmap.segments.map((segment) => {
    const value = heatmapRiskValue(segment, category);
    if (value === null || segment.coordinates.length < 2) return null;
    const confidence = category === "waste"
      ? segment.wasteConfidence
      : category === "cigaretteButts"
        ? segment.cigaretteButtConfidence
        : segment.wasteConfidence === segment.cigaretteButtConfidence
          ? segment.wasteConfidence
          : null;
    const confidenceLabel = confidence
      ? `${confidence.level} (${Math.round(confidence.score * 100)} %)`
      : (fr ? "inconnue" : "unknown");
    return <Polyline
      key={`risk-${segment.projectionSegmentId}`}
      positions={segment.coordinates}
      pathOptions={{
        color: heatmapColor(value),
        weight: 7,
        opacity: 0.3 + (Math.max(0, Math.min(100, value)) / 100) * 0.55,
        lineCap: "round",
      }}
    >
      <Tooltip sticky>{`${heatmapCategoryLabel(category, fr)} · ${Math.round(value)}/100 · ${confidenceLabel}`}</Tooltip>
      <Popup>
        <strong>{fr ? "Risque théorique du segment" : "Theoretical segment risk"}</strong>
        <br />
        {heatmapCategoryLabel(category, fr)} : {Math.round(value)}/100
        <br />
        {fr ? "Confiance" : "Confidence"} : {confidenceLabel}
        <br />
        {fr ? "Résolution" : "Resolution"} : {segment.effectiveResolution}
        <br />
        {fr ? "Source" : "Source"} : {segment.sourceVersions.riskModelVersion}
        <br />
        {fr ? "Rafraîchi" : "Refreshed"} : {segment.sourceVersions.pressureRefreshedAt}
        {segment.provenance.length > 0 ? <><br />{fr ? "Provenance" : "Provenance"} : {segment.provenance.join(", ")}</> : null}
      </Popup>
    </Polyline>;
  })}</>;
}

function RouteRiskHeatmapControls({
  heatmap,
  category,
  onChange,
  fr,
}: {
  heatmap: RouteRiskHeatmap;
  category: RouteRiskHeatmapCategory;
  onChange?: (category: RouteRiskHeatmapCategory) => void;
  fr: boolean;
}) {
  const buttons: Array<[RouteRiskHeatmapCategory, string, string]> = [
    ["cigaretteButts", fr ? "Mégots" : "Cigarette butts", "#dc2626"],
    ["waste", fr ? "Déchets" : "Waste", "#f59e0b"],
    ["mixed", fr ? "Mixte" : "Mixed", "#16a34a"],
  ];
  return <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[1000] rounded-2xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur-xl" data-route-risk-heatmap>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <fieldset>
        <legend className="cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-100/75">{fr ? "Couche de risque théorique" : "Theoretical risk layer"}</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={fr ? "Filtrer la couche de risque" : "Filter risk layer"}>
          {buttons.map(([value, label, color]) => <button key={value} type="button" aria-pressed={category === value} onClick={() => onChange?.(value)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${category === value ? "border-white bg-white/15" : "border-white/15 bg-white/[0.04] hover:border-white/35"}`}><span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</button>)}
        </div>
      </fieldset>
      <div className="text-right text-xs font-semibold text-slate-200/80">
        <p>{heatmap.counts.predictedSegments} {fr ? "segments estimés" : "estimated segments"} · {heatmap.counts.unavailableSegments} {fr ? "indisponibles" : "unavailable"}</p>
        <p>{fr ? "Modèle" : "Model"} : {heatmap.sourceVersions.riskModelVersion} · {fr ? "rafraîchi" : "refreshed"} {heatmap.sourceVersions.pressureRefreshedAt}</p>
        <p className="text-emerald-100/70">{fr ? "Ce n’est pas une mesure de pollution observée." : "This is not a measurement of observed pollution."}</p>
      </div>
    </div>
    <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-200/75" aria-label={fr ? "Légende du risque" : "Risk legend"}>
      <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />0–49</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />50–74</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-600" />75–100</span>
    </div>
  </div>;
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
  startZone,
  onSelectZoneCenter,
  guidedGroups = [],
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
  riskHeatmap,
  riskHeatmapCategory,
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
      {riskHeatmap ? <RouteRiskHeatmapLayer heatmap={riskHeatmap} category={riskHeatmapCategory ?? "mixed"} fr={fr} /> : null}
      {onSelectOrigin ? <RouteOriginPicker onSelectOrigin={onSelectOrigin} /> : null}
      {onSelectZoneCenter ? <RouteZoneCenterPicker onSelectZoneCenter={onSelectZoneCenter} /> : null}
      {onSelectGuidedPoint ? <RouteGuidedPointPicker onSelectGuidedPoint={onSelectGuidedPoint} /> : null}
      <RouteMapOrigin origin={origin} fr={fr} onClearOrigin={onClearOrigin} />
      {startZone ? <Circle center={[startZone.center.latitude, startZone.center.longitude]} radius={startZone.radiusKm * 1000} pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.08, weight: 2, dashArray: "8 6" }} /> : null}
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
    {groupRoutes.length > 1 ? `${visibleGroupRoutes.every(({ routeGeometry: geometry }) => geometry.isLoop) ? (fr ? "Boucles coordonnées" : "Coordinated loops") : (fr ? "Trajets ouverts coordonnés" : "Coordinated open routes")} · ${visibleGroupRoutes.every(({ routeGeometry: geometry }) => geometry.mode === "network") ? (fr ? "réseau" : "network") : visibleGroupRoutes.some(({ routeGeometry: geometry }) => geometry.mode === "network") ? (fr ? "réseau + estimation" : "network + estimated") : (fr ? "estimées" : "estimated")}` : routeGeometry.mode === "network" ? `${fr ? "Réseau" : "Network"} · ${routeGeometry.provider.toUpperCase()} · ${fr ? "profil configuré" : "configured profile"}: ${routeGeometry.profile ?? "n/a"}` : fr ? "Itinéraire estimé · réseau indisponible" : "Estimated route · network unavailable"}
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
  startZone,
  onSelectZoneCenter,
  guidedGroups,
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
  riskHeatmap,
  riskHeatmapCategory,
  onRiskHeatmapCategoryChange,
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
          startZone={startZone}
          onSelectZoneCenter={onSelectZoneCenter}
          guidedGroups={guidedGroups}
          guidedActiveGroupIndex={guidedActiveGroupIndex}
          onSelectGuidedPoint={onSelectGuidedPoint}
          fr={fr}
          riskHeatmap={riskHeatmap}
          riskHeatmapCategory={riskHeatmapCategory}
          onRiskHeatmapCategoryChange={onRiskHeatmapCategoryChange}
          visibleGroupRoutes={visibleGroupRoutes}
          mapCoordinates={mapCoordinates}
          routeCoordinates={routeCoordinates}
        />
      </MapContainer>
      {riskHeatmap ? <RouteRiskHeatmapControls heatmap={riskHeatmap} category={riskHeatmapCategory ?? "mixed"} onChange={onRiskHeatmapCategoryChange} fr={fr} /> : null}
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
  startZone,
  onSelectZoneCenter,
  guidedGroups = [],
  guidedActiveGroupIndex,
  onSelectGuidedPoint,
  fr,
  riskHeatmap,
  riskHeatmapCategory = "mixed",
  onRiskHeatmapCategoryChange,
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
      return [
        ...buildRouteMapCoordinates(stops, routeGeometry, origin),
        ...(riskHeatmap?.segments.flatMap((segment) => segment.coordinates) ?? []),
        ...(startZone ? [[startZone.center.latitude, startZone.center.longitude] as [number, number]] : []),
      ];
    }
    return [
      ...(origin ? [[origin.latitude, origin.longitude] as [number, number]] : []),
      ...(startZone ? [[startZone.center.latitude, startZone.center.longitude] as [number, number]] : []),
      ...renderedGuidedGroups.flatMap((group) => [
        [group.sector.center.latitude, group.sector.center.longitude] as [number, number],
        ...group.waypoints.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
      ]),
      ...visibleGroupRoutes.flatMap(({ routeGeometry: geometry, stops: groupStops }) => [
        ...geometry.coordinates,
        ...groupStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
      ]),
      ...(riskHeatmap?.segments.flatMap((segment) => segment.coordinates) ?? []),
    ];
  }, [groupRoutes, origin, renderedGuidedGroups, riskHeatmap, routeGeometry, startZone, stops, visibleGroupRoutes]);
  const routeCoordinates =
    routeGeometry.coordinates.length >= 2
      ? routeGeometry.coordinates
      : origin && stops.length > 0
        ? [
            [origin.latitude, origin.longitude] as [number, number],
            ...stops.map(
              (stop) => [stop.latitude, stop.longitude] as [number, number],
            ),
            ...(routeGeometry.isLoop ? [[origin.latitude, origin.longitude] as [number, number]] : []),
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
    startZone={startZone}
    onSelectZoneCenter={onSelectZoneCenter}
    guidedGroups={renderedGuidedGroups}
    guidedActiveGroupIndex={guidedActiveGroupIndex}
    onSelectGuidedPoint={onSelectGuidedPoint}
    fr={fr}
    riskHeatmap={riskHeatmap}
    riskHeatmapCategory={riskHeatmapCategory}
    onRiskHeatmapCategoryChange={onRiskHeatmapCategoryChange}
    visibleGroupRoutes={visibleGroupRoutes}
    mapCoordinates={mapCoordinates}
    routeCoordinates={routeCoordinates}
    center={center}
  />;
}
