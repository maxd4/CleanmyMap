"use client";

import dynamic from "next/dynamic";
import { MapPinOff, Pencil, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { formatGeometryPointCount, type ActionLocationViewModel } from "./action-location.model";
import type { ActionLocationGeometryPanelProps } from "./action-location.types";

const ActionDrawingMap = dynamic(
  () => import("@/components/actions/action-drawing-map").then((mod) => mod.ActionDrawingMap),
  { ssr: false },
);

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className="mb-3 flex items-center gap-2"><span className={cn("h-1 w-5 rounded-full", color)} /><h3 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-900/60">{children}</h3></div>;
}

type GpxImportProps = Pick<ActionLocationGeometryPanelProps, "form" | "gpxImport" | "gpxError" | "onImportGpx" | "onRemoveGpx">;

export function ActionLocationGpxImport({ form, gpxImport, gpxError, onImportGpx, onRemoveGpx }: GpxImportProps) {
  if (form.recordType === "clean_place") return null;
  return (
    <div className="rounded-xl border border-violet-200/80 bg-violet-50/55 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-violet-950"><Upload size={16} aria-hidden="true" />Importer un tracé GPX</p><p className="mt-1 text-xs text-violet-900/70">Le tracé importé est conservé tel quel, sans reconstruction réseau.</p></div>
        <label htmlFor="gpx-import" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900 transition hover:bg-violet-100 focus-within:ring-2 focus-within:ring-violet-500/20">
          <Upload size={14} aria-hidden="true" />{gpxImport ? "Remplacer le GPX" : "Choisir un fichier .gpx"}
          <input id="gpx-import" type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; event.currentTarget.value = ""; void onImportGpx(file); }} />
        </label>
      </div>
      {gpxImport ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-950"><span><strong>Tracé GPX importé</strong>{gpxImport.fileName ? ` · ${gpxImport.fileName}` : ""}{` · ${gpxImport.observedDistanceKm.toFixed(2).replace(".", ",")} km · ${gpxImport.pointCount} points`}</span><button type="button" onClick={onRemoveGpx} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"><Trash2 size={13} aria-hidden="true" />Supprimer le GPX</button></div> : null}
      {gpxError ? <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{gpxError}</p> : null}
    </div>
  );
}

type MapPanelProps = Pick<ActionLocationGeometryPanelProps, "form" | "setManualDrawing" | "onResetManualDrawing" | "gpxImport"> & { viewModel: ActionLocationViewModel };

export function ActionLocationMapPanel({ form, setManualDrawing, onResetManualDrawing, gpxImport, viewModel }: MapPanelProps) {
  const isCleanPlaceMode = form.recordType === "clean_place";
  const { ref: mapShellRef, isInView: isMapVisible } = useInViewOnce<HTMLDivElement>({ rootMargin: "260px 0px" });
  const statusStyles = {
    success: "border-emerald-200/70 bg-[#ECF8EF] text-emerald-700",
    warning: "border-amber-200 bg-[#FFF8E8] text-amber-700",
    error: "border-rose-200 bg-[#FFF7F8] text-rose-700",
    neutral: "border-emerald-200/70 bg-[#F3FBF6] text-emerald-800/70",
  } as const;
  return (
    <div className="hidden space-y-3 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] md:block">
      <div className="flex items-center justify-between gap-3"><SectionTitle color="bg-slate-700">{isCleanPlaceMode ? "Point géographique" : "Aperçu de localisation"}</SectionTitle><p className="cmm-text-small text-emerald-900/45">{isCleanPlaceMode ? "Situez le lieu sur la carte" : "Situez le lieu sur la carte ou renseignez une adresse"}</p></div>
      <div ref={mapShellRef} className="relative h-[420px] overflow-hidden rounded-xl border border-emerald-200/70 bg-[#EFFAF3]">
        {isMapVisible ? <>
          <ActionDrawingMap drawing={viewModel.displayedDrawing} onDrawingChange={setManualDrawing} readOnly={Boolean(gpxImport) || (viewModel.activeGeometry?.source != null && viewModel.activeGeometry.source !== "manual")} />
          {!viewModel.hasDrawing ? <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F3FBF6]/72 backdrop-blur-[2px]"><div className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-5 py-4 text-center shadow-sm"><Pencil size={20} className="mx-auto mb-2 text-emerald-700/45" /><p className="text-sm font-semibold text-emerald-950">Aucun repère</p><p className="mt-1 text-xs text-emerald-900/45">Saisissez une adresse ou utilisez le GPS pour placer le lieu</p></div></div> : null}
          {viewModel.isGpx && viewModel.hasDrawing ? <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-lg border border-violet-200 bg-white/95 px-3 py-2 text-xs font-semibold text-violet-900 shadow-sm">Tracé GPX importé · aucune reconstruction réseau</div> : null}
        </> : <div className="flex h-full items-center justify-center bg-[#F3FBF6]"><div className="space-y-3 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" /><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-emerald-900/45">Chargement de la carte...</p></div></div>}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-[#ECF8EF] px-4 py-3"><div className="flex flex-wrap items-center gap-2"><span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 cmm-text-caption font-semibold", statusStyles[viewModel.statusTone])}>{viewModel.isGpx ? "Tracé GPX importé" : viewModel.isManual ? "Repère manuel" : viewModel.hasDrawing ? "Aperçu automatique" : "Aucun repère"}</span>{viewModel.hasDrawing ? <span className="text-xs text-emerald-900/55">{formatGeometryPointCount(viewModel.activeSummary.pointCount)}</span> : null}</div>{viewModel.isManual && !viewModel.isGpx && onResetManualDrawing ? <button type="button" onClick={onResetManualDrawing} aria-label="Effacer le repère manuel" className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-[#FFF7F8] px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-[#FFEFF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"><X size={13} />Effacer</button> : null}{!viewModel.hasDrawing ? <span className="text-xs text-emerald-900/45">Saisissez un lieu, utilisez le GPS ou placez un repère sur la carte</span> : null}</div>
    </div>
  );
}

type AdjustmentProps = Pick<ActionLocationGeometryPanelProps, "form" | "updateField">;

export function ActionLocationAdjustmentNotes({ form, updateField }: AdjustmentProps) {
  return <>
    <div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] md:hidden"><div className="flex items-center gap-2"><MapPinOff size={15} className="text-emerald-700/45" /><SectionTitle color="bg-emerald-500">Précisions de localisation</SectionTitle></div><p className="-mt-2 text-xs text-emerald-900/45">Décrivez les rues ou zones concernées. Un admin pourra compléter la localisation depuis ces informations.</p><textarea rows={5} placeholder="Ex : Départ rue de Rivoli, passage par les quais, retour par le boulevard Saint-Germain…" className="w-full resize-none rounded-xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950 outline-none transition placeholder:text-emerald-700/35 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15" value={form.routeAdjustmentMessage} onChange={(event) => updateField("routeAdjustmentMessage", event.target.value)} /></div>
    <div className="hidden space-y-3 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)] md:block"><SectionTitle color="bg-emerald-500">Précisions de localisation</SectionTitle><p className="-mt-2 text-xs text-emerald-900/45">Optionnel — décrivez les rues ou zones si la localisation est imprécise.</p><textarea rows={3} placeholder="Ex : Départ rue de Rivoli, passage par les quais, retour par le boulevard Saint-Germain…" className="w-full resize-none rounded-xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950 outline-none transition placeholder:text-emerald-700/35 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15" value={form.routeAdjustmentMessage} onChange={(event) => updateField("routeAdjustmentMessage", event.target.value)} /></div>
  </>;
}
