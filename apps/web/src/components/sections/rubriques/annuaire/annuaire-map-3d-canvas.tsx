"use client";

import { useEffect, useRef, useState } from "react";
import { Map as LibreMap, NavigationControl, MercatorCoordinate, setWorkerUrl, type CustomLayerInterface } from "maplibre-gl";
import Image from "next/image";
import "maplibre-gl/dist/maplibre-gl.css";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";
import { CmmButton } from "@/components/ui/cmm-button";
import { FRANCE_METROPOLITAINE_BOUNDS, PARIS_INTRAMUROS_BOUNDS, isInFranceMetropolitaine, type GeoNetworkEntity, type GeoNetworkIncidentRelation, type MapScope } from "./annuaire-geo-network.model";
import { getNetworkLogoDiameter, getNetworkRelationVisual } from "./annuaire-geo-network.visuals";
import { projectNetworkPoint, type ScreenPoint } from "./annuaire-geo-projection";

type Props = {
  entities: GeoNetworkEntity[];
  relations: GeoNetworkIncidentRelation[];
  mapScope: MapScope;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
  fr: boolean;
};

function boundsFor(scope: MapScope): [[number, number], [number, number]] {
  const b = scope === "paris" ? PARIS_INTRAMUROS_BOUNDS : FRANCE_METROPOLITAINE_BOUNDS;
  return [[b[0][1], b[0][0]], [b[1][1], b[1][0]]];
}

/** The camera is geographic. Elevation is symbolic, never a site altitude.
 * One custom layer projects accessible HTML billboards and SVG edges on the
 * same camera frame. No permanent animation or React updates per frame. */
export function AnnuaireMap3DCanvas(props: Props) {
  const { entities, relations, mapScope, selectedId, onSelect, fr } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  const markers = useRef(new Map<string, HTMLDivElement>());
  const paths = useRef(new Map<string, SVGLineElement>());
  const [ready, setReady] = useState(false);
  const visible = entities.filter(e => e.coords && (mapScope === "paris" ? e.locationGroup === "in_paris" : isInFranceMetropolitaine(e.coords.lat, e.coords.lng)));
  const ids = new Set(visible.map(e => e.id));
  const links = relations.filter(r => r.hasPlottableLine && ids.has(r.fromEntity.id) && ids.has(r.toEntity.id));

  useEffect(() => { latest.current = props; mapRef.current?.triggerRepaint(); }, [props]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let map: LibreMap;
    let loaded = false;
    let failed = false;
    const fail = () => { if (!failed) { failed = true; latest.current.onUnavailable(); } };
    try {
      setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
      const tiles = ["a", "b", "c", "d"].map(s => CARTO_BASEMAPS.light.url.replace("{s}", s).replace("{r}", ""));
      map = new LibreMap({
        container: host, center: [2.3522, 48.8566], zoom: 11, pitch: 48,
        bearing: -20, maxPitch: 60, renderWorldCopies: false,
        style: { version: 8, sources: { basemap: { type: "raster", tiles, tileSize: 256, attribution: CARTO_BASEMAPS.light.attribution } }, layers: [{ id: "basemap", type: "raster", source: "basemap" }] },
      });
    } catch { fail(); return; }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    const canvas = map.getCanvas();
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    canvas.addEventListener("webglcontextlost", contextLost);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => map.resize());
    observer?.observe(host);
    const onError = () => { if (!loaded) fail(); };
    map.on("error", onError);
    map.on("load", () => {
      loaded = true;
      const overlay: CustomLayerInterface = {
        id: "cmm-geographic-network-projection",
        type: "custom", renderingMode: "3d",
        render(_gl, options) {
          const matrix = options.defaultProjectionData.mainMatrix;
          const width = host.clientWidth, height = host.clientHeight;
          const points = new Map<string, ScreenPoint>();
          const elevation = Math.max(20, Math.min(60000, 45 * 2 ** (14 - map.getZoom())));
          for (const entity of latest.current.entities) {
            const element = markers.current.get(entity.id);
            if (!element || !entity.coords) continue;
            const ll = { lng: entity.coords.lng, lat: entity.coords.lat };
            const ground = projectNetworkPoint(matrix, MercatorCoordinate.fromLngLat(ll, 0), width, height);
            const top = projectNetworkPoint(matrix, MercatorCoordinate.fromLngLat(ll, elevation), width, height);
            if (!ground || !top || ground.x < -120 || ground.x > width+120 || ground.y < -160 || ground.y > height+160) {
              element.style.visibility = "hidden"; continue;
            }
            const dy = Math.min(top.y, ground.y - 28);
            const badge = element.querySelector<HTMLElement>("[data-network-logo]");
            const stem = element.querySelector<SVGLineElement>("[data-network-stem]");
            const pin = element.querySelector<HTMLElement>("[data-network-pin]");
            element.dataset.projected = "true";
            element.style.visibility = "visible";
            if (badge) badge.style.transform = "translate("+top.x+"px,"+dy+"px) translate(-50%,-50%)";
            if (pin) pin.style.transform = "translate("+ground.x+"px,"+ground.y+"px) translate(-50%,-100%)";
            if (stem) {
              stem.setAttribute("x1", String(ground.x)); stem.setAttribute("y1", String(ground.y));
              stem.setAttribute("x2", String(top.x)); stem.setAttribute("y2", String(dy));
            }
            points.set(entity.id, { x: top.x, y: dy });
          }
          for (const item of latest.current.relations) {
            const line = paths.current.get(item.relation.id);
            if (!line) continue;
            const a = points.get(item.fromEntity.id), b = points.get(item.toEntity.id);
            line.dataset.projected = "true";
            line.style.visibility = a && b ? "visible" : "hidden";
            if (a && b) {
              line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y));
              line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
            }
          }
        },
      };
      try { map.addLayer(overlay); setReady(true); map.triggerRepaint(); }
      catch { fail(); }
    });
    return () => {
      observer?.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      map.off("error", onError);
      map.remove(); mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      mapRef.current?.fitBounds(boundsFor(mapScope), { padding: 40, duration: 0 });
      mapRef.current?.triggerRepaint();
    }
  }, [ready, mapScope]);
  useEffect(() => {
    if (!ready || !selectedId) return;
    const entity = entities.find(e => e.id === selectedId || e.networkActorId === selectedId);
    if (!entity?.coords || (mapScope === "paris" && entity.locationGroup !== "in_paris")) return;
    mapRef.current?.jumpTo({ center: [entity.coords.lng, entity.coords.lat] });
  }, [ready, entities, selectedId, mapScope]);

  const tilt = (delta: number) => {
    const map = mapRef.current;
    if (map) map.jumpTo({ pitch: Math.max(0, Math.min(60, map.getPitch()+delta)) });
  };
  const rotate = (delta: number) => {
    const map = mapRef.current;
    if (map) map.jumpTo({ bearing: map.getBearing()+delta });
  };
  return <div className="relative h-[68vh] min-h-[460px] overflow-hidden rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)]">
    <div ref={hostRef} className="h-full w-full" aria-label={fr ? "Carte géographique en perspective 3D" : "3D perspective geographic map"}/>
    {!ready ? <div role="status" className="pointer-events-none absolute left-3 top-3 rounded bg-white px-3 py-2 text-sm text-slate-900">{fr ? "Chargement de la carte 3D…" : "Loading 3D map…"}</div> : null}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
        {links.map(item => { const v = getNetworkRelationVisual(item.relation); return <line key={item.relation.id} ref={el => { if (el) { paths.current.set(item.relation.id, el); if (el.dataset.projected !== "true") el.style.visibility = "hidden"; } else paths.current.delete(item.relation.id); }} stroke={v.color} strokeWidth={v.weight} strokeDasharray={v.dash} opacity={0.75}/>; })}
      </svg>
      {visible.map(entity => {
        const diameter = getNetworkLogoDiameter(entity.indicators.documentedNeighborsCount);
        const initials = entity.name.split(/\s+/).map(word => word[0]).join("").slice(0, 2).toUpperCase();
        const selected = entity.id === selectedId || entity.networkActorId === selectedId;
        return <div key={entity.id} ref={el => { if (el) { markers.current.set(entity.id, el); if (el.dataset.projected !== "true") el.style.visibility = "hidden"; } else markers.current.delete(entity.id); }} className="absolute inset-0">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full"><line data-network-stem stroke="#475569" strokeWidth={1.5}/></svg>
          <span data-network-pin className="absolute left-0 top-0 text-rose-700" aria-hidden="true"><svg width="18" height="24" viewBox="0 0 18 24"><path d="M9 24C7 20 0 13 0 9a9 9 0 1 1 18 0c0 4-7 11-9 15Z" fill="currentColor"/><circle cx="9" cy="9" r="3" fill="white"/></svg></span>
          <button data-network-logo type="button" aria-pressed={selected} aria-label={entity.name + " · " + entity.indicators.documentedNeighborsCount + (fr ? " voisins documentés" : " documented neighbours")} title={entity.publicAddressLabel ?? entity.name} onClick={() => onSelect(entity.id)} className={"pointer-events-auto absolute left-0 top-0 flex items-center justify-center rounded-full border-2 bg-white text-slate-900 shadow-md focus-visible:ring-2 focus-visible:ring-rose-500 " + (selected ? "z-20 border-rose-600" : "border-violet-400")} style={{ width: diameter, height: diameter }}>
            {entity.logo ? <Image src={entity.logo.localPath} alt="" width={Math.ceil(diameter)} height={Math.ceil(diameter)} className="h-full w-full rounded-full object-contain"/> : <span className="font-bold text-xs" title={fr ? "Logo non renseigné" : "Logo not available"}>{initials}</span>}
            <span className="absolute top-full mt-0.5 whitespace-nowrap rounded bg-white/95 px-1 text-xs font-bold shadow-sm">{entity.shortName}</span>
          </button>
        </div>;
      })}
    </div>
    <div className="absolute bottom-9 left-3 z-30 flex flex-wrap gap-2">
      <CmmButton type="button" size="sm" tone="secondary" onClick={() => tilt(-15)}>{fr ? "Incliner −" : "Tilt −"}</CmmButton>
      <CmmButton type="button" size="sm" tone="secondary" onClick={() => tilt(15)}>{fr ? "Incliner +" : "Tilt +"}</CmmButton>
      <CmmButton type="button" size="sm" tone="secondary" onClick={() => rotate(-30)}>{fr ? "Tourner ←" : "Rotate ←"}</CmmButton>
      <CmmButton type="button" size="sm" tone="secondary" onClick={() => rotate(30)}>{fr ? "Tourner →" : "Rotate →"}</CmmButton>
      <CmmButton type="button" size="sm" tone="secondary" onClick={() => mapRef.current?.fitBounds(boundsFor(mapScope), { padding: 40, duration: 0, pitch: 48, bearing: 0 })}>{fr ? "Cadrer" : "Fit"}</CmmButton>
    </div>
  </div>;
}
