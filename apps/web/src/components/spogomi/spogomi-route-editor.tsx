"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { parseGpxFile, inferGpxTopology } from "@/lib/actions/geometry/gpx";
import type { ActionDrawing } from "@/lib/actions/types";
import { uploadActionRouteReference } from "@/lib/actions/action-media/action-route-reference-client";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";
import type { SpogomiRouteProjection } from "@/lib/spogomi/route-types";

const ActionDrawingMap = dynamic(() => import("@/components/actions/action-drawing-map").then((module) => module.ActionDrawingMap), { ssr: false });

type Props = {
  eventId: string;
  actionId: string;
  activeDivisionId: string | null;
  divisionLabel: string;
  eventState: string;
  expectedRevision: number;
  route: SpogomiRouteProjection | null;
  busy: boolean;
  action: (url: string, init?: RequestInit, expectedDivisionId?: string | null) => Promise<Record<string, unknown> | null>;
};

type PolylineDrawing = ActionDrawing & { kind: "polyline" };

function routeDrawing(route: SpogomiRouteProjection | null): PolylineDrawing | null {
  return route ? {
    kind: "polyline",
    coordinates: route.geometry_geojson.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
  } : null;
}

function routeSnapshotKey(route: SpogomiRouteProjection | null): string {
  if (!route) return "none";
  return `${route.id}:${route.route_version}:${route.division_id ?? "shared"}:${route.reference_media_id ?? "no-media"}:${JSON.stringify(route.geometry_geojson.coordinates)}`;
}

export function SpogomiRouteEditor({ eventId, actionId, activeDivisionId, divisionLabel, eventState, expectedRevision, route, busy, action }: Props) {
  const currentRouteKey = routeSnapshotKey(route);
  const [trackedDivisionId, setTrackedDivisionId] = useState(activeDivisionId);
  const [syncedRouteKey, setSyncedRouteKey] = useState(currentRouteKey);
  const [syncedRevision, setSyncedRevision] = useState(expectedRevision);
  const [baseRevision, setBaseRevision] = useState(expectedRevision);
  const [drawing, setDrawing] = useState<PolylineDrawing | null>(() => routeDrawing(route));
  const [isDirty, setIsDirty] = useState(false);
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);

  if (trackedDivisionId !== activeDivisionId) {
    setTrackedDivisionId(activeDivisionId);
    setSyncedRouteKey(currentRouteKey);
    setSyncedRevision(expectedRevision);
    setBaseRevision(expectedRevision);
    setDrawing(routeDrawing(route));
    setIsDirty(false);
    setHasRemoteUpdate(false);
    setCorrectionReason("");
    setLocalError(null);
    setMediaStatus(null);
  } else if (syncedRouteKey !== currentRouteKey || syncedRevision !== expectedRevision) {
    if (!isDirty) {
      setSyncedRouteKey(currentRouteKey);
      setSyncedRevision(expectedRevision);
      setBaseRevision(expectedRevision);
      setDrawing(routeDrawing(route));
      setHasRemoteUpdate(false);
    } else {
      setSyncedRouteKey(currentRouteKey);
      setSyncedRevision(expectedRevision);
      setHasRemoteUpdate(true);
    }
  }

  const distance = useMemo(() => drawing ? Number(polylineDistanceKm(drawing.coordinates).toFixed(3)) : null, [drawing]);
  const requiresReason = eventState === "in_progress";

  const loadServerVersion = () => {
    setSyncedRouteKey(currentRouteKey);
    setSyncedRevision(expectedRevision);
    setBaseRevision(expectedRevision);
    setDrawing(routeDrawing(route));
    setIsDirty(false);
    setHasRemoteUpdate(false);
    setLocalError(null);
  };

  const saveDrawing = async () => {
    setLocalError(null);
    if (hasRemoteUpdate) return setLocalError("Le parcours a été mis à jour sur le serveur. Chargez la version serveur avant d’enregistrer.");
    if (!drawing) return setLocalError("Dessinez un parcours comportant au moins deux points.");
    if (requiresReason && correctionReason.trim().length < 3) return setLocalError("Un motif est obligatoire pendant l’épreuve.");
    try {
      const result = await action(`/api/spogomi/events/${eventId}/routes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ divisionId: activeDivisionId, expectedRevision: baseRevision, correctionReason: correctionReason.trim() || null, coordinates: drawing.coordinates }),
      }, activeDivisionId);
      if (!result) {
        setLocalError("Le parcours n’a pas pu être enregistré.");
        return;
      }
      setIsDirty(false);
      setHasRemoteUpdate(false);
      setCorrectionReason("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Le parcours n’a pas pu être enregistré.");
    }
  };

  const importGpx = async (file: File) => {
    setLocalError(null);
    try {
      if (hasRemoteUpdate) throw new Error("Le parcours a été mis à jour sur le serveur. Chargez la version serveur avant d’importer un GPX.");
      const parsed = await parseGpxFile(file);
      const next = parsed.drawing.kind === "polyline" ? parsed.drawing : null;
      if (!next) throw new Error("Le GPX doit contenir une trace linéaire.");
      if (requiresReason && correctionReason.trim().length < 3) throw new Error("Un motif est obligatoire pendant l’épreuve.");
      const form = new FormData();
      form.set("file", file);
      form.set("expectedRevision", String(baseRevision));
      if (activeDivisionId) form.set("divisionId", activeDivisionId);
      if (correctionReason.trim()) form.set("correctionReason", correctionReason.trim());
      const result = await action(`/api/spogomi/events/${eventId}/route-gpx`, { method: "POST", body: form }, activeDivisionId);
      if (!result) {
        setLocalError("Le GPX n’a pas pu être importé.");
        return;
      }
      setDrawing({ kind: "polyline", coordinates: next.coordinates });
      setIsDirty(false);
      setHasRemoteUpdate(false);
      setCorrectionReason("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Le GPX n’a pas pu être importé.");
    }
  };

  const addReferenceImage = async (file: File) => {
    setLocalError(null);
    setMediaStatus("Téléversement de la référence privée…");
    try {
      if (hasRemoteUpdate) throw new Error("Le parcours a été mis à jour sur le serveur. Chargez la version serveur avant d’associer une image.");
      if (!route) throw new Error("Enregistrez d’abord un parcours avant d’ajouter son image de référence.");
      if (requiresReason && correctionReason.trim().length < 3) throw new Error("Un motif est obligatoire pendant l’épreuve.");
      const media = await uploadActionRouteReference(actionId, file);
      const result = await action(`/api/spogomi/events/${eventId}/routes/reference-media`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ divisionId: activeDivisionId, expectedRevision: baseRevision, mediaId: media.id, correctionReason: correctionReason.trim() || null }),
      }, activeDivisionId);
      if (!result) {
        setMediaStatus(null);
        setLocalError("L’image n’a pas pu être associée.");
        return;
      }
      setCorrectionReason("");
      setMediaStatus("Image de référence privée enregistrée.");
    } catch (error) {
      setMediaStatus(null);
      setLocalError(error instanceof Error ? error.message : "L’image n’a pas pu être associée.");
    }
  };

  return <CmmCard tone="amber" variant="glass" className="space-y-4 p-5">
    <div><h2 className="cmm-text-h3">Parcours prévu · {divisionLabel}</h2><p className="cmm-text-small">Ce parcours est une référence préparatoire, indépendante de toute trace réellement parcourue et de tout calcul environnemental.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Source</p><p className="font-bold">{route?.source === "manual_reference" ? "Dessiné sur la carte" : route?.source === "official_reference" ? "Référence historique" : route ? "GPX importé" : "À définir"}</p></div><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Distance</p><p className="font-bold">{distance ?? route?.reference_distance_km ?? "—"} km</p></div><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Version</p><p className="font-bold">{route ? `v${route.route_version}` : "Première version"}</p></div></div>
    {hasRemoteUpdate ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><span>Une nouvelle version serveur du parcours est disponible. Votre dessin local est conservé tant que vous ne chargez pas la version serveur.</span><CmmButton type="button" size="sm" tone="secondary" onClick={loadServerVersion}>Charger la version serveur</CmmButton></div> : null}
    <ActionDrawingMap value={drawing} onChange={(next) => { setIsDirty(true); if (next?.kind === "polyline") setDrawing({ kind: "polyline", coordinates: next.coordinates }); else setDrawing(null); }} />
    <div className="grid gap-3 md:grid-cols-2"><label className="block text-sm font-bold">Importer un GPX<input className="mt-1 block w-full rounded-lg border border-black/10 bg-white p-2" type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importGpx(file); }} /></label><label className="block text-sm font-bold">Ajouter une image de référence privée<input className="mt-1 block w-full rounded-lg border border-black/10 bg-white p-2" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !route} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addReferenceImage(file); }} /></label></div>
    {route?.reference_media_id ? <p className="text-sm font-bold text-slate-700">Une image de référence privée est associée. Elle ne sert ni à générer la géométrie ni à calculer la distance.</p> : null}
    <label className="block text-sm font-bold">Motif de modification{requiresReason ? " (obligatoire pendant l’épreuve)" : " (facultatif hors épreuve)"}<textarea className="mt-1 min-h-20 w-full rounded-lg border border-black/10 bg-white p-2" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Expliquez la correction ou la provenance de la nouvelle référence." /></label>
    <div className="flex flex-wrap items-center gap-3"><CmmButton type="button" tone="primary" disabled={busy || !drawing || hasRemoteUpdate} onClick={() => void saveDrawing()}>Enregistrer le parcours</CmmButton>{mediaStatus ? <p role="status" className="text-sm font-bold text-emerald-800">{mediaStatus}</p> : null}{localError ? <p role="alert" className="text-sm font-bold text-red-800">{localError}</p> : null}</div>
    {route?.last_change_reason ? <p className="text-sm text-slate-700">Dernier motif : {route.last_change_reason}</p> : null}
    <p className="text-xs text-slate-600">Topologie estimée pour la version dessinée : {drawing ? inferGpxTopology(drawing.coordinates) : route?.inferred_topology ?? "—"}.</p>
  </CmmCard>;
}
