"use client";

import { useMemo, useState } from"react";
import {
 CircleMarker,
 LayerGroup,
 LayersControl,
 MapContainer,
 Marker,
 Polygon,
 Polyline,
 Tooltip,
 TileLayer,
 Popup,
 useMap
} from"react-leaflet";
import MarkerClusterGroup from"react-leaflet-cluster";
import type { LatLngExpression, LatLngTuple } from"leaflet";
import { divIcon } from"leaflet";
import type { ActionMapItem, ActionDrawing } from"@/lib/actions/types";
import {
 resolveInfrastructureEmoji,
 resolveDynamicColor,
} from"@/components/actions/map-marker-categories";
import {
 getActionOperationalContext,
 getGeometryPresentation,
 mapItemDrawing,
 mapItemCigaretteButts,
 mapItemCoordinates,
 mapItemLocationLabel,
 mapItemObservedAt,
 mapItemShouldRenderPoint,
 mapItemType,
 mapItemWasteKg,
} from"../../lib/actions/data-contract";
import { computePollutionScore } from"@/lib/actions/pollution-score";

function MapControls({
 center,
 variant ="default",
}: {
 center: LatLngTuple;
 variant?:"default" |"immersive";
}) {
 const map = useMap();
 const [search, setSearch] = useState("");
 const [isSearching, setIsSearching] = useState(false);

 async function handleSearch(e: React.FormEvent) {
 e.preventDefault();
 if (!search.trim()) return;
 
 setIsSearching(true);
 try {
 const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
 const data = await resp.json();
 if (data && data.length > 0) {
 const { lat, lon } = data[0];
 map.flyTo([parseFloat(lat), parseFloat(lon)], 15);
 }
 } catch (err) {
 console.error("Geocoding error", err);
 } finally {
 setIsSearching(false);
 }
 }

 return (
 <div
 className={[
"absolute left-3 z-[1000] flex flex-col gap-2",
 variant ==="immersive" ?"top-3 md:top-4" :"top-20",
 ].join("")}
 >
 <form
 onSubmit={handleSearch}
 className="flex overflow-hidden rounded-2xl border cmm-border-color bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 dark:hover:bg-slate-900/95"
 >
 <input 
 type="text" 
 placeholder="Rechercher une adresse..." 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-48 px-4 py-2 cmm-text-small outline-none bg-transparent cmm-text-primary placeholder:text-slate-400"
 />
 <button 
 type="submit" 
 disabled={isSearching}
 className="bg-emerald-500 px-4 py-2 cmm-text-small font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
 >
 {isSearching ?"..." :"🔍"}
 </button>
 </form>
 
 <button 
 onClick={() => map.flyTo(center, 12)}
 className="flex w-fit items-center gap-2 rounded-2xl border cmm-border-color bg-white/80 px-4 py-2 cmm-text-small font-bold cmm-text-secondary shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 hover:cmm-text-primary dark:bg-slate-900/80 dark:hover:bg-slate-900/95"
 >
 <span>📍</span> Reset Vue
 </button>

 <a 
 href="/methodologie"
 className="flex w-fit items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 cmm-text-small font-bold text-emerald-700 dark:text-emerald-400 shadow-xl shadow-emerald-950/10 backdrop-blur-xl transition hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60"
 >
 <span>🔬</span> Méthodologie
 </a>
 </div>
 );
}

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

function getPollutionScore(item: ActionMapItem): number {
 return computePollutionScore({
 wasteKg: mapItemWasteKg(item),
 cigaretteButts: mapItemCigaretteButts(item),
 });
}

function resolvePointColor(item: ActionMapItem): string {
 const score = getPollutionScore(item);
 if ((mapItemWasteKg(item) ?? 0) <= 0 && (mapItemCigaretteButts(item) ?? 0) <= 0) {
 return"#0284c7"; // Bleu propre
 }
 return resolveDynamicColor(score);
}

function drawingCoordinates(
 drawing: ActionDrawing | null | undefined,
): LatLngExpression[] {
 if (!drawing) {
 return [];
 }
 return drawing.coordinates.map(
 (point) => [point[0], point[1]] as LatLngExpression,
 );
}

function resolveInfrastructureAnchor(
 item: ActionMapItem,
 drawing: ActionDrawing | null,
): LatLngTuple | null {
 if (drawing && drawing.coordinates.length > 0) {
 const [latitudeSum, longitudeSum] = drawing.coordinates.reduce(
 (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
 [0, 0],
 );
 return [
 latitudeSum / drawing.coordinates.length,
 longitudeSum / drawing.coordinates.length,
 ];
 }

 const coords = mapItemCoordinates(item);
 if (coords.latitude === null || coords.longitude === null) {
 return null;
 }

 return [coords.latitude, coords.longitude];
}

function formatObservedDate(value: string | null | undefined): string {
 if (!value) {
 return"Date non renseignée";
 }

 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }

 return new Intl.DateTimeFormat("fr-FR", {
 day:"2-digit",
 month:"2-digit",
 year:"numeric",
 }).format(parsed);
}

function formatRecordType(item: ActionMapItem): string {
 const type = item.contract?.type ?? mapItemType(item);

 switch (type) {
 case"action":
 return"Action terrain";
 case"clean_place":
 return"Lieu propre";
 case"spot":
 return"Signalement";
 default:
 return"Action";
 }
}

function formatStatusLabel(status: string | undefined): string {
 switch (status) {
 case"approved":
 return"Validée";
 case"pending":
 return"En attente";
 case"rejected":
 return"Rejetée";
 case"cleaned":
 return"Nettoyée";
 case"validated":
 return"Validée";
 case"new":
 return"Nouveau signalement";
 default:
 return"Statut inconnu";
 }
}

function formatNumber(value: number | null | undefined, suffix =""): string {
 const numeric = Number(value ?? 0);
 if (!Number.isFinite(numeric)) {
 return `0${suffix}`;
 }
 return `${numeric.toLocaleString("fr-FR")}${suffix}`;
}

function ActionPopupContent({
 item,
 color,
 score,
 coords,
}: {
 item: ActionMapItem;
 color: string;
 score: number;
 coords: { latitude: number | null; longitude: number | null };
}) {
 const contract = item.contract;
 const geometry = getGeometryPresentation(item);
 const wasteKg = mapItemWasteKg(item) ?? 0;
 const butts = mapItemCigaretteButts(item) ?? 0;
 const volunteers = Number(contract?.metadata.volunteersCount ?? 0);
 const durationMinutes = Number(contract?.metadata.durationMinutes ?? 0);
 const placeType = contract?.metadata.placeType?.trim();
 const associationName = contract?.metadata.associationName?.trim();
 const notes = contract?.metadata.notesPlain?.trim() || contract?.metadata.notes?.trim();
 const departure = contract?.metadata.departureLocationLabel?.trim();
 const arrival = contract?.metadata.arrivalLocationLabel?.trim();
 const operational = getActionOperationalContext(contract);
 const quality = item.quality_grade ? `Qualité ${item.quality_grade}` : null;
 const impact = item.impact_level ? `Impact ${item.impact_level}` : null;
 const locationLabel = mapItemLocationLabel(item);
 const observedAt = formatObservedDate(contract?.dates.observedAt ?? mapItemObservedAt(item));
 const statusLabel = formatStatusLabel(contract?.status ?? item.status);
 const recordTypeLabel = formatRecordType(item);
 const updateHref =
 score > 0
 ? `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}`
 : `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}&mode=propre`;

 return (
 <div className="min-w-[280px] max-w-[320px] space-y-4 p-2 text-left">
 <div className="space-y-2 border-b cmm-border-color pb-3">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] cmm-text-muted">
 {recordTypeLabel}
 </p>
 <h3 className="mt-1 cmm-text-body font-bold leading-tight cmm-text-primary">
 {locationLabel}
 </h3>
 </div>
 <div className="text-right">
 <p
 className="text-lg font-bold leading-none"
 style={{ color }}
 >
 {Math.min(100, Math.round(score))}%
 </p>
 <p className="mt-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Score
 </p>
 </div>
 </div>
 <div className="flex flex-wrap gap-1.5 pt-2">
 <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 cmm-text-caption font-semibold cmm-text-secondary">
 {statusLabel}
 </span>
 {placeType ? (
 <span className="rounded-full bg-emerald-50 px-2 py-1 cmm-text-caption font-semibold text-emerald-800">
 {placeType}
 </span>
 ) : null}
 {quality ? (
 <span className="rounded-full bg-sky-50 px-2 py-1 cmm-text-caption font-semibold text-sky-800">
 {quality}
 </span>
 ) : null}
 {impact ? (
 <span className="rounded-full bg-amber-50 px-2 py-1 cmm-text-caption font-semibold text-amber-800">
 {impact}
 </span>
 ) : null}
 <span
 className={`rounded-full px-2 py-1 cmm-text-caption font-semibold ${
 geometry.reality ==="real"
 ?"bg-emerald-50 text-emerald-800"
 : geometry.reality ==="estimated"
 ?"bg-amber-50 text-amber-800"
 :"bg-slate-100 cmm-text-secondary"
 }`}
 >
 {geometry.label}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 cmm-text-caption">
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Date</p>
 <p className="mt-1 font-bold cmm-text-primary">{observedAt}</p>
 </div>
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Source</p>
 <p className="mt-1 font-bold cmm-text-primary">{contract?.source ?? item.source ??"n/a"}</p>
 </div>
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Déchets</p>
 <p className="mt-1 font-bold cmm-text-primary">{formatNumber(wasteKg," kg")}</p>
 </div>
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Mégots</p>
 <p className="mt-1 font-bold cmm-text-primary">{formatNumber(butts)}</p>
 </div>
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Bénévoles</p>
 <p className="mt-1 font-bold cmm-text-primary">{formatNumber(volunteers)}</p>
 </div>
 <div className="rounded-xl cmm-surface-muted px-3 py-2">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Durée</p>
 <p className="mt-1 font-bold cmm-text-primary">{formatNumber(durationMinutes," min")}</p>
 </div>
 </div>

 <div className="rounded-xl cmm-surface-muted px-3 py-2 cmm-text-caption">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">
 Contexte métier
 </p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
 {operational.placeTypeLabel}
 </span>
 <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold cmm-text-secondary">
 {operational.routeStyleLabel}
 </span>
 <span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-800">
 {formatNumber(operational.volunteersCount," bénévoles")}
 </span>
 <span className="rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-800">
 {formatNumber(operational.durationMinutes," min")}
 </span>
 <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800">
 {formatNumber(operational.engagementHours," h-personnes")}
 </span>
 </div>
 {operational.routeAdjustmentMessage ? (
 <p className="mt-2 cmm-text-secondary">
 Ajustement trajet: {operational.routeAdjustmentMessage}
 </p>
 ) : null}
 </div>

 {associationName ? (
 <div className="rounded-xl cmm-surface-muted px-3 py-2 cmm-text-caption">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Association</p>
 <p className="mt-1 font-bold cmm-text-primary">{associationName}</p>
 </div>
 ) : null}

 {departure || arrival ? (
 <div className="rounded-xl cmm-surface-muted px-3 py-2 cmm-text-caption">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Parcours</p>
 {departure ? <p className="mt-1 cmm-text-primary"><span className="font-bold">Départ:</span> {departure}</p> : null}
 {arrival ? <p className="mt-1 cmm-text-primary"><span className="font-bold">Arrivée:</span> {arrival}</p> : null}
 </div>
 ) : null}

 {notes ? (
 <div className="rounded-xl cmm-surface-muted px-3 py-2 cmm-text-caption">
 <p className="font-semibold uppercase tracking-wide cmm-text-muted">Bilan</p>
 <p className="mt-1 leading-relaxed cmm-text-primary">{notes}</p>
 </div>
 ) : null}

 <a
 href={updateHref}
 className="block w-full rounded-xl bg-slate-900 dark:bg-emerald-600 px-3 py-3 text-center cmm-text-small font-bold text-white transition hover:bg-slate-800 dark:hover:bg-emerald-500 shadow-md"
 >
 {score > 0 ?"Déclarer une action ici" :"Mettre à jour cette zone"}
 </a>
 </div>
 );
}

export function ActionsMapCanvas({ items }: { items: ActionMapItem[] }) {
 const center = useMemo<LatLngTuple>(() => {
 const first = items.find(
 (item) =>
 mapItemCoordinates(item).latitude !== null &&
 mapItemCoordinates(item).longitude !== null,
 );
 if (!first) {
 return PARIS_CENTER;
 }
 const coords = mapItemCoordinates(first);
 if (coords.latitude === null || coords.longitude === null) {
 return PARIS_CENTER;
 }
 return [coords.latitude, coords.longitude];
 }, [items]);

 return (
 <div className="overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-slate-950 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.45)] relative ring-1 ring-black/5">
 <MapContainer
 center={center}
 zoom={12}
 scrollWheelZoom
 className="h-[68vh] min-h-[34rem] w-full bg-slate-900 transition-colors duration-500 md:h-[74vh] md:min-h-[42rem]"
 >
 <MapControls center={center} variant="immersive" />
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
 <LayersControl.BaseLayer name="Satellite">
 <TileLayer
 attribution='&copy; Google'
 url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
 />
 </LayersControl.BaseLayer>

 <LayersControl.Overlay checked name="Signalements">
 <LayerGroup>
 <MarkerClusterGroup
 chunkedLoading
 maxClusterRadius={50}
 spiderfyOnMaxZoom={true}
 >
 {items.map((item) => {
 const coords = mapItemCoordinates(item);
 if (!mapItemShouldRenderPoint(item) || coords.latitude === null || coords.longitude === null) {
 return null;
 }
 
 const score = getPollutionScore(item);
 const color = resolvePointColor(item);
 const geometry = getGeometryPresentation(item);
 const isFallbackPoint = geometry.strokeStyle ==="point";

 return (
 <CircleMarker
 key={`point-${item.id}`}
 center={[coords.latitude, coords.longitude]}
 radius={isFallbackPoint ? 4.5 : 6}
 pathOptions={{
 color: color,
 fillColor: color,
 fillOpacity: isFallbackPoint ? 0.52 : 0.85,
 weight: isFallbackPoint ? 1.5 : 2,
 opacity: isFallbackPoint ? 0.7 : 0.95,
 }}
 >
 <Popup className="glass-popup custom-popup">
 <ActionPopupContent
 item={item}
 color={color}
 score={score}
 coords={coords}
 />
 </Popup>
 </CircleMarker>
 );
 })}
 </MarkerClusterGroup>

 {items.map((item) => {
 const drawing = mapItemDrawing(item);
 const coordinates = drawingCoordinates(drawing);
 if (!drawing || coordinates.length === 0) return null;
 
 const color = resolvePointColor(item);
 const score = getPollutionScore(item);
 const coords = mapItemCoordinates(item);
 const geometry = getGeometryPresentation(item);
 const isEstimated = geometry.strokeStyle ==="dashed";

 if (drawing.kind ==="polygon") {
 return (
 <Polygon
 key={`shape-${item.id}`}
 positions={coordinates}
 pathOptions={{
 color: color,
 weight: 2,
 opacity: isEstimated ? 0.8 : 0.95,
 fillOpacity: isEstimated ? 0.14 : 0.24,
 dashArray: isEstimated ?"8 8" : undefined,
 }}
 >
 <Tooltip className="glass-tooltip" direction="center" sticky>
 <div className="text-center">
 <p className="text-[9px] uppercase font-bold tracking-wider">Zone {Math.round(score)}%</p>
 </div>
 </Tooltip>
 <Popup className="glass-popup custom-popup">
 <ActionPopupContent
 item={item}
 color={color}
 score={score}
 coords={coords}
 />
 </Popup>
 </Polygon>
 );
 }

 return (
 <Polyline
 key={`shape-${item.id}`}
 positions={coordinates}
 pathOptions={{
 color: color,
 weight: 4,
 opacity: isEstimated ? 0.75 : 0.92,
 dashArray: isEstimated ?"8 8" : undefined,
 }}
 >
 <Tooltip className="glass-tooltip" direction="top" sticky>
 <div className="text-center">
 <p className="text-[9px] uppercase font-bold tracking-wider">Trace {Math.round(score)}%</p>
 </div>
 </Tooltip>
 <Popup className="glass-popup custom-popup">
 <ActionPopupContent
 item={item}
 color={color}
 score={score}
 coords={coords}
 />
 </Popup>
 </Polyline>
 );
 })}

 {items.map((item) => {
 const emoji = resolveInfrastructureEmoji(item);
 if (!emoji) {
 return null;
 }

 const drawing = mapItemDrawing(item);
 const anchor = resolveInfrastructureAnchor(item, drawing);
 if (!anchor) {
 return null;
 }

 return (
 <Marker
 key={`infrastructure-${item.id}`}
 position={anchor}
 interactive={false}
 icon={divIcon({
 className:"cmm-infrastructure-emoji",
 html: `<span class="cmm-infrastructure-emoji__glyph">${emoji}</span>`,
 iconSize: [28, 28],
 iconAnchor: [14, 14],
 })}
 />
 );
 })}
 </LayerGroup>
 </LayersControl.Overlay>
 </LayersControl>
 <style>{`
 .cmm-infrastructure-emoji {
 background: transparent;
 border: none;
 }
 .cmm-infrastructure-emoji__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--bg-elevated, rgba(255,255,255,0.92));
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  font-size: 16px;
  line-height: 1;
  }
 html.dark .cmm-infrastructure-emoji__glyph {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
  .leaflet-container {
 background: var(--bg-canvas, #020617);
 }
 `}</style>
 </MapContainer>
 </div>
 );
}
