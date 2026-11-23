"use client";

import dynamic from "next/dynamic";
import { Info, MapPinned } from "lucide-react";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { FormState } from "../model";
import { hasValidCoordinatePair } from "./planned-action-location-section";

const TerrainMapCanvas = dynamic(
  () => import("./terrain-map-canvas").then((module) => module.TerrainMapCanvas),
  { ssr: false },
);

export function TerrainMapPanel({ form, onEditDefinition }: { form: FormState; onEditDefinition?: () => void }) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: "260px 0px" });
  const hasCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);
  const plannedRoutes = form.plannedRouteGpx?.files?.flatMap((file) => file.segments.map((segment) => segment.coordinates)) ?? [];
  const plannedRoutePoints = plannedRoutes.flat();
  const hasMapLocation = hasCoordinates || plannedRoutePoints.length > 0;
  const coordinate: [number, number] = hasCoordinates ? [Number(form.latitude), Number(form.longitude)] : plannedRoutePoints[0] ?? [0, 0];

  return (
    <CmmCard tone="emerald" variant="outlined" size="lg" className="space-y-3" data-testid="terrain-map-panel">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MapPinned size={18} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-emerald-950">Carte du secteur</h3>
          <p className="cmm-text-body mt-1 text-sm leading-6">Lieu principal : {form.departureLocationLabel.trim() || form.locationLabel.trim() || form.communeZoneLabel.trim() || "À préciser à l’étape Définir"}</p>
        </div>
        {onEditDefinition ? <CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={onEditDefinition}>Modifier</CmmButton> : null}
      </div>
      <div ref={ref} className="relative h-52 overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/70 sm:h-60" aria-label="Carte du secteur d’intervention">
        {hasMapLocation && isInView ? <TerrainMapCanvas coordinate={coordinate} label={hasCoordinates ? "Point de rendez-vous confirmé" : "Parcours GPX prévu"} plannedRoutes={plannedRoutes} /> : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-2 text-emerald-950">
              <Info size={24} className="mx-auto text-amber-600" aria-hidden="true" />
              <p className="font-bold">Carte en attente de coordonnées fiables</p>
              <p className="cmm-text-body text-sm leading-6">Sélectionnez une suggestion pour géocoder le rendez-vous.</p>
              {onEditDefinition ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onEditDefinition}>Géocoder l’adresse dans Définir</CmmButton> : null}
            </div>
          </div>
        )}
      </div>
      <p role="status" className="text-xs font-semibold text-emerald-900/65">
        {hasCoordinates ? plannedRoutePoints.length ? "Coordonnées confirmées · parcours GPX prévu affiché." : "Coordonnées confirmées." : plannedRoutePoints.length ? "Parcours GPX prévu · aucune géométrie observée." : "Adresse libre · aucune coordonnée."}
      </p>
    </CmmCard>
  );
}
