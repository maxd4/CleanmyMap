"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import { Download, Share2, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ImpactCard } from "@/components/profil/impact-card";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { useUser } from "@clerk/nextjs";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

type ImpactPageProgression = {
  currentLevel: number;
  dynamicRanking?: {
    rank: number | null;
  };
  impact?: {
    wasteKg?: number;
    totalButts?: number;
    waterSavedLiters?: number;
  };
  badges?: string[];
};

type GamificationMeResponse = {
  status: "ok";
  progression: ImpactPageProgression | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("API Error");
  return response.json();
}

export default function ImpactProfilePage() {
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const classes = getBlockClasses("impact");

  const { data: meData, isLoading } = useSWR<GamificationMeResponse>(
    "gamification-me",
    () => fetchJson<GamificationMeResponse>("/api/gamification/me"),
  );

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(document.getElementById("impact-card")!, { 
        cacheBust: true,
        backgroundColor: "#450a0a" // Dark Red background for export
      });
      const link = document.createElement("a");
      link.download = `CleanMyMap-Impact-${user?.firstName || "Contributeur"}.png`;
      link.href = dataUrl;
      link.click();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ef4444", "#f87171", "#ffffff"]
      });
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      <span className="text-xs font-black uppercase tracking-widest text-red-400/60 animate-pulse">Chargement de votre impact...</span>
    </div>
  );

  const prog = meData?.progression;

  if (!user) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Carte d'impact personnelle"
        description="Connectez-vous pour consulter, télécharger et partager votre carte d'impact."
      lockedPreview={
          <div className="grid gap-8 md:grid-cols-2">
            <div className={cn("rounded-[2rem] border p-6", classes.surface)}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60">
                Aperçu verrouillé
              </p>
              <div className="mt-4 rounded-2xl border border-white/5 bg-red-400/5 p-5">
                <p className="text-sm text-red-100/40 leading-relaxed">
                  La carte d&apos;impact montre tes actions validées, ton niveau et
                  tes badges après connexion.
                </p>
              </div>
            </div>
            <div className={cn("rounded-[2rem] border p-6", classes.surface)}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60">
                Actions disponibles
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Télécharger le certificat",
                  "Copier le lien du profil",
                  "Consulter la méthodologie"
                ].map((act) => (
                  <div key={act} className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs font-bold text-red-100/30">
                    {act}
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  return (
    <div className="w-full space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <Link 
          href="/dashboard" 
          className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-400/40 hover:text-red-400 transition-all"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> 
          Retour au cockpit
        </Link>
        <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-red-400/20 bg-red-400/5">
          <ShieldCheck size={14} className="text-red-400" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">Carte d&apos;impact personnelle</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12 items-start xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        {/* Visual Preview */}
        <div className="flex justify-center sticky top-24">
          <ImpactCard 
            userName={user?.fullName || "Contributeur anonyme"}
            level={prog?.currentLevel || 1}
            rank={prog?.dynamicRanking?.rank ?? null}
            totalKg={prog?.impact?.wasteKg || 0}
            totalButts={prog?.impact?.totalButts || 0}
            waterSaved={prog?.impact?.waterSavedLiters || 0}
            topBadges={prog?.badges || []}
          />
        </div>

        {/* Actions & Info */}
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-white leading-[0.9]">
              Votre impact <br/><span className="text-red-500">en temps réel.</span>
            </h2>
            <p className="max-w-xl text-lg text-red-100/40 leading-relaxed">
              Générez une carte haute fidélité qui résume vos actions validées sur le terrain, votre niveau d&apos;expertise et vos distinctions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleDownload}
              disabled={isExporting}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-red-600/20 transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50",
                classes.shadow
              )}
            >
              <Download size={18} /> 
              {isExporting ? "Génération..." : "Exporter la carte"}
            </button>
            <button className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-widest text-red-100/60 transition-all hover:bg-white/10 hover:text-red-100">
              <Share2 size={18} /> 
              Partager le profil
            </button>
          </div>

          <div className={cn(
            "rounded-[2rem] border p-8 space-y-6 relative overflow-hidden",
            classes.surface
          )}>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400/40">Méthodologie</p>
              <p className="text-sm text-red-100/40 leading-relaxed">
                Les données d&apos;impact sont consolidées à partir de vos actions validées. Le volume d&apos;eau préservé repose sur un ratio de 500L par mégot extrait de l&apos;environnement.
              </p>
            </div>
            
            <Link 
              href="/methodologie" 
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
            >
              Consulter le protocole scientifique <span className="text-lg">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
