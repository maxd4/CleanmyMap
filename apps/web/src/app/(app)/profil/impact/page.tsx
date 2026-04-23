"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";
import { Download, Share2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImpactCard } from "@/components/profil/impact-card";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { useUser } from "@clerk/nextjs";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("API Error");
  return response.json();
}

export default function ImpactProfilePage() {
  const { user } = useUser();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: meData, isLoading } = useSWR("gamification-me", () => 
    fetchJson<any>("/api/gamification/me")
  );

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(document.getElementById("impact-card")!, { 
        cacheBust: true,
        backgroundColor: "#064e3b" // Emerald-900 background for export
      });
      const link = document.createElement("a");
      link.download = `CMM-Impact-${user?.firstName || "Contributeur"}.png`;
      link.href = dataUrl;
      link.click();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#ffffff"]
      });
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">Chargement de ton impact...</div>;

  const prog = meData?.progression;

  if (!user) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Ma carte d'impact"
        description="La carte personnelle, le téléchargement et le partage sont réservés aux comptes Clerk connectés."
        lockedPreview={
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Aperçu
              </p>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">
                  La carte d'impact montre tes actions validées, ton niveau et
                  tes badges après connexion.
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Actions
              </p>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Télécharger le certificat
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Copier le lien de profil
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Consulter la méthodologie
                </div>
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft size={16} /> Retour Dashboard
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tighter">Ma Carte d'Impact</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Visual Preview */}
        <div className="flex justify-center">
          <ImpactCard 
            userName={user?.fullName || "Contributeur anonyme"}
            level={prog?.currentLevel || 1}
            rank={prog?.dynamicRanking?.rank}
            totalKg={prog?.impact?.wasteKg || 0}
            totalButts={prog?.impact?.totalButts || 0}
            waterSaved={prog?.impact?.waterSavedLiters || 0}
            topBadges={prog?.badges || []}
          />
        </div>

        {/* Actions & Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Valorisez votre engagement terrain.</h2>
            <p className="text-slate-600">Générez une carte de visite interactive résumant vos efforts écologiques. Partagez-la sur LinkedIn ou Instagram pour inspirer votre communauté.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download size={18} /> {isExporting ? "Génération en cours..." : "Télécharger mon certificat PNG"}
            </button>
            <button className="flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <Share2 size={18} /> Copier le lien de profil
            </button>
          </div>

          <div className="rounded-2xl bg-slate-100 p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Détail méthodologie</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Les données d'impact sont consolidées à partir de vos actions validées. Le volume d'eau préservé est calculé sur la base de 500L/mégot extrait.
            </p>
            <Link href="/methodologie" className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline">
              Consulter le protocole scientifique →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
