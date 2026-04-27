"use client";

import React from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { getParisArrondissementLabel } from "@/lib/geo/paris-arrondissements";

import { AnnuaireFeaturedSection } from "./annuaire-featured-section";
import { AnnuaireThematicExploration } from "./annuaire-thematic-exploration";
import { AnnuaireExplorationView } from "./annuaire-exploration-view";
import { AcademieClimatWorkshopsPanel } from "./academie-climat-workshops-panel";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  const {
    searchTerm, setSearchTerm,
    setActorCardsPage,
    featuredEntries,
  } = useAnnuaireLogic();

  const handleFocusMap = (entryId: string) => {
    // In exploration mode, we can just highlight the item in the canvas
    // Or scroll to the canvas
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectTheme = (themeId: string) => {
    setActorCardsPage(1);
    setSearchTerm(themeId);
  };

  return (
    <div className="space-y-32 py-20 overflow-x-hidden">
      {/* Header Contextuel */}
      <AcademieClimatWorkshopsPanel />

      {/* 1. EDITORIAL HIGHLIGHTS */}
      <section className="container mx-auto px-6">
        <AnnuaireFeaturedSection 
          entries={featuredEntries} 
          onFocusMap={handleFocusMap}
          fr={fr}
        />
      </section>

      {/* 2. THEMATIC EXPLORATION & ENTRY POINTS */}
      <section className="relative py-24 bg-slate-50/50">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
        <div className="container mx-auto px-6 relative">
          <AnnuaireThematicExploration 
            activeTag={searchTerm} 
            onSelectTag={setSearchTerm} 
            fr={fr}
          />
        </div>
      </section>

      {/* 3. INTERACTIVE EXPLORATION CANVAS */}
      <section id="annuaire-exploration" className="container mx-auto px-6 scroll-mt-24">
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 cmm-text-caption font-black tracking-widest uppercase">
              <MapPin size={14} strokeWidth={3} />
              {fr ? "Exploration Interactive" : "Interactive Exploration"}
            </div>
            <h2 className="cmm-text-h2 cmm-text-primary max-w-2xl">
              {fr ? "Découvrez l'écosystème sur le terrain" : "Discover the ecosystem on the ground"}
            </h2>
            <p className="cmm-text-body cmm-text-secondary max-w-xl mx-auto">
              {fr 
                ? "Naviguez sur la carte interactive de Paris pour trouver les partenaires les plus proches de vos enjeux et de votre quartier." 
                : "Navigate Paris's interactive map to find partners closest to your challenges and neighborhood."}
            </p>
          </div>

          <AnnuaireExplorationView />
        </div>
      </section>

      {/* 4. FOOTER CALL TO ACTION */}
      <section className="container mx-auto px-6">
        <div className="relative p-12 rounded-[3rem] bg-slate-900 text-white overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-violet-600/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-4">
              <h3 className="cmm-text-h3">{fr ? "Vous êtes une association ?" : "Are you an association?"}</h3>
              <p className="cmm-text-body text-slate-300 max-w-md">
                {fr 
                  ? "Rejoignez notre réseau et gagnez en visibilité auprès des citoyens et des entreprises engagées." 
                  : "Join our network and gain visibility with engaged citizens and companies."}
              </p>
            </div>
            <CmmButton tone="violet" variant="solid" className="h-16 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-violet-500/20 group">
              <span>{fr ? "Rejoindre le réseau" : "Join the Network"}</span>
              <ArrowRight size={20} className="ml-3 group-hover:translate-x-1.5 transition-transform" />
            </CmmButton>
          </div>
        </div>
      </section>
    </div>
  );
}
