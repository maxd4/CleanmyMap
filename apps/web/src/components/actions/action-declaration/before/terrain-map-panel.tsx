"use client";

import dynamic from "next/dynamic";
import { Info, MapPinned } from "lucide-react";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { CmmCard } from "@/components/ui/cmm-card";
import type { FormState } from "../model";
import { hasValidCoordinatePair } from "./planned-action-location-section";

const TerrainMapCanvas = dynamic(
  () => import("./terrain-map-canvas").then((module) => module.TerrainMapCanvas),
  { ssr: false },
);

export function TerrainMapPanel({ form }: { form: FormState }) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: "260px 0px" });
  const hasCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);
  const coordinate: [number, number] = [Number(form.latitude), Number(form.longitude)];

  return (
    <CmmCard tone="emerald" variant="outlined" size="lg" className="space-y-3" data-testid="terrain-map-panel">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MapPinned size={18} aria-hidden="true" /></span>
        <div>
          <h3 className="text-lg font-black text-emerald-950">Carte du secteur</h3>
          <p className="cmm-text-body mt-1 text-sm leading-6">Le repère confirme le rendez-vous géocodé. Il ne fabrique ni tracé, ni distance, ni zone GPS.</p>
        </div>
      </div>
      <div ref={ref} className="relative h-[360px] overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/70" aria-label="Carte du secteur d’intervention">
        {hasCoordinates && isInView ? <TerrainMapCanvas coordinate={coordinate} label="Point de rendez-vous confirmé" /> : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-2 text-emerald-950">
              <Info size={24} className="mx-auto text-amber-600" aria-hidden="true" />
              <p className="font-bold">Carte en attente de coordonnées fiables</p>
              <p className="cmm-text-body text-sm leading-6">Une adresse libre non géocodée reste conservée comme texte. Sélectionnez une suggestion géocodée pour afficher le rendez-vous.</p>
            </div>
          </div>
        )}
      </div>
      <p role="status" className="text-xs font-semibold text-emerald-900/65">
        {hasCoordinates ? "Provenance : suggestion d’adresse géocodée ou coordonnées confirmées." : "Provenance : adresse libre non géocodée · aucune coordonnée inventée."}
      </p>
    </CmmCard>
  );
}
