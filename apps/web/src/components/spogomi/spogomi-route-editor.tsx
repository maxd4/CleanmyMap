"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { parseGpxFile, inferGpxTopology } from "@/lib/actions/geometry/gpx";
import type { ActionDrawing, ActionPhotoAsset } from "@/lib/actions/types";
import { uploadActionMedia } from "@/lib/actions/action-media/action-media-client";
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

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("La lecture de l’image a échoué."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("L’image est illisible."));
    reader.readAsDataURL(file);
  });
}

export function SpogomiRouteEditor({ eventId, actionId, activeDivisionId, divisionLabel, eventState, expectedRevision, route, busy, action }: Props) {
  const [drawing, setDrawing] = useState<PolylineDrawing | null>(() => routeDrawing(route));
  const [correctionReason, setCorrectionReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const distance = useMemo(() => drawing ? Number(polylineDistanceKm(drawing.coordinates).toFixed(3)) : null, [drawing]);
  const requiresReason = eventState === "in_progress";

  const saveDrawing = async () => {
    setLocalError(null);
    if (!drawing) return setLocalError("Dessinez un parcours comportant au moins deux points.");
    if (requiresReason && correctionReason.trim().length < 3) return setLocalError("Un motif est obligatoire pendant l’épreuve.");
    try {
      await action(`/api/spogomi/events/${eventId}/routes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ divisionId: activeDivisionId, expectedRevision, correctionReason: correctionReason.trim() || null, coordinates: drawing.coordinates }),
      }, activeDivisionId);
      setCorrectionReason("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Le parcours n’a pas pu être enregistré.");
    }
  };

  const importGpx = async (file: File) => {
    setLocalError(null);
    try {
      const parsed = await parseGpxFile(file);
      const next = parsed.drawing.kind === "polyline" ? parsed.drawing : null;
      if (!next) throw new Error("Le GPX doit contenir une trace linéaire.");
      if (requiresReason && correctionReason.trim().length < 3) throw new Error("Un motif est obligatoire pendant l’épreuve.");
      const form = new FormData();
      form.set("file", file);
      form.set("expectedRevision", String(expectedRevision));
      if (activeDivisionId) form.set("divisionId", activeDivisionId);
      if (correctionReason.trim()) form.set("correctionReason", correctionReason.trim());
      await action(`/api/spogomi/events/${eventId}/route-gpx`, { method: "POST", body: form }, activeDivisionId);
      setDrawing({ kind: "polyline", coordinates: next.coordinates });
      setCorrectionReason("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Le GPX n’a pas pu être importé.");
    }
  };

  const addReferenceImage = async (file: File) => {
    setLocalError(null);
    setMediaStatus("Téléversement de la référence privée…");
    try {
      if (!route) throw new Error("Enregistrez d’abord un parcours avant d’ajouter son image de référence.");
      const asset: ActionPhotoAsset = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${file.name}`, name: file.name, mimeType: file.type, size: file.size, width: null, height: null, dataUrl: await toDataUrl(file) };
      const upload = await uploadActionMedia(actionId, [asset]);
      if (upload.failed.length) throw new Error(upload.failed[0]?.message ?? "L’image n’a pas pu être téléversée.");
      const mediaResponse = await fetch(`/api/actions/${encodeURIComponent(actionId)}/media`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!mediaResponse.ok) throw new Error("La référence média n’a pas pu être relue.");
      const mediaBody = await mediaResponse.json() as { items?: Array<{ id: string; clientUploadId: string; uploadState: string }> };
      const media = mediaBody.items?.find((item) => item.clientUploadId === asset.id && item.uploadState === "ready");
      if (!media) throw new Error("La référence média finalisée est introuvable.");
      await action(`/api/spogomi/events/${eventId}/routes/reference-media`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ divisionId: activeDivisionId, expectedRevision, mediaId: media.id, correctionReason: correctionReason.trim() || null }),
      }, activeDivisionId);
      setMediaStatus("Image de référence privée enregistrée.");
    } catch (error) {
      setMediaStatus(null);
      setLocalError(error instanceof Error ? error.message : "L’image n’a pas pu être associée.");
    }
  };

  const currentDrawing = drawing ?? routeDrawing(route);
  return <CmmCard tone="amber" variant="glass" className="space-y-4 p-5">
    <div><h2 className="cmm-text-h3">Parcours prévu · {divisionLabel}</h2><p className="cmm-text-small">Ce parcours est une référence préparatoire, indépendante de toute trace réellement parcourue et de tout calcul environnemental.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Source</p><p className="font-bold">{route?.source === "manual_reference" ? "Dessiné sur la carte" : route?.source === "official_reference" ? "Référence historique" : route ? "GPX importé" : "À définir"}</p></div><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Distance</p><p className="font-bold">{distance ?? route?.reference_distance_km ?? "—"} km</p></div><div className="rounded-xl border border-black/10 bg-white/75 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Version</p><p className="font-bold">{route ? `v${route.route_version}` : "Première version"}</p></div></div>
    <ActionDrawingMap value={currentDrawing} onChange={(next) => { if (next?.kind === "polyline") setDrawing({ kind: "polyline", coordinates: next.coordinates }); else setDrawing(null); }} />
    <div className="grid gap-3 md:grid-cols-2"><label className="block text-sm font-bold">Importer un GPX<input className="mt-1 block w-full rounded-lg border border-black/10 bg-white p-2" type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importGpx(file); }} /></label><label className="block text-sm font-bold">Ajouter une image de référence privée<input className="mt-1 block w-full rounded-lg border border-black/10 bg-white p-2" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !route} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addReferenceImage(file); }} /></label></div>
    {route?.reference_media_id ? <p className="text-sm font-bold text-slate-700">Une image de référence privée est associée. Elle ne sert ni à générer la géométrie ni à calculer la distance.</p> : null}
    <label className="block text-sm font-bold">Motif de modification{requiresReason ? " (obligatoire pendant l’épreuve)" : " (facultatif hors épreuve)"}<textarea className="mt-1 min-h-20 w-full rounded-lg border border-black/10 bg-white p-2" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Expliquez la correction ou la provenance de la nouvelle référence." /></label>
    <div className="flex flex-wrap items-center gap-3"><CmmButton type="button" tone="primary" disabled={busy || !drawing} onClick={() => void saveDrawing()}>Enregistrer le parcours</CmmButton>{mediaStatus ? <p role="status" className="text-sm font-bold text-emerald-800">{mediaStatus}</p> : null}{localError ? <p role="alert" className="text-sm font-bold text-red-800">{localError}</p> : null}</div>
    {route?.last_change_reason ? <p className="text-sm text-slate-700">Dernier motif : {route.last_change_reason}</p> : null}
    <p className="text-xs text-slate-600">Topologie estimée pour la version dessinée : {drawing ? inferGpxTopology(drawing.coordinates) : route?.inferred_topology ?? "—"}.</p>
  </CmmCard>;
}
