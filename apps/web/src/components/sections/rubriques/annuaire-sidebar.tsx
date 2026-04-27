import React from "react";
import dynamic from "next/dynamic";
import { CmmCard } from "@/components/ui/cmm-card";
import { ShieldCheck } from "lucide-react";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((mod) => mod.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-xl bg-slate-100 cmm-text-muted flex items-center justify-center">
        Loading map...
      </div>
    ),
  },
);

interface AnnuaireSidebarProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  highlightedActorId: string | null;
}

export function AnnuaireSidebar({
  fr,
  entries,
  highlightedActorId,
}: AnnuaireSidebarProps) {
  return (
    <div className="sticky top-24 space-y-4">
      {/* Carte */}
      <CmmCard 
        id="annuaire-map-anchor"
        tone="violet" 
        variant="elevated" 
        className="overflow-hidden p-0 h-[500px] group border-2 border-violet-100 shadow-xl"
      >
        <AnnuaireMapCanvas
          items={entries}
          highlightedItemId={highlightedActorId}
        />
        <div className="absolute top-4 left-4 right-4 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-violet-200 shadow-lg cmm-text-caption font-semibold text-violet-700">
            {fr ? "Explorez le réseau" : "Explore the network"}
          </div>
        </div>
      </CmmCard>

      {/* Info Complémentaire */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 cmm-text-caption cmm-text-muted italic">
        {fr 
          ? "Les données affichées sont mises à jour régulièrement par nos services et nos partenaires." 
          : "The data displayed is regularly updated by our services and partners."}
      </div>

      {/* Méthodologie Card */}
      <CmmCard tone="slate" variant="subtle" className="p-4 space-y-3">
        <h4 className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-primary flex items-center gap-2">
          <ShieldCheck size={14} className="text-violet-600" />
          {fr ? "Méthodologie & Transparence" : "Methodology & Transparency"}
        </h4>
        <div className="space-y-2 cmm-text-caption cmm-text-secondary leading-relaxed">
          <p>
            {fr 
              ? "Le classement et la confiance sont calculés algorithmiquement selon :" 
              : "Ranking and trust are algorithmically calculated based on:"}
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="font-semibold">{fr ? "Proximité :" : "Proximity:"}</span>{" "}
              {fr ? "+18pts pour le même arrondissement." : "+18pts for the same arrondissement."}
            </li>
            <li>
              <span className="font-semibold">{fr ? "Profil :" : "Profile:"}</span>{" "}
              {fr ? "+12-18pts selon l'adéquation de vos besoins." : "+12-18pts based on your needs adequacy."}
            </li>
            <li>
              <span className="font-semibold">{fr ? "Confiance :" : "Trust:"}</span>{" "}
              {fr ? "Basé sur la vérification humaine, la fraîcheur des données (<90j) et la complétude des canaux." : "Based on human verification, data freshness (<90d) and channel completeness."}
            </li>
          </ul>
        </div>
      </CmmCard>
    </div>
  );
}
