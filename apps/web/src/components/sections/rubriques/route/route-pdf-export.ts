import type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
import type { RouteGroupRoute, RouteGuidedRoutingAudit, RouteResponse } from "@/lib/route/route-response-contract";
import type { RouteGuidedSector, RoutePlannedWaypoint } from "@/lib/route/route-planning-mode";
import { formatScorePercent } from "@/lib/formatters/score";
import { formatBusinessDurationRangeMinutes } from "@/lib/actions/time-contract";
import { escapeHtml } from "@/lib/security/html-escape";
import {
  getRouteGroupPatternLabel,
  getRouteGroupVisualStyle,
  type RouteMultiRouteDisplayMode,
} from "./route-types";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 560;

type ExportRoute = {
  groupIndex: number;
  label?: string;
  volunteerCount: number;
  stops: RouteStop[];
  geometry: RouteGeometry;
  plannedSector?: RouteGuidedSector;
  plannedWaypoints?: RoutePlannedWaypoint[];
  guidedRouting?: RouteGuidedRoutingAudit;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

function isLoopTopology(data: Pick<RouteResponse, "isLoop" | "routeTopology">): boolean {
  return (data.routeTopology ?? (data.isLoop ? "loop" : "open")) === "loop";
}

function arrivalProvenanceLabel(data: RouteResponse): string {
  if (isLoopTopology(data)) return "départ et arrivée au même point";
  if (data.arrival?.source === "planner") return "arrivée déterminée par le planner";
  if (data.arrival) return "arrivée fournie explicitement";
  return "arrivée non disponible";
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

function formatDistance(value: number | null): string {
  return value === null ? "Non vérifiable" : `${formatNumber(value)} km`;
}

function formatDuration(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "Non disponible"
    : `${Math.max(0, Math.round(value))} min`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function isValidCoordinate(coordinate: [number, number]): boolean {
  return coordinate.every((value) => Number.isFinite(value));
}

function originCoordinate(data: RouteResponse, route: ExportRoute): [number, number] {
  if (route.geometry.origin && isValidCoordinate(route.geometry.origin)) {
    return route.geometry.origin;
  }
  return [data.origin.latitude, data.origin.longitude];
}

function displayCoordinates(
  data: RouteResponse,
  route: ExportRoute,
): [number, number][] {
  const origin = originCoordinate(data, route);
  if (route.geometry.coordinates.length >= 2) {
    return route.geometry.coordinates.filter(isValidCoordinate);
  }

  return [
    origin,
    ...route.stops
      .map((stop) => [stop.latitude, stop.longitude] as [number, number])
      .filter(isValidCoordinate),
    ...(isLoopTopology(data) ? [origin] : []),
  ];
}

function exportRoute(route: RouteGroupRoute): ExportRoute {
  return {
    groupIndex: route.groupIndex,
    label: route.label,
    volunteerCount: route.volunteerCount,
    stops: route.stops,
    geometry: route.routeGeometry,
    plannedSector: route.plannedSector,
    plannedWaypoints: route.plannedWaypoints,
    guidedRouting: route.guidedRouting,
  };
}

function getExportRoutes(data: RouteResponse): ExportRoute[] {
  if (data.groupRoutes.length > 1) {
    return [...data.groupRoutes]
      .sort((left, right) => left.groupIndex - right.groupIndex)
      .map(exportRoute);
  }

  const singleGroup = data.groupRoutes[0];
  return [
    singleGroup
      ? {
          groupIndex: singleGroup.groupIndex,
          label: singleGroup.label,
          volunteerCount: singleGroup.volunteerCount,
          stops: singleGroup.stops,
          geometry: singleGroup.routeGeometry,
          plannedSector: singleGroup.plannedSector,
          plannedWaypoints: singleGroup.plannedWaypoints,
          guidedRouting: singleGroup.guidedRouting,
        }
      : {
          groupIndex: 1,
          volunteerCount: data.volunteers,
          stops: data.stops,
          geometry: data.routeGeometry,
        },
  ];
}

function projectCoordinates(coordinates: [number, number][]): Map<string, ProjectedPoint> {
  const validCoordinates = coordinates.filter(isValidCoordinate);
  const longitudes = validCoordinates.map(([, longitude]) => longitude);
  const latitudes = validCoordinates.map(([latitude]) => latitude);
  const rawLongitudeSpan = Math.max(...longitudes) - Math.min(...longitudes);
  const rawLatitudeSpan = Math.max(...latitudes) - Math.min(...latitudes);
  const longitudeSpan = Math.max(rawLongitudeSpan, 0.01);
  const latitudeSpan = Math.max(rawLatitudeSpan, 0.01);
  const targetRatio = MAP_WIDTH / MAP_HEIGHT;
  let adjustedLongitudeSpan = longitudeSpan;
  let adjustedLatitudeSpan = latitudeSpan;

  if (adjustedLongitudeSpan / adjustedLatitudeSpan > targetRatio) {
    adjustedLatitudeSpan = adjustedLongitudeSpan / targetRatio;
  } else {
    adjustedLongitudeSpan = adjustedLatitudeSpan * targetRatio;
  }

  const centerLongitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const centerLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const minLongitude = centerLongitude - adjustedLongitudeSpan / 2;
  const minLatitude = centerLatitude - adjustedLatitudeSpan / 2;
  const coordinatesByKey = new Map<string, ProjectedPoint>();

  for (const [latitude, longitude] of validCoordinates) {
    coordinatesByKey.set(`${latitude},${longitude}`, {
      x: 40 + ((longitude - minLongitude) / adjustedLongitudeSpan) * (MAP_WIDTH - 80),
      y: MAP_HEIGHT - 40 - ((latitude - minLatitude) / adjustedLatitudeSpan) * (MAP_HEIGHT - 80),
    });
  }

  return coordinatesByKey;
}

function projectedPoint(
  point: [number, number],
  coordinatesByKey: Map<string, ProjectedPoint>,
): ProjectedPoint | null {
  return coordinatesByKey.get(`${point[0]},${point[1]}`) ?? null;
}

function renderSvgMap(
  data: RouteResponse,
  routes: ExportRoute[],
  displayMode: RouteMultiRouteDisplayMode,
  title: string,
): string {
  const isLoop = isLoopTopology(data);
  const origin: [number, number] = [data.origin.latitude, data.origin.longitude];
  const allCoordinates = routes.flatMap((route) => [
    originCoordinate(data, route),
    ...displayCoordinates(data, route),
    ...route.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
    ...(route.plannedSector ? [
      [route.plannedSector.center.latitude, route.plannedSector.center.longitude] as [number, number],
      [route.plannedSector.center.latitude + route.plannedSector.radiusKm / 111, route.plannedSector.center.longitude] as [number, number],
    ] : []),
    ...(route.plannedWaypoints ?? []).map((waypoint) => [waypoint.latitude, waypoint.longitude] as [number, number]),
  ]);
  const coordinatesByKey = projectCoordinates(allCoordinates);
  const originPoint = projectedPoint(origin, coordinatesByKey) ?? { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  const routeLines = routes
    .map((route) => {
      const style = getRouteGroupVisualStyle(route.groupIndex, displayMode);
      const points = displayCoordinates(data, route)
        .map((coordinate) => projectedPoint(coordinate, coordinatesByKey))
        .filter((point): point is ProjectedPoint => point !== null)
        .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join(" ");
      if (points.length === 0) return "";
      return `<polyline data-route-group="${route.groupIndex}" points="${points}" fill="none" stroke="${style.color}" stroke-width="${routes.length > 1 ? 7 : 8}" stroke-linecap="round" stroke-linejoin="round"${style.dashArray ? ` stroke-dasharray="${style.dashArray}"` : ""} />`;
    })
    .join("");
  const stopMarkers = routes
    .flatMap((route) => route.stops.map((stop, index) => ({ route, stop, index })))
    .map(({ route, stop, index }) => {
      const point = projectedPoint([stop.latitude, stop.longitude], coordinatesByKey);
      if (!point) return "";
      const style = getRouteGroupVisualStyle(route.groupIndex, displayMode);
      const markerLabel = routes.length > 1 ? `G${route.groupIndex}-${index + 1}` : `${index + 1}`;
      return `<g data-route-stop="${escapeHtml(stop.id)}"><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="13" fill="#ffffff" stroke="${style.color}" stroke-width="4" /><text x="${point.x.toFixed(1)}" y="${(point.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">${escapeHtml(markerLabel)}</text><text x="${(point.x + 18).toFixed(1)}" y="${(point.y - 14).toFixed(1)}" font-size="12" font-weight="600" fill="#0f172a">${escapeHtml(stop.label)}</text></g>`;
    })
    .join("");
  const guidedSectorMarkers = routes
    .map((route) => {
      if (!route.plannedSector) return "";
      const center = projectedPoint([route.plannedSector.center.latitude, route.plannedSector.center.longitude], coordinatesByKey);
      const edge = projectedPoint([route.plannedSector.center.latitude + route.plannedSector.radiusKm / 111, route.plannedSector.center.longitude], coordinatesByKey);
      if (!center || !edge) return "";
      const style = getRouteGroupVisualStyle(route.groupIndex, displayMode);
      const radius = Math.max(10, Math.abs(center.y - edge.y));
      return `<circle data-route-sector="${route.groupIndex}" cx="${center.x.toFixed(1)}" cy="${center.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${style.color}" fill-opacity="0.08" stroke="${style.color}" stroke-width="3" stroke-dasharray="8 8" />`;
    })
    .join("");
  const plannedMarkers = routes
    .flatMap((route) => (route.plannedWaypoints ?? []).map((waypoint) => ({ route, waypoint })))
    .map(({ route, waypoint }) => {
      const point = projectedPoint([waypoint.latitude, waypoint.longitude], coordinatesByKey);
      if (!point) return "";
      const style = getRouteGroupVisualStyle(route.groupIndex, displayMode);
      const markerLabel = routes.length > 1 ? `G${route.groupIndex}-${waypoint.order + 1}` : `${waypoint.order + 1}`;
      return `<g data-route-planned-waypoint="${escapeHtml(waypoint.id)}"><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="11" fill="${style.color}" stroke="#ffffff" stroke-width="3" /><text x="${point.x.toFixed(1)}" y="${(point.y + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff">${escapeHtml(markerLabel)}</text><text x="${(point.x + 16).toFixed(1)}" y="${(point.y + 18).toFixed(1)}" font-size="11" font-weight="700" fill="#0f172a">${escapeHtml(waypoint.label)} · planifié</text></g>`;
    })
    .join("");

  const endpoint = routes[0]?.geometry.coordinates.at(-1);
  const endpointPoint = endpoint ? projectedPoint(endpoint, coordinatesByKey) : null;
  const endpointMarker = !isLoop && endpointPoint
    ? `<circle cx="${endpointPoint.x.toFixed(1)}" cy="${endpointPoint.y.toFixed(1)}" r="18" fill="#0f172a" stroke="#ffffff" stroke-width="5" /><text x="${endpointPoint.x.toFixed(1)}" y="${(endpointPoint.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">A</text><text x="${(endpointPoint.x + 24).toFixed(1)}" y="${(endpointPoint.y - 16).toFixed(1)}" font-size="13" font-weight="800" fill="#0f172a">Arrivée</text>`
    : "";
  return `<svg class="route-pdf-map" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="${escapeHtml(title)}" xmlns="http://www.w3.org/2000/svg"><rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="#f8fafc" /><path d="M40 140H960 M40 280H960 M40 420H960 M220 40V520 M460 40V520 M700 40V520" stroke="#dbe4ec" stroke-width="2" stroke-dasharray="3 9" />${guidedSectorMarkers}<circle cx="${originPoint.x.toFixed(1)}" cy="${originPoint.y.toFixed(1)}" r="18" fill="#0f172a" stroke="#ffffff" stroke-width="5" /><text x="${originPoint.x.toFixed(1)}" y="${(originPoint.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff">${isLoop ? "D/A" : "D"}</text><text x="${(originPoint.x + 24).toFixed(1)}" y="${(originPoint.y - 16).toFixed(1)}" font-size="13" font-weight="800" fill="#0f172a">${isLoop ? "Départ / arrivée" : "Départ"}</text>${endpointMarker}${routeLines}${plannedMarkers}${stopMarkers}</svg>`;
}

function renderLegend(
  routes: ExportRoute[],
  displayMode: RouteMultiRouteDisplayMode,
): string {
  return `<ul class="route-pdf-legend">${routes
    .map((route) => {
      const style = getRouteGroupVisualStyle(route.groupIndex, displayMode);
      const label = `${route.label || `Groupe ${route.groupIndex}`} — ${route.volunteerCount} bénévoles`;
      const pattern = getRouteGroupPatternLabel(route.groupIndex, true);
      return `<li><svg width="54" height="12" viewBox="0 0 54 12" aria-hidden="true"><line x1="2" y1="6" x2="52" y2="6" stroke="${style.color}" stroke-width="4" stroke-linecap="round"${style.dashArray ? ` stroke-dasharray="${style.dashArray}"` : ""} /></svg><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(displayMode === "patterns" ? `Trait ${pattern}` : "Ligne couleur dédiée")}</small></span></li>`;
    })
    .join("")}</ul>`;
}

function renderMetrics(data: RouteResponse, routes: ExportRoute[], multi: boolean): string {
  const routeDistance = routes[0]?.geometry.distanceKm;
  const routeDuration = routes[0]?.geometry.durationMinutes;
  const distance = multi
    ? data.multiRoute.totalDistanceKm
    : routeDistance && routeDistance > 0
      ? routeDistance
      : data.travelDistanceKm;
  const duration = multi
    ? data.multiRoute.totalDurationMinutes
    : routeDuration && routeDuration > 0
      ? routeDuration
      : data.travelMinutes;
  const estimatedLabel = routes.some((route) => route.geometry.mode === "fallback")
    ? "Estimation / fallback"
    : "Mesure réseau";
  const guidedBudget = routes[0]?.guidedRouting?.budget ?? data.guidedBudget;
  const serviceLabel = data.serviceMinutesEstimate === null
    ? "Non disponible : calibration absente"
    : formatBusinessDurationRangeMinutes(data.serviceMinutesEstimate);
  return `<dl class="route-pdf-metrics"><div><dt>Distance</dt><dd>${escapeHtml(formatDistance(distance))}</dd></div><div><dt>Durée déplacement réseau</dt><dd>${escapeHtml(formatDuration(duration))}</dd></div><div><dt>Durée d’action</dt><dd>${escapeHtml(serviceLabel)}</dd></div><div><dt>Créneau total</dt><dd>${escapeHtml(formatDuration(guidedBudget?.totalMinutes ?? data.travelBudgetMinutes))}</dd></div><div><dt>Marge organisation</dt><dd>${escapeHtml(formatDuration(guidedBudget?.organizationMarginMinutes ?? 15))}</dd></div><div><dt>Collecte minimale</dt><dd>${escapeHtml(formatDuration(guidedBudget?.minimumCollectionMinutes ?? null))}</dd></div><div><dt>État du tracé</dt><dd>${escapeHtml(estimatedLabel)}</dd></div></dl>`;
}

function renderStops(routes: ExportRoute[]): string {
  return routes
    .map(
      (route) => `<section class="route-pdf-stops"><h3>${escapeHtml(route.label || `Groupe ${route.groupIndex}`)} — passages et observations</h3>${route.plannedWaypoints && route.plannedWaypoints.length > 0 ? `<p><strong>Passages planifiés (ordre)</strong></p><ol>${route.plannedWaypoints.map((waypoint) => `<li><strong>${escapeHtml(waypoint.label)}</strong><span>Point planifié · ${escapeHtml(`${waypoint.latitude.toFixed(5)}, ${waypoint.longitude.toFixed(5)}`)} · aucune observation associée</span></li>`).join("")}</ol>` : ""}${route.stops.length > 0 ? `<p><strong>Observations / cibles retenues</strong></p><ol>${route.stops.map((stop) => { const family = stop.evidence?.family === "observed" ? "Observation" : stop.evidence?.family === "predicted" ? "Prédiction" : "Source non précisée"; return `<li><strong>${escapeHtml(stop.label)}</strong><span>${escapeHtml(family)} · ${escapeHtml(stop.priorityReason)} · score ${formatScorePercent(stop.score, 1)} · ${escapeHtml(formatDistance(stop.segmentKm))} · ${escapeHtml(formatDuration(stop.estimatedMinutes))}</span></li>`; }).join("")}</ol>` : "<p>Aucune observation ou cible retenue.</p>"}</section>`,
    )
    .join("");
}

function renderGuidedPlan(data: RouteResponse, routes: ExportRoute[]): string {
  const sections = routes.filter((route) => route.plannedSector || route.guidedRouting);
  if (sections.length === 0) return "";
  const isLoop = isLoopTopology(data);
  return `<section class="route-pdf-guided"><h3>Planification territoriale guidée</h3>${sections.map((route) => { const audit = route.guidedRouting; const sector = route.plannedSector; const sectorStatus = audit?.sectorStatus ?? "unknown"; const sectorLabel = sectorStatus === "unknown" ? "inconnu (géométrie finale non vérifiable)" : `${sectorStatus === "within" ? "dans le secteur" : "hors secteur"} · écart ${formatDistance(audit?.sectorDeviationKm ?? null)}`; const topologyLabel = isLoop ? `boucle ${audit?.loopVerified ? "vérifiée" : "non vérifiée"}` : "trajet ouvert"; return `<article><p><strong>${escapeHtml(route.label || `Groupe ${route.groupIndex}`)}</strong> · ${route.volunteerCount} bénévoles</p>${sector ? `<p>Secteur : centre ${sector.center.latitude.toFixed(5)}, ${sector.center.longitude.toFixed(5)} · rayon ${formatDistance(sector.radiusKm)}</p>` : ""}${audit ? `<p>Routage : ${audit.availability === "network" ? "réseau piéton" : "fallback estimé"} · ${topologyLabel} · ordre des passages ${audit.waypointOrderVerified ? "vérifié" : "non vérifié"} · secteur ${sectorLabel}.</p><p>Budget : ${audit.budget.travelMinutes} min déplacement / ${audit.budget.travelMaxMinutes} min max · ${audit.budget.collectionMinutesAvailable} min collecte disponible / ${audit.budget.minimumCollectionMinutes} min réservées · ${audit.budget.withinBudget ? "respecté" : "non respecté"}.</p>` : "<p>Audit de routage indisponible.</p>"}</article>`; }).join("")}</section>`;
}

function renderCorridors(
  routes: ExportRoute[],
  data: RouteResponse,
  includeTraceSteps: boolean,
): string {
  const steps = routes.flatMap((route) => route.geometry.legs.flatMap((leg) => leg.steps ?? []));
  const traceSteps = includeTraceSteps
    ? data.trace.segments.flatMap((segment) => segment.streetSteps)
    : [];
  const names = [...steps, ...traceSteps]
    .map((step) => step.name?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 16);
  return `<section class="route-pdf-corridors"><h3>Voies / corridors fournis</h3>${names.length > 0 ? `<ul>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : "<p>Aucun nom de voie n’est fourni par la géométrie canonique.</p>"}</section>`;
}

function renderInstructions(data: RouteResponse, routes: ExportRoute[]): string {
  const isLoop = isLoopTopology(data);
  const notes = [
    isLoop
      ? "Le départ et l’arrivée se font au même point ; vérifier le rendez-vous avant le départ."
      : `Le départ est fixé par la localisation et l’arrivée est distincte (${arrivalProvenanceLabel(data)}) ; vérifier les deux extrémités avant le départ.`,
    "Respecter le code de la route, les piétons, les accès privés et les consignes locales.",
    "Ne pas intervenir sur une zone dangereuse ou non autorisée ; signaler plutôt que prendre un risque.",
    routes.some((route) => route.geometry.mode === "fallback")
      ? "Le réseau n’a pas fourni tous les tracés : les distances et durées concernées sont des estimations."
      : "Le tracé et les métriques réseau correspondent au résultat calculé affiché.",
    "Aucune couche prédictive n’est incluse automatiquement dans ce document opérationnel.",
    "La durée de collecte n’est pas fournie par le contrat actuel : la durée totale opérationnelle reste à estimer sur le terrain.",
    ...data.trace.warnings.map((warning) => `Avertissement du calcul : ${warning}`),
  ];
  return `<section class="route-pdf-instructions"><h3>Consignes essentielles</h3><ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul></section>`;
}

function renderGroupPage(
  data: RouteResponse,
  route: ExportRoute,
  displayMode: RouteMultiRouteDisplayMode,
): string {
  const label = route.label || `Groupe ${route.groupIndex}`;
  const rendezVous = `${data.origin.latitude.toFixed(6)}, ${data.origin.longitude.toFixed(6)}`;
  return `<section class="route-pdf-page"><header><p class="route-pdf-eyebrow">Fiche terrain</p><h1>${escapeHtml(label)}</h1><p>${route.volunteerCount} bénévoles · ${route.stops.length} observations · ${route.plannedWaypoints?.length ?? 0} passages planifiés · ${escapeHtml(route.geometry.mode === "network" ? "Tracé réseau" : "Tracé estimé / fallback")}</p><p class="route-pdf-meta"><strong>Point de rendez-vous :</strong> ${escapeHtml(rendezVous)} · ${escapeHtml(arrivalProvenanceLabel(data))}</p></header><div class="route-pdf-map-shell">${renderSvgMap(data, [route], displayMode, label)}</div>${renderLegend([route], displayMode)}${renderMetrics(data, [route], false)}${renderGuidedPlan(data, [route])}${renderStops([route])}${renderCorridors([route], data, false)}${renderInstructions(data, [route])}</section>`;
}

export function buildRoutePdfCss(routeCount: number): string {
  return `
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #ffffff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }
.route-pdf-page { min-height: 185mm; break-after: page; page-break-after: always; padding: 2mm; }
.route-pdf-page:last-child { break-after: auto; page-break-after: auto; }
header { border-bottom: 2px solid #0f766e; margin-bottom: 8mm; padding-bottom: 4mm; }
h1 { margin: 0 0 2mm; font-size: 24pt; line-height: 1.1; }
h3 { margin: 0 0 2mm; font-size: 12pt; }
p { margin: 1.5mm 0; }
.route-pdf-eyebrow { color: #0f766e; font-size: 9pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.route-pdf-meta { color: #475569; }
.route-pdf-summary { display: flex; flex-wrap: wrap; gap: 8mm; margin-bottom: 4mm; }
.route-pdf-map-shell { border: 1px solid #cbd5e1; margin: 3mm 0 4mm; padding: 2mm; }
.route-pdf-map { display: block; width: 100%; height: auto; max-height: 96mm; }
.route-pdf-legend { display: grid; grid-template-columns: repeat(${Math.min(routeCount, 4)}, minmax(0, 1fr)); gap: 3mm 6mm; list-style: none; margin: 3mm 0 5mm; padding: 0; }
.route-pdf-legend li { display: flex; align-items: center; gap: 2mm; }
.route-pdf-legend svg { flex: 0 0 auto; }
.route-pdf-legend span { display: flex; flex-direction: column; gap: 1mm; }
.route-pdf-legend small { color: #475569; }
.route-pdf-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 3mm; margin: 4mm 0; }
.route-pdf-metrics div { border: 1px solid #cbd5e1; border-radius: 2mm; padding: 3mm; }
.route-pdf-metrics dt { color: #475569; font-size: 8.5pt; }
.route-pdf-metrics dd { margin: 1mm 0 0; font-weight: 700; }
.route-pdf-stops, .route-pdf-corridors, .route-pdf-instructions { break-inside: avoid; margin-top: 4mm; }
.route-pdf-guided { break-inside: avoid; margin-top: 4mm; border: 1px solid #bae6fd; background: #f0f9ff; padding: 3mm; }
.route-pdf-guided article { border-top: 1px solid #bae6fd; margin-top: 2mm; padding-top: 2mm; }
.route-pdf-guided article:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
.route-pdf-map-shell, .route-pdf-legend, .route-pdf-metrics { break-inside: avoid; page-break-inside: avoid; }
.route-pdf-stops ol, .route-pdf-corridors ul, .route-pdf-instructions ul { margin: 0; padding-left: 6mm; }
.route-pdf-stops li, .route-pdf-corridors li, .route-pdf-instructions li { margin: 1mm 0; }
.route-pdf-stops li span { color: #475569; display: block; font-size: 9pt; }
.route-pdf-corridors { columns: 2; }
.route-pdf-corridors h3 { column-span: all; }
.route-pdf-instructions { border-top: 1px solid #94a3b8; padding-top: 3mm; }
@media screen { body { background: #e2e8f0; padding: 12mm; } .route-pdf-page { background: white; margin: 0 auto 12mm; max-width: 1120px; padding: 10mm; box-shadow: 0 8px 30px rgba(15,23,42,.14); } }
@media print { .route-pdf-page { min-height: auto; } }
`;
}

export function buildRoutePdfHtml(
  data: RouteResponse,
  displayMode: RouteMultiRouteDisplayMode,
  generatedAt = data.generatedAt,
): string {
  const routes = getExportRoutes(data);
  const multi = routes.length > 1;
  const event = data.trace.eventCentered?.event;
  const title = event ? `Itinéraire CleanMyMap — ${event.title}` : "Itinéraire CleanMyMap";
  const originLabel = `${data.origin.latitude.toFixed(6)}, ${data.origin.longitude.toFixed(6)} · ${data.origin.source === "map" ? "carte" : data.origin.source === "browser" ? "navigateur" : "zone enregistrée approximative"}`;
  const overviewTitle = multi ? `Vue générale — ${routes.length} groupes` : isLoopTopology(data) ? "Vue générale — 1 boucle" : "Vue générale — 1 trajet ouvert";
  const overview = `<section class="route-pdf-page"><header><p class="route-pdf-eyebrow">CleanMyMap · export terrain</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(overviewTitle)}</p><p class="route-pdf-meta">Généré le ${escapeHtml(formatDateTime(generatedAt))}${event ? ` · Événement : ${escapeHtml(event.title)} · ${escapeHtml(formatDate(event.eventDate))}` : ""}</p></header><div class="route-pdf-summary"><p><strong>Point de rendez-vous :</strong> ${escapeHtml(originLabel)}</p><p><strong>Bénévoles :</strong> ${data.volunteers} · <strong>Groupes :</strong> ${routes.length}</p></div><div class="route-pdf-map-shell">${renderSvgMap(data, routes, displayMode, overviewTitle)}</div>${renderLegend(routes, displayMode)}${renderMetrics(data, routes, multi)}${renderGuidedPlan(data, routes)}${renderStops(routes)}${renderCorridors(routes, data, true)}${renderInstructions(data, routes)}</section>`;
  const groupPages = multi ? routes.map((route) => renderGroupPage(data, route, displayMode)).join("") : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title><style>${buildRoutePdfCss(routes.length)}</style></head><body>${overview}${groupPages}<script>window.addEventListener("afterprint", () => window.close()); window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script></body></html>`;
}
